from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class RiskProfileResponse(BaseModel):
    # ── Java-contract fields (required by Spring Boot PortfolioService) ────────
    risk_category: str = Field(
        ...,
        description="Risk category in UPPERCASE — exactly one of CONSERVATIVE, MODERATE, AGGRESSIVE",
    )
    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence in the classification, derived from normalised KMeans distances",
    )

    # ── Boundary fields (fed into the MPT optimiser in Step 6) ────────────────
    fd_allocation: float = Field(
        ...,
        description="Fixed FD allocation % of total portfolio for this risk category (e.g. 15.0 for MODERATE)",
    )
    boundaries: Dict[str, Any] = Field(
        ...,
        description=(
            "Per-asset min/max allocation bounds as % of total portfolio for the four risky assets "
            "(stocks, gold, mutual_funds, etf). FD is excluded — it is fixed via fd_allocation."
        ),
    )
    investable_amount_for_optimization: Optional[float] = Field(
        default=None,
        description=(
            "investable_amount * (1 - fd_allocation/100). "
            "The portion of the total investable amount that flows into the four risky assets. "
            "None when investable_amount was not provided in the request."
        ),
    )

    # ── Frontend-contract fields (consumed by React onboarding page) ───────────
    cluster_id: int
    risk_label: str = Field(..., description="Title-case alias of risk_category, e.g. 'Moderate'")
    explanation: str
    feature_overview: Dict[str, Any]
