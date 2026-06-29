import json
from pathlib import Path
from typing import Any, Dict

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


def load_raw_data() -> pd.DataFrame:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    missing_cols = [col for col in FEATURE_COLUMNS if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns in dataset: {missing_cols}")

    return df[FEATURE_COLUMNS].dropna().copy()


def build_label_encoders(data: pd.DataFrame) -> Dict[str, LabelEncoder]:
    label_encoders: Dict[str, LabelEncoder] = {}
    for column in CATEGORICAL_COLUMNS:
        encoder = LabelEncoder()
        encoded = encoder.fit_transform(data[column].astype(str))
        data[column] = encoded
        label_encoders[column] = encoder
    return label_encoders


def build_feature_matrix(data: pd.DataFrame, encoders: Dict[str, LabelEncoder]) -> np.ndarray:
    matrix = data.copy()
    for column in CATEGORICAL_COLUMNS:
        if column not in encoders:
            raise ValueError(f"Missing encoder for '{column}'")
        matrix[column] = encoders[column].transform(matrix[column].astype(str))

    numeric_columns = [col for col in FEATURE_COLUMNS]
    return matrix[numeric_columns].astype(float).to_numpy()


def train_kmeans(n_clusters: int = 3, random_state: int = 42) -> None:
    df = load_raw_data()
    label_encoders = build_label_encoders(df)
    feature_matrix = build_feature_matrix(df, label_encoders)

    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(feature_matrix)

    kmeans = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=20)
    kmeans.fit(scaled_features)

    joblib.dump(kmeans, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(label_encoders, LABEL_ENCODERS_PATH)

    cluster_mapping = build_cluster_mapping(kmeans, scaler, label_encoders, df)
    with CLUSTER_MAPPING_PATH.open("w", encoding="utf-8") as handle:
        json.dump(cluster_mapping, handle, indent=2)

    print("Training complete.")
    print_artifact_summary(kmeans, scaler, label_encoders, cluster_mapping, df)


def build_cluster_mapping(
    kmeans: KMeans,
    scaler: StandardScaler,
    label_encoders: Dict[str, LabelEncoder],
    raw_data: pd.DataFrame,
) -> Dict[str, Any]:
    cluster_centers = scaler.inverse_transform(kmeans.cluster_centers_)
    summary = []

    for cluster_id, center in enumerate(cluster_centers):
        center_dict = {col: float(value) for col, value in zip(FEATURE_COLUMNS, center)}
        center_dict["Duration"] = _decode_categorical(center_dict["Duration"], label_encoders["Duration"])
        center_dict["Expect"] = _decode_categorical(center_dict["Expect"], label_encoders["Expect"])
        risk_score = _estimate_cluster_risk_score(center, raw_data)
        summary.append({
            "cluster_id": cluster_id,
            "risk_score": risk_score,
            "center": center_dict,
        })

    summary.sort(key=lambda item: item["risk_score"])
    labels = ["Conservative", "Moderate", "Aggressive"]
    mapping: Dict[str, Any] = {}
    for label, cluster in zip(labels, summary):
        mapping[str(cluster["cluster_id"])] = {
            "label": label,
            "risk_score": round(cluster["risk_score"], 4),
            "center": cluster["center"],
        }

    return mapping


def _decode_categorical(value: float, encoder: LabelEncoder) -> str:
    rounded = int(round(value))
    rounded = max(0, min(rounded, len(encoder.classes_) - 1))
    return encoder.inverse_transform([rounded])[0]


def _estimate_cluster_risk_score(center: np.ndarray, raw_data: pd.DataFrame) -> float:
    min_vals = raw_data.min()
    max_vals = raw_data.max()

    def normalize(name: str, value: float) -> float:
        denom = max(1.0, max_vals[name] - min_vals[name])
        return float((value - min_vals[name]) / denom)

    age_score = 1.0 - normalize("age", center[0])
    duration_score = normalize("Duration", center[1])
    expect_score = normalize("Expect", center[2])
    equity_score = normalize("Equity_Market", center[3])
    fixed_score = 1.0 - normalize("Fixed_Deposits", center[4])
    ppf_score = 1.0 - normalize("PPF", center[5])
    gold_score = normalize("Gold", center[6])

    return (
        age_score * 0.15
        + duration_score * 0.15
        + expect_score * 0.25
        + equity_score * 0.25
        + fixed_score * 0.1
        + ppf_score * 0.05
        + gold_score * 0.05
    )


def print_artifact_summary(
    kmeans: KMeans,
    scaler: StandardScaler,
    label_encoders: Dict[str, LabelEncoder],
    cluster_mapping: Dict[str, Any],
    raw_data: pd.DataFrame,
) -> None:
    counts = np.bincount(kmeans.labels_)
    print("\nCluster membership counts:")
    for cluster_id, count in enumerate(counts):
        label = cluster_mapping[str(cluster_id)]["label"]
        print(f"  Cluster {cluster_id} ({label}): {count} samples")

    print("\nCluster centers (decoded):")
    for cluster_id, info in cluster_mapping.items():
        center = info["center"]
        print(f"  Cluster {cluster_id} → {info['label']} (score={info['risk_score']})")
        print("    ")
        for key in FEATURE_COLUMNS:
            print(f"    {key}: {center[key]}")
        print("")

    print(f"\nSaved artifacts:\n  {MODEL_PATH}\n  {SCALER_PATH}\n  {LABEL_ENCODERS_PATH}\n  {CLUSTER_MAPPING_PATH}")


def load_artifact(path: Path, name: str):
    if not path.exists():
        raise FileNotFoundError(f"Required artifact '{name}' not found at {path}")
    return joblib.load(path)


# ── Module-level singletons — loaded ONCE at application startup ──────────────
# Each artifact is read from disk a single time when this module is first
# imported by FastAPI. All subsequent prediction calls use the in-memory object.
def _load_cluster_mapping_from_disk() -> Dict[str, Any]:
    if not CLUSTER_MAPPING_PATH.exists():
        raise FileNotFoundError(f"cluster mapping not found at {CLUSTER_MAPPING_PATH}")
    with CLUSTER_MAPPING_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


_KMEANS: KMeans = load_artifact(MODEL_PATH, "kmeans_model")
_SCALER: StandardScaler = load_artifact(SCALER_PATH, "scaler")
_LABEL_ENCODERS: Dict[str, LabelEncoder] = load_artifact(LABEL_ENCODERS_PATH, "label_encoders")
_CLUSTER_MAPPING: Dict[str, Any] = _load_cluster_mapping_from_disk()


# ── Public accessors (kept for backward-compat with any external callers) ─────
def load_kmeans() -> KMeans:
    return _KMEANS


def load_scaler() -> StandardScaler:
    return _SCALER


def load_label_encoders() -> Dict[str, LabelEncoder]:
    return _LABEL_ENCODERS


def load_cluster_mapping() -> Dict[str, Any]:
    return _CLUSTER_MAPPING


def prepare_feature_vector(
    age: int,
    investment_duration: str,
    expected_return: str,
    equity_preference: int,
    fixed_deposit_preference: int,
    ppf_preference: int,
    gold_preference: int,
) -> np.ndarray:
    if any(value < 1 or value > 7 for value in [equity_preference, fixed_deposit_preference, ppf_preference, gold_preference]):
        raise ValueError("Preference values must be between 1 and 7.")

    # Use the module-level singleton — no disk I/O on this hot path.
    duration_encoder = _LABEL_ENCODERS["Duration"]
    expect_encoder = _LABEL_ENCODERS["Expect"]

    try:
        duration_encoded = int(duration_encoder.transform([investment_duration])[0])
    except ValueError as exc:
        raise ValueError(
            f"Invalid investment_duration '{investment_duration}'. "
            f"Allowed values: {duration_encoder.classes_.tolist()}"
        ) from exc

    try:
        expected_return_encoded = int(expect_encoder.transform([expected_return])[0])
    except ValueError as exc:
        raise ValueError(
            f"Invalid expected_return '{expected_return}'. "
            f"Allowed values: {expect_encoder.classes_.tolist()}"
        ) from exc

    return np.array([
        [
            age,
            duration_encoded,
            expected_return_encoded,
            equity_preference,
            fixed_deposit_preference,
            ppf_preference,
            gold_preference,
        ]
    ], dtype=float)


def predict_cluster(
    age: int,
    investment_duration: str,
    expected_return: str,
    equity_preference: int,
    fixed_deposit_preference: int,
    ppf_preference: int,
    gold_preference: int,
) -> Dict[str, Any]:
    # Use module-level singletons — all three were loaded once at startup.
    kmeans = _KMEANS
    scaler = _SCALER
    cluster_mapping = _CLUSTER_MAPPING
    features = prepare_feature_vector(
        age,
        investment_duration,
        expected_return,
        equity_preference,
        fixed_deposit_preference,
        ppf_preference,
        gold_preference,
    )
    scaled = scaler.transform(features)
    cluster_id = int(kmeans.predict(scaled)[0])
    mapping = cluster_mapping.get(str(cluster_id))
    if mapping is None:
        raise ValueError(f"No mapping found for cluster {cluster_id}")

    # ── Confidence score from KMeans distances ────────────────────────────────
    # transform() returns squared Euclidean distances to every cluster centre.
    # A high confidence means the point is much closer to its assigned cluster
    # than to any other. We compute: 1 - (d_assigned / sum(all_d)), normalised
    # to [0, 1] so a perfect assignment scores 1.0.
    distances = kmeans.transform(scaled)[0]           # shape: (n_clusters,)
    d_assigned = distances[cluster_id]
    d_sum = distances.sum()
    if d_sum == 0.0:
        confidence_score = 1.0
    else:
        # Fraction of total distance NOT belonging to the assigned cluster.
        # When d_assigned << others, this approaches (n_clusters-1)/n_clusters → 1.
        confidence_score = float(1.0 - d_assigned / d_sum)

    risk_label = mapping["label"]                     # e.g. "Moderate"
    risk_category = risk_label.upper()                # e.g. "MODERATE"

    explanation = _build_explanation(
        cluster_label=risk_label,
        investment_duration=investment_duration,
        expected_return=expected_return,
        equity_preference=equity_preference,
        fixed_deposit_preference=fixed_deposit_preference,
        ppf_preference=ppf_preference,
        gold_preference=gold_preference,
    )

    return {
        # Java-contract fields
        "risk_category": risk_category,
        "confidence_score": round(confidence_score, 4),
        # Frontend-contract fields
        "cluster_id": cluster_id,
        "risk_label": risk_label,
        "explanation": explanation,
        "feature_overview": {
            "age": age,
            "investment_duration": investment_duration,
            "expected_return": expected_return,
            "equity_preference": equity_preference,
            "fixed_deposit_preference": fixed_deposit_preference,
            "ppf_preference": ppf_preference,
            "gold_preference": gold_preference,
        },
    }


def _build_explanation(
    cluster_label: str,
    investment_duration: str,
    expected_return: str,
    equity_preference: int,
    fixed_deposit_preference: int,
    ppf_preference: int,
    gold_preference: int,
) -> str:
    sentiment = {
        "Conservative": "The profile is weighted toward capital preservation, shorter horizons, and lower return expectations.",
        "Moderate": "The profile balances growth and stability, with a mix of equity and safe-saving preferences.",
        "Aggressive": "The profile is aligned with higher equity exposure, longer duration, and stronger return expectations.",
    }

    return (
        f"Assigned to {cluster_label} because the investor's expected return, equity preference, and duration align with this risk tier. "
        f"Fixed deposit and PPF preferences are lower compared to equity preference, indicating a higher tolerance for growth-oriented allocations. "
        f"{sentiment[cluster_label]}"
    )
