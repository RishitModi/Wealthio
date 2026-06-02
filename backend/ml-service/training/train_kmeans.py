import json
from pathlib import Path
from typing import Dict, Any

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import LabelEncoder, StandardScaler


ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT_DIR / "data" / "Finance_Trends.csv"
ARTIFACTS_DIR = ROOT_DIR / "artifacts"
ARTIFACTS_DIR.mkdir(exist_ok=True)
MODEL_PATH = ARTIFACTS_DIR / "kmeans_model.pkl"
SCALER_PATH = ARTIFACTS_DIR / "scaler.pkl"
LABEL_ENCODERS_PATH = ARTIFACTS_DIR / "label_encoders.pkl"
CLUSTER_MAPPING_PATH = ARTIFACTS_DIR / "cluster_mapping.json"

FEATURE_COLUMNS = [
    "age",
    "Duration",
    "Expect",
    "Equity_Market",
    "Fixed_Deposits",
    "PPF",
    "Gold",
]
CATEGORICAL_COLUMNS = ["Duration", "Expect"]


def _load_dataset() -> pd.DataFrame:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset missing: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    missing_columns = [col for col in FEATURE_COLUMNS if col not in df.columns]
    if missing_columns:
        raise ValueError(f"Dataset missing columns: {missing_columns}")

    return df[FEATURE_COLUMNS].dropna().copy()


def _build_label_encoders(data: pd.DataFrame) -> Dict[str, LabelEncoder]:
    encoders: Dict[str, LabelEncoder] = {}
    for column in CATEGORICAL_COLUMNS:
        encoder = LabelEncoder()
        encoder.fit(data[column].astype(str))
        encoders[column] = encoder
    return encoders


def _encode_features(data: pd.DataFrame, encoders: Dict[str, LabelEncoder]) -> np.ndarray:
    transformed = data.copy()
    for column, encoder in encoders.items():
        transformed[column] = encoder.transform(transformed[column].astype(str))
    return transformed[FEATURE_COLUMNS].astype(float).to_numpy()


def _decode_center(center: np.ndarray, encoders: Dict[str, LabelEncoder]) -> Dict[str, Any]:
    decoded = {}
    for idx, feature_name in enumerate(FEATURE_COLUMNS):
        value = float(center[idx])
        if feature_name in encoders:
            label_encoder = encoders[feature_name]
            decoded_value = _decode_categorical(value, label_encoder)
            decoded[feature_name] = decoded_value
        else:
            decoded[feature_name] = round(value, 2)
    return decoded


def _decode_categorical(value: float, encoder: LabelEncoder) -> str:
    index = int(round(value))
    index = max(0, min(index, len(encoder.classes_) - 1))
    return str(encoder.inverse_transform([index])[0])


def _normalize(value: float, min_value: float, max_value: float) -> float:
    if max_value <= min_value:
        return 0.0
    return float((value - min_value) / (max_value - min_value))


def _cluster_risk_score(center: np.ndarray, data: pd.DataFrame) -> float:
    min_vals = data.min()
    max_vals = data.max()

    age_risk = 1.0 - _normalize(center[0], min_vals["age"], max_vals["age"])
    duration_risk = _normalize(center[1], min_vals["Duration"], max_vals["Duration"])
    expect_risk = _normalize(center[2], min_vals["Expect"], max_vals["Expect"])
    equity_risk = _normalize(center[3], min_vals["Equity_Market"], max_vals["Equity_Market"])
    fd_risk = 1.0 - _normalize(center[4], min_vals["Fixed_Deposits"], max_vals["Fixed_Deposits"])
    ppf_risk = 1.0 - _normalize(center[5], min_vals["PPF"], max_vals["PPF"])
    gold_risk = _normalize(center[6], min_vals["Gold"], max_vals["Gold"])

    return (
        age_risk * 0.15
        + duration_risk * 0.15
        + expect_risk * 0.25
        + equity_risk * 0.25
        + fd_risk * 0.1
        + ppf_risk * 0.05
        + gold_risk * 0.05
    )


def _build_mapping(
    kmeans: KMeans,
    scaler: StandardScaler,
    encoders: Dict[str, LabelEncoder],
    encoded_data: pd.DataFrame,
) -> Dict[str, Any]:
    centers = scaler.inverse_transform(kmeans.cluster_centers_)
    rows = []
    for cluster_id, center in enumerate(centers):
        rows.append(
            {
                "cluster_id": cluster_id,
                "risk_score": _cluster_risk_score(center, encoded_data),
                "center": _decode_center(center, encoders),
            }
        )

    rows.sort(key=lambda row: row["risk_score"])
    labels = ["Conservative", "Moderate", "Aggressive"]

    mapping: Dict[str, Any] = {}
    for label, row in zip(labels, rows):
        mapping[str(row["cluster_id"])] = {
            "label": label,
            "risk_score": round(row["risk_score"], 4),
            "center": row["center"],
        }
    return mapping


def _print_cluster_summary(
    kmeans: KMeans,
    mapping: Dict[str, Any],
) -> None:
    print("\nCluster statistics:")
    counts = np.bincount(kmeans.labels_)
    for cluster_id, count in enumerate(counts):
        info = mapping[str(cluster_id)]
        print(f"  Cluster {cluster_id}: {count} samples → {info['label']} (score={info['risk_score']})")

    print("\nCluster centers decoded:")
    for cluster_id, info in mapping.items():
        print(f"  Cluster {cluster_id} → {info['label']}")
        for feature_name, value in info["center"].items():
            print(f"    {feature_name}: {value}")
        print("")


def train(n_clusters: int = 3, random_state: int = 42) -> None:
    data = _load_dataset()
    label_encoders = _build_label_encoders(data)
    features = _encode_features(data, label_encoders)

    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(features)

    kmeans = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=20)
    kmeans.fit(scaled_features)

    joblib.dump(kmeans, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(label_encoders, LABEL_ENCODERS_PATH)

    encoded_data = pd.DataFrame(features, columns=FEATURE_COLUMNS)
    cluster_mapping = _build_mapping(kmeans, scaler, label_encoders, encoded_data)
    with CLUSTER_MAPPING_PATH.open("w", encoding="utf-8") as handle:
        json.dump(cluster_mapping, handle, indent=2)

    _print_cluster_summary(kmeans, cluster_mapping)
    print(f"\nSaved artifacts:\n  {MODEL_PATH}\n  {SCALER_PATH}\n  {LABEL_ENCODERS_PATH}\n  {CLUSTER_MAPPING_PATH}")


if __name__ == "__main__":
    train()
