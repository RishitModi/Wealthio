"""
train_risk_model.py
-------------------
Generates synthetic financial profiles and trains a RandomForestClassifier.

Run from the ml-service root:
    python training/train_risk_model.py

Outputs:
    artifacts/risk_model.pkl
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

ARTIFACTS_DIR = Path(__file__).parent.parent / "artifacts"
ARTIFACTS_DIR.mkdir(exist_ok=True)
MODEL_PATH = ARTIFACTS_DIR / "risk_model.pkl"

SEED = 42
N_SAMPLES = 5000

rng = np.random.default_rng(SEED)


def _assign_label(row: pd.Series) -> int:
    """
    Rule-based ground truth for synthetic data.

    Conservative (0): older, low income surplus, short horizon, low appetite
    Moderate     (1): middle ground
    Aggressive   (2): younger, high surplus, long horizon, high appetite
    """
    score = 0

    # Age: younger → more aggressive
    if row["age"] < 30:
        score += 2
    elif row["age"] < 45:
        score += 1

    # Savings rate
    if row["savings_rate"] > 0.30:
        score += 2
    elif row["savings_rate"] > 0.15:
        score += 1

    # Goal horizon
    if row["goal_horizon_years"] >= 10:
        score += 2
    elif row["goal_horizon_years"] >= 5:
        score += 1

    # Self-reported risk appetite (1–5)
    if row["risk_appetite_score"] >= 4:
        score += 2
    elif row["risk_appetite_score"] == 3:
        score += 1

    # Emergency buffer: savings >= 6 months expenses → slightly more aggressive ok
    if row["savings"] >= row["monthly_expenses"] * 6:
        score += 1

    # Classify by total score (max possible = 9)
    if score <= 3:
        return 0  # Conservative
    elif score <= 6:
        return 1  # Moderate
    else:
        return 2  # Aggressive


def generate_synthetic_data(n: int) -> pd.DataFrame:
    age                 = rng.integers(22, 65, size=n)
    monthly_income      = rng.uniform(20_000, 300_000, size=n)   # INR
    expense_ratio       = rng.uniform(0.30, 0.85, size=n)
    monthly_expenses    = monthly_income * expense_ratio
    savings             = rng.uniform(0, monthly_income * 24, size=n)
    savings_rate        = np.clip((monthly_income - monthly_expenses) / monthly_income, 0, 1)
    goal_horizon_years  = rng.integers(1, 30, size=n)
    risk_appetite_score = rng.integers(1, 6, size=n)             # 1–5

    df = pd.DataFrame({
        "age":                  age,
        "monthly_income":       monthly_income.round(2),
        "monthly_expenses":     monthly_expenses.round(2),
        "savings":              savings.round(2),
        "savings_rate":         savings_rate.round(4),
        "goal_horizon_years":   goal_horizon_years,
        "risk_appetite_score":  risk_appetite_score,
    })

    df["label"] = df.apply(_assign_label, axis=1)
    return df


def train():
    print(f"Generating {N_SAMPLES} synthetic profiles...")
    df = generate_synthetic_data(N_SAMPLES)

    print("Label distribution:")
    print(df["label"].value_counts().sort_index()
          .rename({0: "Conservative", 1: "Moderate", 2: "Aggressive"}))

    feature_cols = [
        "age", "monthly_income", "monthly_expenses",
        "savings", "savings_rate", "goal_horizon_years", "risk_appetite_score",
    ]
    X = df[feature_cols].values
    y = df["label"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=SEED, stratify=y
    )

    print("\nTraining RandomForestClassifier...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=SEED,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("\nClassification Report:")
    print(classification_report(
        y_test, y_pred,
        target_names=["Conservative", "Moderate", "Aggressive"]
    ))

    joblib.dump(model, MODEL_PATH)
    print(f"\nModel saved → {MODEL_PATH}")


if __name__ == "__main__":
    train()
