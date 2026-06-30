"""
services/gamma_calibration_service.py
---------------------------------------
Calibrates the risk aversion parameter (gamma) for mean-variance optimisation
using reverse optimisation.

Rather than assigning arbitrary gamma values (e.g., 2, 5) which are hard to
defend, we start with a realistic target equity fraction for each risk category
and solve for the gamma that produces an MPT portfolio whose equity exposure
matches that target.

Target equity fractions (% of total portfolio)
-----------------------------------------------
Industry-typical splits for Conservative / Moderate / Aggressive investors
are roughly 25% / 50% / 75% equity.  However, Step 1's per-category boundary
constraints make those exact targets infeasible:

  CONSERVATIVE  FD=40%  Risky=60%  Gold=[20,35]  => Equity achievable: [25.0, 40.0]
  MODERATE      FD=15%  Risky=85%  Gold=[10,25]  => Equity achievable: [60.0, 75.0]
  AGGRESSIVE    FD= 5%  Risky=95%  Gold=[ 5,15]  => Equity achievable: [80.0, 90.0]

Targeting the floor of each range (25 / 60 / 80) would pin gold to its maximum
boundary for every category, causing gamma to saturate — the optimizer would be
trying to match a corner solution where gamma has no meaningful leverage.

Instead, we target the **midpoint** of each achievable range:

  CONSERVATIVE  => midpoint( 25.0, 40.0) = 32.5%
  MODERATE      => midpoint( 60.0, 75.0) = 67.5%
  AGGRESSIVE    => midpoint( 80.0, 90.0) = 85.0%

This keeps the same directional intent (Conservative << Aggressive), but targets
a point in the interior of each feasible set where gamma has room to push the
solution in either direction without immediately saturating against a hard
boundary.  This produces distinct, properly ordered, non-degenerate gamma values.

Calibration method
------------------
For each category, we sweep gamma in [0.1, 20] and run the same bounded
mean-variance optimizer that Step 6 will use (with Step 1's per-asset min/max
constraints).  We measure only the scalar equity fraction
(stocks + mutual_funds + etf) of the resulting portfolio and find the gamma
whose equity fraction is closest to the midpoint target.

Re-calibration policy
---------------------
This calibration depends on the covariance matrix and shrunk returns, which are
static until collect_data.py is rerun.  If data is refreshed, this module's
calibrate_all_gammas() MUST be rerun to keep values consistent.
"""

import json
from pathlib import Path
import numpy as np
import pandas as pd
from scipy.optimize import minimize, minimize_scalar

from services.risk_service import get_risk_boundaries, RISKY_ASSETS
from services.shrinkage_service import get_shrunk_returns

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

# Equity-like assets (everything except gold in the risky sub-portfolio)
_EQUITY_ASSETS = ["stocks", "mutual_funds", "etf"]


def _get_achievable_equity_range(risk_category: str) -> tuple[float, float]:
    """
    Returns (min_equity, max_equity) as % of total portfolio, given Step 1 bounds.

    Min equity = risky_total - gold_max  (gold absorbs maximum defensive share)
    Max equity = risky_total - gold_min  (gold absorbs minimum defensive share)
    """
    bounds = get_risk_boundaries(risk_category)
    risky_total = 100.0 - bounds["fd"]
    min_equity = risky_total - bounds["gold"]["max"]
    max_equity = risky_total - bounds["gold"]["min"]
    return (min_equity, max_equity)


def _get_equity_target(risk_category: str) -> float:
    """
    Returns the midpoint of the achievable equity range for this category.
    See module docstring for full rationale.
    """
    lo, hi = _get_achievable_equity_range(risk_category)
    return (lo + hi) / 2.0


def build_target_weights(risk_category: str) -> dict[str, float]:
    """
    Constructs a target allocation vector for the four risky assets (% of total
    portfolio) using a midpoint-plus-linear-shift method.

    1. Start at the midpoint of each asset's Step 1 boundary range.
    2. Compute the equity shortfall/surplus vs the midpoint equity target.
    3. Distribute the shift across equity assets proportionally to their
       boundary-range width (wider range => absorbs more of the shift).
    4. Set gold to fill the remaining defensive allocation.
    5. Clamp to boundaries as a final safety step only.
    """
    bounds = get_risk_boundaries(risk_category)
    fd = bounds["fd"]
    equity_target = _get_equity_target(risk_category)
    gold_target = 100.0 - fd - equity_target

    # Step 1: midpoint of each asset's boundary range
    midpoint = {a: (bounds[a]["min"] + bounds[a]["max"]) / 2.0 for a in RISKY_ASSETS}
    current_equity = sum(midpoint[a] for a in _EQUITY_ASSETS)

    # Step 2-3: linear shift distributed by range width
    shift_eq = equity_target - current_equity
    widths = {a: bounds[a]["max"] - bounds[a]["min"] for a in _EQUITY_ASSETS}
    total_eq_width = sum(widths.values())

    target = {}
    for a in _EQUITY_ASSETS:
        target[a] = midpoint[a] + shift_eq * (widths[a] / total_eq_width)
    target["gold"] = gold_target

    # Step 5: clamp to boundaries (safety only — should be a no-op for midpoint targets)
    for a in RISKY_ASSETS:
        target[a] = max(bounds[a]["min"], min(bounds[a]["max"], target[a]))

    return target


def find_gamma_for_target(
    target_equity_frac: float,
    shrunk_returns: dict[str, float],
    covariance_df: pd.DataFrame,
    risk_category: str,
) -> float:
    """
    Reverse-optimizes for gamma using a single-scalar equity-fraction metric.

    For each candidate gamma, runs the bounded mean-variance optimizer (with
    Step 1's per-asset min/max constraints) and measures the squared distance
    between the resulting equity fraction and the target.  Returns the gamma
    in [0.1, 20] that minimizes this distance.

    Parameters
    ----------
    target_equity_frac : float
        Target equity fraction as a decimal of the risky sub-portfolio
        (e.g. 0.794 means 79.4% of the risky allocation is equity).
    shrunk_returns : dict
        Shrunk expected returns from shrinkage_service.
    covariance_df : pd.DataFrame
        Covariance matrix from asset_summary.csv.
    risk_category : str
        Used to look up the correct Step 1 bounds for the bounded optimizer.
    """
    bounds = get_risk_boundaries(risk_category)
    risky_total = 100.0 - bounds["fd"]

    mu = np.array([shrunk_returns[a] for a in RISKY_ASSETS])
    cov = covariance_df.loc[RISKY_ASSETS, RISKY_ASSETS].values

    # Scale Step 1 bounds to fractions of the risky sub-portfolio (sum-to-1 space)
    scaled_bnds = [
        (bounds[a]["min"] / risky_total, bounds[a]["max"] / risky_total)
        for a in RISKY_ASSETS
    ]

    # Indices of equity assets within RISKY_ASSETS
    eq_indices = [i for i, a in enumerate(RISKY_ASSETS) if a in _EQUITY_ASSETS]

    def get_optimal_weights(gamma: float) -> np.ndarray:
        def objective(w):
            return -(w.T @ mu - (gamma / 2.0) * w.T @ cov @ w)

        cons = {"type": "eq", "fun": lambda w: np.sum(w) - 1.0}
        x0 = np.array([(b[0] + b[1]) / 2 for b in scaled_bnds])
        x0 = x0 / np.sum(x0)
        res = minimize(objective, x0, bounds=scaled_bnds, constraints=cons)
        return res.x

    def gamma_objective(gamma: float) -> float:
        w_opt = get_optimal_weights(gamma)
        achieved_equity = sum(w_opt[i] for i in eq_indices)
        return (achieved_equity - target_equity_frac) ** 2

    res = minimize_scalar(gamma_objective, bounds=(0.1, 20.0), method="bounded")
    if not res.success:
        raise RuntimeError(f"Gamma calibration failed: {res.message}")

    return float(res.x)


def calibrate_all_gammas() -> dict[str, float]:
    """
    Calibrates gamma for all three risk categories and saves to
    models/calibrated_gammas.json.

    NOTE: This only needs to run once.  If data/collect_data.py is ever rerun
    with fresh market data, this function MUST be rerun to keep gammas
    consistent with the new covariance matrix and shrunk returns.
    """
    shrunk_returns = get_shrunk_returns()
    cov_df = pd.read_csv(DATA_DIR / "covariance_matrix.csv", index_col=0)

    MODELS_DIR.mkdir(exist_ok=True)

    GAMMA_UPPER_BOUND = 20.0

    results = {}
    for cat in ["CONSERVATIVE", "MODERATE", "AGGRESSIVE"]:
        bounds = get_risk_boundaries(cat)
        risky_total = 100.0 - bounds["fd"]

        # Achievable equity range and midpoint target
        eq_lo, eq_hi = _get_achievable_equity_range(cat)
        eq_target_pct = _get_equity_target(cat)

        # Convert to fraction of risky sub-portfolio for the optimizer
        target_eq_frac = eq_target_pct / risky_total

        target_w = build_target_weights(cat)
        gamma = find_gamma_for_target(target_eq_frac, shrunk_returns, cov_df, cat)

        # Detect if gamma saturated against the search ceiling
        saturated = abs(gamma - GAMMA_UPPER_BOUND) < 0.01

        results[cat] = {
            "gamma": round(gamma, 4),
            "equity_target_pct": eq_target_pct,
            "achievable_equity_range": [eq_lo, eq_hi],
            "saturated": saturated,
        }

        print(f"  {cat}:")
        print(f"    Achievable equity range : [{eq_lo:.1f}%, {eq_hi:.1f}%]")
        print(f"    Midpoint equity target  : {eq_target_pct:.1f}%")
        print(f"    Target weights          : {target_w}")
        print(f"    Calibrated gamma        : {gamma:.4f}")
        if saturated:
            print(f"    ** Saturated at search ceiling ({GAMMA_UPPER_BOUND}) — ceiling value, not a converged interior optimum")

    # Verify ordering
    gammas = {cat: results[cat]["gamma"] for cat in results}
    ordering_ok = gammas["CONSERVATIVE"] > gammas["MODERATE"] > gammas["AGGRESSIVE"]
    print(f"\n  Ordering CONSERVATIVE > MODERATE > AGGRESSIVE: {'YES' if ordering_ok else 'VIOLATED'}")

    out_path = MODELS_DIR / "calibrated_gammas.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=4)

    print(f"  Saved to {out_path}")
    return results


if __name__ == "__main__":
    print("=== Gamma Calibration (Reverse Optimisation) ===\n")
    calibrate_all_gammas()
