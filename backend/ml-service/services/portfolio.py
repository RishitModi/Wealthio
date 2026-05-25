"""
portfolio.py
------------
Generates a recommended portfolio allocation based on:
  - Risk profile (Conservative / Moderate / Aggressive)
  - Investable amount (monthly_income - monthly_expenses)
  - Optional: whether user wants crypto exposure
"""

from typing import Optional

# ── Allocation templates (%) ──────────────────────────────────────────────────
ALLOCATIONS = {
    "Conservative": {
        "Fixed Deposits":  40,
        "Gold":            25,
        "Mutual Funds":    20,
        "Stocks":           5,
        "ETFs":            10,
        "Crypto":           0,
        "Real Estate":      0,
    },
    "Moderate": {
        "Fixed Deposits":  15,
        "Gold":            15,
        "Mutual Funds":    30,
        "Stocks":          20,
        "ETFs":            10,
        "Crypto":           5,
        "Real Estate":      5,
    },
    "Aggressive": {
        "Fixed Deposits":   5,
        "Gold":             5,
        "Mutual Funds":     20,
        "Stocks":           35,
        "ETFs":             15,
        "Crypto":           15,
        "Real Estate":       5,
    },
}

# Approximate expected annual returns (%) — used for ROI estimation
EXPECTED_RETURNS = {
    "Fixed Deposits":  7.0,
    "Gold":            8.5,
    "Mutual Funds":   12.0,
    "Stocks":         14.0,
    "ETFs":           11.0,
    "Crypto":         25.0,   # high variance — used cautiously
    "Real Estate":    10.0,
}

# Risk score per asset (1 = very safe, 5 = very risky)
ASSET_RISK_SCORES = {
    "Fixed Deposits":  1,
    "Gold":            2,
    "Mutual Funds":    3,
    "Stocks":          4,
    "ETFs":            3,
    "Crypto":          5,
    "Real Estate":     3,
}


def generate_portfolio(
    risk_label: str,
    monthly_income: float,
    monthly_expenses: float,
    include_crypto: bool = True,
    goal_horizon_years: int = 5,
) -> dict:
    """
    Returns a full portfolio recommendation with:
      - asset-wise allocation %
      - monthly investment amount per asset
      - projected corpus after goal_horizon_years
      - overall portfolio risk score
    """
    if risk_label not in ALLOCATIONS:
        return {"error": f"Unknown risk_label: {risk_label}"}

    investable_monthly = max(0.0, monthly_income - monthly_expenses)
    # Recommend investing 70% of surplus (keep 30% as liquid buffer)
    recommended_monthly = round(investable_monthly * 0.70, 2)

    base = dict(ALLOCATIONS[risk_label])

    # If user opts out of crypto, redistribute crypto % to Mutual Funds
    if not include_crypto and base["Crypto"] > 0:
        base["Mutual Funds"] += base["Crypto"]
        base["Crypto"] = 0

    months = goal_horizon_years * 12
    breakdown = []
    total_projected = 0.0
    weighted_risk = 0.0

    for asset, pct in base.items():
        if pct == 0:
            continue
        monthly_amount = round(recommended_monthly * pct / 100, 2)
        annual_return  = EXPECTED_RETURNS[asset] / 100
        monthly_return = annual_return / 12

        # Future Value of a monthly SIP: FV = P * [((1+r)^n - 1) / r] * (1+r)
        if monthly_return > 0:
            fv = monthly_amount * (((1 + monthly_return) ** months - 1) / monthly_return) * (1 + monthly_return)
        else:
            fv = monthly_amount * months

        total_projected += fv
        weighted_risk   += (pct / 100) * ASSET_RISK_SCORES[asset]

        breakdown.append({
            "asset":             asset,
            "allocation_%":      pct,
            "monthly_amount":    monthly_amount,
            "expected_return_%": EXPECTED_RETURNS[asset],
            "projected_value":   round(fv, 2),
        })

    # Sort by allocation descending
    breakdown.sort(key=lambda x: x["allocation_%"], reverse=True)

    return {
        "risk_profile":            risk_label,
        "monthly_income":          monthly_income,
        "monthly_expenses":        monthly_expenses,
        "investable_monthly":      round(investable_monthly, 2),
        "recommended_monthly_sip": recommended_monthly,
        "goal_horizon_years":      goal_horizon_years,
        "portfolio_risk_score":    round(weighted_risk, 2),   # 1–5 scale
        "total_projected_corpus":  round(total_projected, 2),
        "breakdown":               breakdown,
        "disclaimer": (
            "Projections are estimates based on historical average returns. "
            "Past performance does not guarantee future results. "
            "Consult a SEBI-registered financial advisor before investing."
        ),
    }
