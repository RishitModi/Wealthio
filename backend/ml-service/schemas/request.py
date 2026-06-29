from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class RiskProfileRequest(BaseModel):
    age: int = Field(..., ge=18, le=100, description="Investor age in years")
    investment_duration: str = Field(
        ..., description="Investment duration horizon, e.g. 'Less than 1 year', '3-5 years', 'More than 5 years'"
    )
    expected_return: str = Field(
        ..., description="Expected return bucket, e.g. '10%-20%', '20%-30%', '30%-40%'"
    )
    equity_preference: int = Field(
        ..., ge=1, le=7, description="Equity preference score from dataset"
    )
    fixed_deposit_preference: int = Field(
        ..., ge=1, le=7, description="Fixed deposit preference score from dataset"
    )
    ppf_preference: int = Field(
        ..., ge=1, le=7, description="PPF preference score from dataset"
    )
    gold_preference: int = Field(
        ..., ge=1, le=7, description="Gold preference score from dataset"
    )

    # Optional now — will become required in Step 6 when the MPT optimiser is wired in.
    # Computed by Java PortfolioService as: monthlySavings * 12 * 0.7
    investable_amount: Optional[float] = Field(
        default=None,
        gt=0,
        description=(
            "Total investable amount in currency units (e.g. INR). "
            "Used to compute investable_amount_for_optimization = investable_amount * (1 - fd_pct/100)."
        ),
    )
