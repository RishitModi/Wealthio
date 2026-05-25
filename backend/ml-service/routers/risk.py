"""
routers/risk.py
---------------
Endpoints:
  POST /api/risk/profile     — classify user as Conservative/Moderate/Aggressive
  POST /api/risk/portfolio   — get full portfolio allocation for a risk profile
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from models.risk_profiler import predict_risk_profile
from services.portfolio import generate_portfolio

router = APIRouter(prefix="/api/risk", tags=["Risk Profiling"])


# ── Request / Response schemas ────────────────────────────────────────────────

class RiskProfileRequest(BaseModel):
    age:                  int   = Field(..., ge=18, le=80,  description="User age in years")
    monthly_income:       float = Field(..., gt=0,          description="Gross monthly income (INR)")
    monthly_expenses:     float = Field(..., ge=0,          description="Total monthly expenses (INR)")
    savings:              float = Field(..., ge=0,          description="Total existing savings/investments (INR)")
    goal_horizon_years:   int   = Field(..., ge=1, le=40,   description="Years until investment goal is needed")
    risk_appetite_score:  int   = Field(..., ge=1, le=5,    description="Self-reported risk appetite: 1=very low … 5=very high")

    @field_validator("monthly_expenses")
    @classmethod
    def expenses_below_income(cls, v, info):
        # soft warning only — expenses can equal income (zero savings)
        return v


class PortfolioRequest(RiskProfileRequest):
    include_crypto: bool = Field(True, description="Whether to include crypto in the portfolio")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/profile")
async def profile_risk(req: RiskProfileRequest):
    """
    Classify the user's risk profile.

    Returns risk_label (Conservative / Moderate / Aggressive)
    and confidence probabilities for each class.
    """
    try:
        result = predict_risk_profile(
            age=req.age,
            monthly_income=req.monthly_income,
            monthly_expenses=req.monthly_expenses,
            savings=req.savings,
            goal_horizon_years=req.goal_horizon_years,
            risk_appetite_score=req.risk_appetite_score,
        )
        return {"success": True, "data": result}
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=str(e) + " — Run `python training/train_risk_model.py` to train the model.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/portfolio")
async def recommend_portfolio(req: PortfolioRequest):
    """
    Returns a full portfolio allocation recommendation.

    Internally calls /profile first, then generates the allocation.
    """
    try:
        # Step 1: get risk label
        risk_result = predict_risk_profile(
            age=req.age,
            monthly_income=req.monthly_income,
            monthly_expenses=req.monthly_expenses,
            savings=req.savings,
            goal_horizon_years=req.goal_horizon_years,
            risk_appetite_score=req.risk_appetite_score,
        )
        # Step 2: generate portfolio
        portfolio = generate_portfolio(
            risk_label=risk_result["risk_label"],
            monthly_income=req.monthly_income,
            monthly_expenses=req.monthly_expenses,
            include_crypto=req.include_crypto,
            goal_horizon_years=req.goal_horizon_years,
        )
        return {
            "success": True,
            "risk_profile": risk_result,
            "portfolio":    portfolio,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
