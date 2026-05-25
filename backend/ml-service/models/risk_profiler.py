"""
Risk Profiler Model
-------------------
Classifies a user as: Conservative (0) | Moderate (1) | Aggressive (2)

Features used:
    - age
    - monthly_income
    - monthly_expenses
    - savings                (total savings/investments so far)
    - savings_rate           (derived: (income - expenses) / income)
    - goal_horizon_years     (how many years until they need the money)
    - risk_appetite_score    (1–5 self-reported; 1=very low, 5=very high)
"""

import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

MODEL_PATH = Path(__file__).parent.parent / "artifacts" / "risk_model.pkl"

RISK_LABELS = {0: "Conservative", 1: "Moderate", 2: "Aggressive"}


def _build_feature_vector(
    age: int,
    monthly_income: float,
    monthly_expenses: float,
    savings: float,
    goal_horizon_years: int,
    risk_appetite_score: int,
) -> np.ndarray:
    """Derives savings_rate and returns the feature array."""
    savings_rate = (
        (monthly_income - monthly_expenses) / monthly_income
        if monthly_income > 0
        else 0.0
    )
    savings_rate = max(0.0, min(savings_rate, 1.0))   # clamp to [0, 1]

    return np.array([[
        age,
        monthly_income,
        monthly_expenses,
        savings,
        round(savings_rate, 4),
        goal_horizon_years,
        risk_appetite_score,
    ]])


def load_model() -> RandomForestClassifier:
    """Load trained model from disk. Raises FileNotFoundError if not trained yet."""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found at {MODEL_PATH}. "
            "Run `python training/train_risk_model.py` first."
        )
    return joblib.load(MODEL_PATH)


def predict_risk_profile(
    age: int,
    monthly_income: float,
    monthly_expenses: float,
    savings: float,
    goal_horizon_years: int,
    risk_appetite_score: int,
) -> dict:
    """
    Returns a dict with:
        - risk_class:  int (0/1/2)
        - risk_label:  str ("Conservative" / "Moderate" / "Aggressive")
        - probabilities: dict with confidence for each class
    """
    model = load_model()
    X = _build_feature_vector(
        age, monthly_income, monthly_expenses,
        savings, goal_horizon_years, risk_appetite_score
    )

    risk_class = int(model.predict(X)[0])
    proba = model.predict_proba(X)[0]

    return {
        "risk_class": risk_class,
        "risk_label": RISK_LABELS[risk_class],
        "probabilities": {
            "Conservative": round(float(proba[0]), 3),
            "Moderate":     round(float(proba[1]), 3),
            "Aggressive":   round(float(proba[2]), 3),
        },
    }
