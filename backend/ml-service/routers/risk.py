"""
routers/risk.py
---------------
Expose risk profiling endpoints backed by K-Means clustering.
"""

from fastapi import APIRouter, HTTPException
from schemas.request import RiskProfileRequest
from schemas.response import RiskProfileResponse
from models.risk_profiler import predict_risk_profile
from services.risk_service import get_risk_boundaries, RISKY_ASSETS
from pydantic import BaseModel
from pathlib import Path
import json
from datetime import datetime

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"
ARTIFACTS_DIR.mkdir(exist_ok=True)
SELECTIONS_PATH = ARTIFACTS_DIR / "selected_profiles.json"

router = APIRouter(prefix="", tags=["Risk Profiling"])


@router.post("/risk-profile", response_model=RiskProfileResponse)
async def profile_risk(req: RiskProfileRequest):
    """Predict an investor risk profile and return a decision-support recommendation."""
    try:
        result = predict_risk_profile(
            age=req.age,
            investment_duration=req.investment_duration,
            expected_return=req.expected_return,
            equity_preference=req.equity_preference,
            fixed_deposit_preference=req.fixed_deposit_preference,
            ppf_preference=req.ppf_preference,
            gold_preference=req.gold_preference,
        )

        # ── Enrich with boundary data ─────────────────────────────────────────
        risk_bounds = get_risk_boundaries(result["risk_category"])
        fd_allocation: float = risk_bounds["fd"]

        # Boundaries exposed to the response contain only the four risky assets.
        risky_bounds = {asset: risk_bounds[asset] for asset in RISKY_ASSETS}

        # investable_amount_for_optimization is the slice that goes to risky assets.
        # None when the caller did not supply investable_amount (optional in Step 5).
        investable_amount_for_optimization: float | None = None
        if req.investable_amount is not None:
            investable_amount_for_optimization = round(
                req.investable_amount * (1.0 - fd_allocation / 100.0), 2
            )

        return {
            **result,
            "fd_allocation": fd_allocation,
            "boundaries": risky_bounds,
            "investable_amount_for_optimization": investable_amount_for_optimization,
        }

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc) + " — Run `python training/train_kmeans.py` to train the model.",
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


class RiskSelectionRequest(BaseModel):
    recommendedRisk: str
    selectedRisk: str
    feature_overview: dict | None = None


@router.post("/risk-selection")
async def save_risk_selection(req: RiskSelectionRequest):
    """Persist the ML recommended and user-selected risk profiles for auditing."""
    record = {
        "recommendedRisk": req.recommendedRisk,
        "selectedRisk": req.selectedRisk,
        "feature_overview": req.feature_overview,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    try:
        if SELECTIONS_PATH.exists():
            with SELECTIONS_PATH.open("r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            data = []

        data.append(record)
        with SELECTIONS_PATH.open("w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        return {"success": True, "saved": record}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save selection: {exc}")
