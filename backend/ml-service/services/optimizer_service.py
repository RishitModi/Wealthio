"""
services/optimizer_service.py
------------------------------
Mean-variance portfolio optimizer.  Combines every upstream pipeline component
(Steps 1-5) into a single entry point that produces final allocation weights.

Pipeline dependencies consumed here:
    Step 1  risk_service       -> per-category min/max boundaries, FD allocation
    Step 2  data/              -> covariance_matrix.csv (4x4, risky assets)
    Step 3  fd_service         -> FD pre-allocation split, current FD rate
    Step 4  shrinkage_service  -> James-Stein stabilised expected returns
    Step 5  calibrated_gammas  -> reverse-optimised gamma per risk category

Objective function maximised (via scipy minimising the negative):
    utility(w) = w' * mu  -  (gamma / 2) * w' * Sigma * w

Constraints:
    - Equality:  sum(w) == risky_percentage / 100
    - Bounds:    per-asset min/max from Step 1 (converted to decimals)
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pandas as pd
from scipy.optimize import minimize

from services.risk_service import get_risk_boundaries, RISKY_ASSETS
from services.fd_service import compute_investable_split, get_current_fd_rate
from services.shrinkage_service import get_shrunk_returns

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


# ── Data loaders ──────────────────────────────────────────────────────────────

def _load_covariance_matrix() -> np.ndarray:
    """Load the 4x4 covariance matrix in RISKY_ASSETS order."""
    cov_df = pd.read_csv(DATA_DIR / "covariance_matrix.csv", index_col=0)
    return cov_df.loc[RISKY_ASSETS, RISKY_ASSETS].values


def _load_gamma(risk_category: str) -> float:
    """Load the calibrated gamma for this risk category from Step 5's JSON."""
    path = MODELS_DIR / "calibrated_gammas.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return float(data[risk_category]["gamma"])


# ── Fallback allocation ──────────────────────────────────────────────────────

def _midpoint_fallback(risk_category: str) -> np.ndarray:
    """
    Returns boundary-midpoint weights (as decimals) for the four risky assets.
    Used as the fallback if the optimizer fails to converge.
    """
    bounds = get_risk_boundaries(risk_category)
    risky_target = (100.0 - bounds["fd"]) / 100.0

    mids = np.array([
        (bounds[a]["min"] + bounds[a]["max"]) / 2.0 / 100.0
        for a in RISKY_ASSETS
    ])
    # Scale so they sum to the risky target
    mids = mids / np.sum(mids) * risky_target
    return mids


# ── Core optimizer ────────────────────────────────────────────────────────────

"""
Known Behavior: Equity Sleeve Boundary Pinning
----------------------------------------------
First, across all three risk categories, stocks and etf consistently allocate at or near their lower boundary, while mutual_funds and gold occupy the interior or upper boundary. This is consistent, reproducible behavior, not a bug or convergence failure.

Second, this happens because mutual_funds has the highest shrunk expected return (17.22%) among the four risky assets while carrying similar or lower volatility than stocks and etf. Additionally, stocks, mutual_funds, and etf are highly positively correlated with each other (derived from the covariance matrix in Step 2), meaning there is limited diversification benefit in holding stocks or etf over mutual_funds. Gold is the only asset with negative covariance against the other three, making it the primary genuine diversifier, which is why gamma calibration (Step 5) correctly and meaningfully controls the gold-versus-equity balance, while the optimizer has little mathematical incentive to allocate beyond the boundary minimum to stocks or etf specifically.

Third, widening the bounds would not create genuine interior trade-offs, since the underlying preference for mutual_funds over the other two equity assets is driven by the return and correlation structure of the data, not by bound width. Widening bounds would only relocate where the pinning occurs, producing allocations that look more varied without being more genuinely optimized — this would be tuning the bounds to produce a desired aesthetic rather than letting the optimization reflect the actual data.

Fourth, this optimizer's job is to correctly set the overall risk-category allocation using the full mean-variance framework. Genuine variation between two users in the same risk category is intentionally handled downstream in Step 7's personalization layer, which adjusts allocations based on individual profile fields — age, investment horizon, and savings rate — rather than by relying on this optimizer to produce different equity-sleeve splits for the same risk category.
"""

def optimize_portfolio(
    risk_category: str,
    investable_amount: float,
) -> Dict[str, Any]:
    """
    Main entry point.  Produces a complete five-asset allocation (FD + 4 risky)
    for the given risk category and investable amount.

    Parameters
    ----------
    risk_category : str
        One of CONSERVATIVE, MODERATE, AGGRESSIVE.
    investable_amount : float
        Total amount (in rupees) available for investment.

    Returns
    -------
    dict with keys: risk_category, gamma_used, allocations,
    portfolio_metrics, optimization_success.
    """
    # ── 1. Gather inputs from Steps 1-5 ──────────────────────────────────
    bounds = get_risk_boundaries(risk_category)
    fd_split = compute_investable_split(investable_amount, risk_category)
    shrunk_returns = get_shrunk_returns()
    cov_matrix = _load_covariance_matrix()
    gamma = _load_gamma(risk_category)
    fd_rate = get_current_fd_rate()  # decimal, e.g. 0.065

    risky_target = fd_split["risky_percentage"] / 100.0   # e.g. 0.85

    # Expected returns vector (4,)
    mu = np.array([shrunk_returns[a] for a in RISKY_ASSETS])

    # Per-asset bounds as decimals
    asset_bounds = [
        (bounds[a]["min"] / 100.0, bounds[a]["max"] / 100.0)
        for a in RISKY_ASSETS
    ]

    # ── 2. Initial guess: boundary midpoints, scaled to sum to risky_target ──
    x0 = np.array([(lo + hi) / 2.0 for lo, hi in asset_bounds])
    x0 = x0 / np.sum(x0) * risky_target

    # ── 3. Objective: negative utility (scipy minimises) ─────────────────
    def neg_utility(w: np.ndarray) -> float:
        return -(w.T @ mu - (gamma / 2.0) * w.T @ cov_matrix @ w)

    # ── 4. Constraints & bounds ──────────────────────────────────────────
    constraints = {
        "type": "eq",
        "fun": lambda w: np.sum(w) - risky_target,
    }

    # ── 5. Run SLSQP ────────────────────────────────────────────────────
    result = minimize(
        neg_utility,
        x0,
        method="SLSQP",
        bounds=asset_bounds,
        constraints=constraints,
    )

    optimization_success = bool(result.success)

    if optimization_success:
        optimal_weights = result.x  # decimals summing to risky_target
    else:
        optimal_weights = _midpoint_fallback(risk_category)

    # ── 6. Build allocation table ────────────────────────────────────────
    fd_pct = fd_split["fd_percentage"]
    fd_amt = fd_split["fd_amount"]

    allocations: List[Dict[str, Any]] = [
        {
            "asset_class": "FD",
            "percentage": round(fd_pct, 2),
            "amount": round(fd_amt, 2),
        }
    ]

    for i, asset in enumerate(RISKY_ASSETS):
        pct = optimal_weights[i] * 100.0
        amt = optimal_weights[i] * investable_amount
        allocations.append({
            "asset_class": asset.upper(),
            "percentage": round(pct, 2),
            "amount": round(amt, 2),
        })

    # ── 7. Portfolio metrics (full 5-asset portfolio including FD) ───────
    #
    # Expected return: weighted sum across all five assets.
    # FD contributes fd_weight * fd_rate; risky assets contribute w_i * mu_i.
    fd_weight = fd_pct / 100.0
    portfolio_return = fd_weight * fd_rate + optimal_weights @ mu

    # Volatility: FD has zero variance & zero covariance with everything.
    # So portfolio variance = w_risky' * Sigma * w_risky  (FD row/col is all zeros).
    portfolio_variance = optimal_weights @ cov_matrix @ optimal_weights
    portfolio_volatility = float(np.sqrt(portfolio_variance))

    # Sharpe ratio: (portfolio_return - risk_free_rate) / volatility
    excess_return = portfolio_return - fd_rate
    sharpe_ratio = (
        float(excess_return / portfolio_volatility)
        if portfolio_volatility > 1e-10
        else 0.0
    )

    return {
        "risk_category": risk_category,
        "gamma_used": gamma,
        "allocations": allocations,
        "portfolio_metrics": {
            "expected_annual_return_pct": round(portfolio_return * 100.0, 4),
            "portfolio_volatility_pct": round(portfolio_volatility * 100.0, 4),
            "sharpe_ratio": round(sharpe_ratio, 4),
        },
        "optimization_success": optimization_success,
    }


# ── CLI smoke test ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json as _json

    for cat in ["CONSERVATIVE", "MODERATE", "AGGRESSIVE"]:
        print(f"\n{'='*60}")
        print(f"  {cat}  |  Investable Amount: 500,000")
        print(f"{'='*60}")
        out = optimize_portfolio(cat, 500_000)
        print(_json.dumps(out, indent=4))

        # Sanity: percentages sum to 100, amounts sum to investable
        total_pct = sum(a["percentage"] for a in out["allocations"])
        total_amt = sum(a["amount"] for a in out["allocations"])
        print(f"\n  Sanity: pct_sum={total_pct:.2f}%  amt_sum={total_amt:.2f}")
