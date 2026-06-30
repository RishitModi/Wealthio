"""
services/personalization_service.py
-------------------------------------
Post-optimization personalization layer (Step 7).

Step 6's mean-variance optimizer produces a single allocation per risk category.
Two users classified as MODERATE receive identical portfolios from the optimizer
alone.  This service differentiates them using profile fields already collected
during onboarding — age, investment_horizon_years, monthly_income, monthly_savings
— requiring no new user input, no new API fields, and no frontend changes.

Three sequential adjustment rules are applied:
    Rule 1 (Age):          shifts between gold <-> stocks
    Rule 2 (Horizon):      shifts between stocks <-> FD
    Rule 3 (Savings Rate): shifts between mutual_funds <-> FD

All shifts are boundary-capped against Step 1's hard limits.  After all three
rules, a final enforcement pass clamps, redistributes, and renormalizes to
ensure the five allocations sum to exactly 100%.
"""

from __future__ import annotations

from typing import Any, Dict, List
import copy

import numpy as np
import pandas as pd

from services.risk_service import get_risk_boundaries, RISKY_ASSETS
from services.fd_service import get_current_fd_rate
from services.shrinkage_service import get_shrunk_returns

DATA_DIR = __import__("pathlib").Path(__file__).resolve().parent.parent / "data"

# FD has no Step 1 boundary — apply these reasonable hard limits after
# personalization rules that move FD (Rules 2 and 3).
_FD_FLOOR = 0.0
_FD_CEILING = 50.0


# ── Boundary-safe shift helper ───────────────────────────────────────────────

def _shift(
    allocs: Dict[str, float],
    from_asset: str,
    to_asset: str,
    desired_pct: float,
    bounds: Dict[str, Any],
) -> float:
    """
    Attempt to shift `desired_pct` percentage points from `from_asset` to
    `to_asset`, respecting both assets' boundary limits.

    Returns the actual amount shifted (may be less than desired).
    Mutates `allocs` in place.
    """
    # Determine how much `from_asset` can give
    if from_asset == "FD":
        from_min = _FD_FLOOR
    else:
        from_min = bounds[from_asset]["min"]
    max_from = allocs[from_asset] - from_min

    # Determine how much `to_asset` can receive
    if to_asset == "FD":
        to_max = _FD_CEILING
    else:
        to_max = bounds[to_asset]["max"]
    max_to = to_max - allocs[to_asset]

    actual = min(desired_pct, max(0.0, max_from), max(0.0, max_to))

    allocs[from_asset] -= actual
    allocs[to_asset] += actual

    return actual


# ── Adjustment rules ─────────────────────────────────────────────────────────

def _rule_age(
    allocs: Dict[str, float],
    age: int,
    bounds: Dict[str, Any],
) -> str:
    """Rule 1: Age adjustment — young tilts toward stocks, older toward gold."""
    if age < 35:
        actual = _shift(allocs, "gold", "stocks", 5.0, bounds)
        return f"age_adjustment: shifted {actual:.1f}% gold to stocks (age {age} < 35)"
    elif age > 50:
        actual = _shift(allocs, "stocks", "gold", 5.0, bounds)
        return f"age_adjustment: shifted {actual:.1f}% stocks to gold (age {age} > 50)"
    else:
        return f"age_adjustment: no change (age {age}, between 35 and 50)"


def _rule_horizon(
    allocs: Dict[str, float],
    horizon: int,
    bounds: Dict[str, Any],
) -> str:
    """Rule 2: Horizon adjustment — short horizon tilts toward FD, long toward stocks."""
    if horizon < 5:
        actual = _shift(allocs, "stocks", "FD", 5.0, bounds)
        return f"horizon_adjustment: shifted {actual:.1f}% stocks to FD (horizon {horizon} years < 5)"
    elif horizon > 15:
        actual = _shift(allocs, "FD", "stocks", 5.0, bounds)
        return f"horizon_adjustment: shifted {actual:.1f}% FD to stocks (horizon {horizon} years > 15)"
    else:
        return f"horizon_adjustment: no change (horizon {horizon} years)"


def _rule_savings_rate(
    allocs: Dict[str, float],
    savings_rate: float,
    bounds: Dict[str, Any],
) -> str:
    """Rule 3: Savings rate adjustment — high savers tilt toward mutual_funds."""
    if savings_rate > 0.4:
        actual = _shift(allocs, "FD", "mutual_funds", 3.0, bounds)
        return (
            f"savings_rate_adjustment: shifted {actual:.1f}% FD to mutual_funds "
            f"(savings rate {savings_rate:.2f} > 0.4)"
        )
    elif savings_rate < 0.15:
        actual = _shift(allocs, "mutual_funds", "FD", 3.0, bounds)
        return (
            f"savings_rate_adjustment: shifted {actual:.1f}% mutual_funds to FD "
            f"(savings rate {savings_rate:.2f} < 0.15)"
        )
    else:
        return f"savings_rate_adjustment: no change (savings rate {savings_rate:.2f})"


# ── Final enforcement ────────────────────────────────────────────────────────

def _enforce_bounds_and_renormalize(
    allocs: Dict[str, float],
    bounds: Dict[str, Any],
) -> None:
    """
    Clamp all assets to their hard limits, then redistribute any surplus or
    deficit proportionally among assets that still have room.  Ensures
    sum == 100.0 on exit.  Mutates `allocs` in place.
    """
    # Clamp FD
    allocs["FD"] = max(_FD_FLOOR, min(_FD_CEILING, allocs["FD"]))

    # Clamp risky assets
    for a in RISKY_ASSETS:
        allocs[a] = max(bounds[a]["min"], min(bounds[a]["max"], allocs[a]))

    # Redistribute residual (iterative — converges in 2-3 passes)
    for _ in range(10):
        residual = 100.0 - sum(allocs.values())
        if abs(residual) < 1e-6:
            break

        # Find assets with room in the direction of residual
        if residual > 0:
            # Need to add — find assets below their max
            room = {}
            for a in RISKY_ASSETS:
                r = bounds[a]["max"] - allocs[a]
                if r > 1e-6:
                    room[a] = r
            fd_room = _FD_CEILING - allocs["FD"]
            if fd_room > 1e-6:
                room["FD"] = fd_room
        else:
            # Need to subtract — find assets above their min
            room = {}
            for a in RISKY_ASSETS:
                r = allocs[a] - bounds[a]["min"]
                if r > 1e-6:
                    room[a] = r
            fd_room = allocs["FD"] - _FD_FLOOR
            if fd_room > 1e-6:
                room["FD"] = fd_room

        if not room:
            break  # No room left — should not happen with valid bounds

        total_room = sum(room.values())
        for a, r in room.items():
            allocs[a] += residual * (r / total_room)

        # Re-clamp after redistribution
        allocs["FD"] = max(_FD_FLOOR, min(_FD_CEILING, allocs["FD"]))
        for a in RISKY_ASSETS:
            allocs[a] = max(bounds[a]["min"], min(bounds[a]["max"], allocs[a]))


# ── Portfolio metrics ────────────────────────────────────────────────────────

def _compute_metrics(allocs: Dict[str, float]) -> Dict[str, float]:
    """
    Recompute expected return, volatility, and Sharpe using the same method
    as Step 6, but with the personalized weights.
    """
    shrunk = get_shrunk_returns()
    fd_rate = get_current_fd_rate()
    cov_df = pd.read_csv(DATA_DIR / "covariance_matrix.csv", index_col=0)
    cov = cov_df.loc[RISKY_ASSETS, RISKY_ASSETS].values

    # Weights as decimals
    fd_w = allocs["FD"] / 100.0
    risky_w = np.array([allocs[a] / 100.0 for a in RISKY_ASSETS])
    mu = np.array([shrunk[a] for a in RISKY_ASSETS])

    portfolio_return = fd_w * fd_rate + risky_w @ mu
    portfolio_variance = risky_w @ cov @ risky_w
    portfolio_volatility = float(np.sqrt(portfolio_variance))

    excess = portfolio_return - fd_rate
    sharpe = float(excess / portfolio_volatility) if portfolio_volatility > 1e-10 else 0.0

    return {
        "expected_annual_return_pct": round(portfolio_return * 100.0, 4),
        "portfolio_volatility_pct": round(portfolio_volatility * 100.0, 4),
        "sharpe_ratio": round(sharpe, 4),
    }


# ── Main entry point ─────────────────────────────────────────────────────────

def personalize_allocation(
    base_allocation: Dict[str, Any],
    user_profile: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Takes Step 6's optimizer output and adjusts it using onboarding profile
    fields to produce per-user differentiation.

    Parameters
    ----------
    base_allocation : dict
        The complete dictionary returned by optimize_portfolio().
    user_profile : dict
        Must contain: age (int), investment_horizon_years (int),
        monthly_income (float), monthly_savings (float).

    Returns
    -------
    dict with the same structure as Step 6's output, plus a
    `personalization_applied` list of rule descriptions.
    """
    risk_category = base_allocation["risk_category"]
    bounds = get_risk_boundaries(risk_category)

    # Extract current percentages into a mutable dict
    allocs: Dict[str, float] = {}
    investable_amount = 0.0
    for entry in base_allocation["allocations"]:
        ac = entry["asset_class"].lower()
        # Normalize key: "fd" -> "FD", risky assets stay lowercase
        key = "FD" if ac == "fd" else ac
        allocs[key] = entry["percentage"]
        investable_amount += entry["amount"]

    # Extract profile fields
    age = int(user_profile["age"])
    horizon = int(user_profile["investment_horizon_years"])
    monthly_income = float(user_profile["monthly_income"])
    monthly_savings = float(user_profile["monthly_savings"])
    savings_rate = monthly_savings / monthly_income if monthly_income > 0 else 0.0

    # Apply three sequential rules
    log: List[str] = []
    log.append(_rule_age(allocs, age, bounds))
    log.append(_rule_horizon(allocs, horizon, bounds))
    log.append(_rule_savings_rate(allocs, savings_rate, bounds))

    # Final enforcement: clamp + renormalize to 100%
    _enforce_bounds_and_renormalize(allocs, bounds)

    # Build output allocation list (same order as Step 6: FD first, then RISKY_ASSETS)
    allocations = [
        {
            "asset_class": "FD",
            "percentage": round(allocs["FD"], 2),
            "amount": round(allocs["FD"] / 100.0 * investable_amount, 2),
        }
    ]
    for a in RISKY_ASSETS:
        allocations.append({
            "asset_class": a.upper(),
            "percentage": round(allocs[a], 2),
            "amount": round(allocs[a] / 100.0 * investable_amount, 2),
        })

    # Recompute portfolio metrics with personalized weights
    metrics = _compute_metrics(allocs)

    return {
        "risk_category": risk_category,
        "gamma_used": base_allocation["gamma_used"],
        "allocations": allocations,
        "portfolio_metrics": metrics,
        "optimization_success": base_allocation["optimization_success"],
        "personalization_applied": log,
    }


# ── CLI validation ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json
    from services.optimizer_service import optimize_portfolio

    base = optimize_portfolio("MODERATE", 500_000)

    user_a = {
        "age": 28,
        "investment_horizon_years": 12,
        "monthly_income": 80_000,
        "monthly_savings": 36_000,
    }
    user_b = {
        "age": 55,
        "investment_horizon_years": 4,
        "monthly_income": 80_000,
        "monthly_savings": 8_000,
    }

    print("=" * 70)
    print("  MODERATE BASE (from Step 6 optimizer)")
    print("=" * 70)
    print(json.dumps(base, indent=4))

    for label, profile in [("User A (young, long horizon, high saver)", user_a),
                           ("User B (older, short horizon, low saver)", user_b)]:
        result = personalize_allocation(base, profile)
        print(f"\n{'=' * 70}")
        print(f"  {label}")
        print("=" * 70)
        print(json.dumps(result, indent=4))

        total_pct = sum(a["percentage"] for a in result["allocations"])
        total_amt = sum(a["amount"] for a in result["allocations"])
        print(f"\n  Sanity: pct_sum={total_pct:.2f}%  amt_sum={total_amt:.2f}")

    # Side-by-side comparison
    res_a = personalize_allocation(base, user_a)
    res_b = personalize_allocation(base, user_b)
    print(f"\n{'=' * 70}")
    print("  SIDE-BY-SIDE COMPARISON")
    print("=" * 70)
    print(f"  {'Asset':<15} {'Base':>8} {'User A':>8} {'User B':>8}  {'A-B diff':>8}")
    print(f"  {'-'*15} {'-'*8} {'-'*8} {'-'*8}  {'-'*8}")
    for i in range(5):
        ac = base["allocations"][i]["asset_class"]
        bp = base["allocations"][i]["percentage"]
        ap = res_a["allocations"][i]["percentage"]
        bpp = res_b["allocations"][i]["percentage"]
        print(f"  {ac:<15} {bp:>7.2f}% {ap:>7.2f}% {bpp:>7.2f}%  {ap - bpp:>+7.2f}%")
