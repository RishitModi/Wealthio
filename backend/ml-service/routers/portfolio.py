"""
routers/portfolio.py
---------------------
POST /api/ml/portfolio-allocation

Orchestrates the full allocation pipeline (Steps 1-7) and combines the result
with Prophet-based market timing signals into a single response for the
Spring Boot backend / React dashboard.

Design decision — error isolation:
    Allocation must always succeed if the request reaches this handler, because
    Step 6 guarantees a usable fallback even when the optimizer fails to converge.
    Prophet timing signals are best-effort only: if either forecast fails (network
    issue, model not loaded, missing CSV), the endpoint returns the allocation
    portion successfully and sets market_timing_signals to null with a note.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.risk_service import get_risk_boundaries, RISKY_ASSETS, VALID_RISK_CATEGORIES
from services.optimizer_service import optimize_portfolio
from services.personalization_service import personalize_allocation
from services.shrinkage_service import get_shrunk_returns
from services.fd_service import get_current_fd_rate, get_fd_expected_return
from services.forecast_service import forecast_asset

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ml", tags=["Portfolio Allocation"])


# ── Request schema ────────────────────────────────────────────────────────────

class PortfolioAllocationRequest(BaseModel):
    risk_category: str = Field(
        ...,
        description="CONSERVATIVE, MODERATE, or AGGRESSIVE (from Step 1 classifier)",
    )
    investable_amount: float = Field(
        ..., gt=0, description="Total investable amount in INR"
    )
    age: int = Field(..., ge=18, le=100, description="Investor age in years")
    investment_horizon_years: int = Field(
        ..., ge=1, le=40, description="Investment horizon in years"
    )
    monthly_income: float = Field(..., gt=0, description="Monthly income in INR")
    monthly_savings: float = Field(..., ge=0, description="Monthly savings in INR")


# ── Reasoning generator ──────────────────────────────────────────────────────

def _build_reasoning(
    asset_class: str,
    percentage: float,
    risk_category: str,
    personalization_log: List[str],
    bounds: Dict[str, Any],
) -> str:
    """
    Generate a context-aware reasoning string for each asset in the allocation.
    Uses honest language — if the asset is boundary-pinned, it says so plainly.
    """
    ac_lower = asset_class.lower()

    # FD has its own static reasoning
    if ac_lower == "fd":
        fd_info = get_fd_expected_return()
        return fd_info["description"]

    # Check if this asset is at its boundary minimum
    asset_min = bounds[ac_lower]["min"]
    if abs(percentage - asset_min) < 0.01:
        return f"Allocated at minimum threshold for {risk_category} risk profile"

    # Check if personalization touched this specific asset
    personalized_assets_in_log = []
    asset_keywords = {
        "stocks": ["stocks", "stock"],
        "gold": ["gold"],
        "mutual_funds": ["mutual_funds", "mutual funds"],
        "etf": ["etf"],
    }
    keywords = asset_keywords.get(ac_lower, [])
    for entry in personalization_log:
        if any(kw in entry.lower() for kw in keywords) and "no change" not in entry:
            # Check if it actually shifted (not 0.0%)
            if "shifted 0.0%" not in entry:
                personalized_assets_in_log.append(entry)

    if personalized_assets_in_log:
        return "Adjusted based on your age and investment horizon"

    return "Optimized for risk-adjusted returns based on 10-year historical market data"


# ── Timing signals (best-effort) ─────────────────────────────────────────────

def _get_timing_signals() -> Optional[Dict[str, Any]]:
    """
    Fetch Prophet forecasts for gold and nifty.  Returns None if either fails.
    Allocation is the core feature; timing signals are supplementary.
    """
    try:
        gold_forecast = forecast_asset("gold", periods=30)
        nifty_forecast = forecast_asset("nifty", periods=30)

        def _extract(fc: dict) -> dict:
            return {
                "signal": fc.get("signal", "UNAVAILABLE"),
                "expected_change_percent": fc.get("changePercent", 0.0),
                "message": fc.get("message", "Forecast unavailable"),
            }

        return {
            "gold": _extract(gold_forecast),
            "nifty": _extract(nifty_forecast),
        }
    except Exception as e:
        logger.warning(f"Prophet timing signals unavailable: {e}")
        return None


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/portfolio-allocation")
async def allocate_portfolio(req: PortfolioAllocationRequest):
    """
    Full portfolio allocation pipeline.

    Combines mean-variance optimization (Step 6), personalization (Step 7),
    and Prophet market timing signals into a single response for the dashboard.
    """
    # ── 1. Validate risk_category ────────────────────────────────────────
    category = req.risk_category.strip().upper()
    if category not in VALID_RISK_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid risk_category '{req.risk_category}'. "
                   f"Must be one of: {sorted(VALID_RISK_CATEGORIES)}",
        )

    # ── 2. Run Step 6 optimizer ──────────────────────────────────────────
    base_allocation = optimize_portfolio(category, req.investable_amount)

    if not base_allocation["optimization_success"]:
        logger.warning(
            f"Optimizer did not converge for {category}; using midpoint fallback. "
            "Allocation is still usable."
        )

    # ── 3. Run Step 7 personalization ────────────────────────────────────
    user_profile = {
        "age": req.age,
        "investment_horizon_years": req.investment_horizon_years,
        "monthly_income": req.monthly_income,
        "monthly_savings": req.monthly_savings,
    }
    personalized = personalize_allocation(base_allocation, user_profile)

    # ── 4. Enrich allocations with reasoning and expected returns ────────
    bounds = get_risk_boundaries(category)
    shrunk = get_shrunk_returns()
    fd_rate = get_current_fd_rate()
    personalization_log = personalized["personalization_applied"]

    enriched_allocations = []
    for entry in personalized["allocations"]:
        ac = entry["asset_class"]
        ac_lower = ac.lower()

        # Expected return string
        if ac_lower == "fd":
            expected_return_range = f"{fd_rate * 100:.1f}% (current rate)"
        else:
            shrunk_pct = shrunk[ac_lower] * 100.0
            expected_return_range = f"{shrunk_pct:.1f}% (shrinkage-adjusted)"

        reasoning = _build_reasoning(
            ac, entry["percentage"], category, personalization_log, bounds
        )

        enriched_allocations.append({
            **entry,
            "expected_return_range": expected_return_range,
            "reasoning": reasoning,
        })

    # ── 5. Fetch timing signals (best-effort) ────────────────────────────
    timing_signals = _get_timing_signals()

    # ── 6. Assemble response ─────────────────────────────────────────────
    return {
        "risk_category": category,
        "investable_amount": req.investable_amount,
        "gamma_used": personalized["gamma_used"],
        "allocations": enriched_allocations,
        "portfolio_metrics": personalized["portfolio_metrics"],
        "personalization_applied": personalization_log,
        "market_timing_signals": timing_signals,
    }
