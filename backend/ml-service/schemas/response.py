from pydantic import BaseModel
from typing import Dict, Any


class RiskProfileResponse(BaseModel):
    cluster_id: int
    risk_label: str
    explanation: str
    feature_overview: Dict[str, Any]
