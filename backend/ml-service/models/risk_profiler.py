from typing import Dict

from services.clustering_service import predict_cluster


def predict_risk_profile(
    age: int,
    investment_duration: str,
    expected_return: str,
    equity_preference: int,
    fixed_deposit_preference: int,
    ppf_preference: int,
    gold_preference: int,
) -> Dict[str, object]:
    """Predict the investor risk profile using a trained KMeans cluster model."""
    return predict_cluster(
        age=age,
        investment_duration=investment_duration,
        expected_return=expected_return,
        equity_preference=equity_preference,
        fixed_deposit_preference=fixed_deposit_preference,
        ppf_preference=ppf_preference,
        gold_preference=gold_preference,
    )
