import csv
from pathlib import Path
from typing import Dict, Any

from services.risk_service import get_risk_boundaries

# The data directory is one level up from services/, inside ml-service
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def get_current_fd_rate() -> float:
    """
    Reads data/fd_rates.csv and returns the Annual_Return_Pct value 
    for the most recent year as a decimal (e.g. 0.065 for 6.5%).
    This represents the current risk-free rate used throughout the pipeline.
    """
    latest_year = -1
    latest_rate_pct = 0.0
    
    fd_csv_path = DATA_DIR / "fd_rates.csv"
    with open(fd_csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            year = int(row["Year"])
            if year > latest_year:
                latest_year = year
                latest_rate_pct = float(row["Annual_Return_Pct"])
                
    return latest_rate_pct / 100.0


def get_fd_allocation_pct(risk_category: str) -> float:
    """
    Takes a risk_category string (CONSERVATIVE, MODERATE, AGGRESSIVE) and
    returns the fixed FD percentage for that category from risk_service.
    """
    boundaries = get_risk_boundaries(risk_category)
    return float(boundaries["fd"])


def compute_investable_split(investable_amount: float, risk_category: str) -> Dict[str, float]:
    """
    Takes the total investable_amount and risk_category, and returns exactly
    how much goes to FD vs the four risky assets for optimization.
    
    Returns:
        fd_amount: The absolute amount allocated to Fixed Deposit.
        fd_percentage: The percentage allocated to Fixed Deposit.
        risky_amount: The remaining investable amount for optimization (investable_amount - fd_amount).
        risky_percentage: The remaining percentage for optimization (100 - fd_percentage).
    """
    fd_percentage = get_fd_allocation_pct(risk_category)
    risky_percentage = 100.0 - fd_percentage
    
    # Exact floating point split, avoiding premature rounding
    fd_amount = investable_amount * (fd_percentage / 100.0)
    risky_amount = investable_amount - fd_amount
    
    return {
        "fd_amount": fd_amount,
        "fd_percentage": fd_percentage,
        "risky_amount": risky_amount,
        "risky_percentage": risky_percentage
    }


def get_fd_expected_return() -> Dict[str, Any]:
    """
    Returns a small dictionary for display purposes on the dashboard, 
    so the FD row has the same format as the optimized assets.
    """
    # Multiply by 100 to get it back as a percentage (e.g. 6.5)
    rate_pct = get_current_fd_rate() * 100.0
    
    return {
        "annual_return_pct": rate_pct,
        "description": "Fixed Deposit — guaranteed return, used as the risk-free baseline for portfolio optimization"
    }
