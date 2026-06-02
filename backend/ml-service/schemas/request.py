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
