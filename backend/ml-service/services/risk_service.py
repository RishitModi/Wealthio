"""
services/risk_service.py
------------------------
Defines per-risk-category allocation boundaries consumed by every downstream
portfolio optimisation step.

Design notes
------------
All percentages are of the **total portfolio** (not of the risky sub-portfolio).

FD (Fixed Deposit)
  The risk-free anchor.  Its allocation is a fixed constant per category and
  is subtracted first.  It never enters the optimiser.

Risky assets: stocks, gold, mutual_funds, etf
  These four assets go through MPT optimisation.  Their min/max bounds are
  expressed as % of total portfolio.  The scipy equality constraint forces
  their sum to exactly (100 % - fd_pct).

Feasibility is guaranteed for all three categories:

  CONSERVATIVE  fd=40%  risky_target=60%
    sum(min) = 5+20+15+0  = 40%  < 60%  ✓
    sum(max) = 20+35+25+10 = 90% > 60%  ✓

  MODERATE      fd=15%  risky_target=85%
    sum(min) = 20+10+25+5  = 60%  < 85%  ✓
    sum(max) = 40+25+40+15 = 120% > 85%  ✓

  AGGRESSIVE    fd=5%   risky_target=95%
    sum(min) = 35+5+25+10  = 75%  < 95%  ✓
    sum(max) = 55+15+40+20 = 130% > 95%  ✓

Optimiser wiring (Step 6)
  scipy works in decimal fractions internally:
    bounds per asset  : (min_pct / 100, max_pct / 100)
    equality constraint: sum(four risky weights) == 1 - fd_pct / 100
  Results are converted back to percentages for the API response.
"""

from __future__ import annotations

from typing import TypedDict


# ── Types ─────────────────────────────────────────────────────────────────────

class AssetBounds(TypedDict):
    min: float
    max: float


class RiskBoundaries(TypedDict):
    fd: float                     # fixed allocation, not a range
    stocks: AssetBounds
    gold: AssetBounds
    mutual_funds: AssetBounds
    etf: AssetBounds


# ── Boundary table ─────────────────────────────────────────────────────────────
# Do NOT modify these values — they are the authoritative source consumed by
# every downstream step including the MPT optimiser.
#
# All values are PERCENTAGES OF THE TOTAL PORTFOLIO.
# The optimiser equality constraint ensures the four risky assets always sum
# to exactly (100 - fd), so modifying fd implicitly changes the risky target.

_BOUNDARIES: dict[str, RiskBoundaries] = {
    "CONSERVATIVE": {
        "fd":           40.0,
        "stocks":       {"min": 5.0,  "max": 20.0},
        "gold":         {"min": 20.0, "max": 35.0},
        "mutual_funds": {"min": 15.0, "max": 25.0},
        "etf":          {"min": 0.0,  "max": 10.0},
    },
    "MODERATE": {
        "fd":           15.0,
        "stocks":       {"min": 20.0, "max": 40.0},
        "gold":         {"min": 10.0, "max": 25.0},
        "mutual_funds": {"min": 25.0, "max": 40.0},
        "etf":          {"min": 5.0,  "max": 15.0},
    },
    "AGGRESSIVE": {
        "fd":           5.0,
        "stocks":       {"min": 35.0, "max": 55.0},
        "gold":         {"min": 5.0,  "max": 15.0},
        "mutual_funds": {"min": 25.0, "max": 40.0},
        "etf":          {"min": 10.0, "max": 20.0},
    },
}

# Ordered list of the four risky assets that go through MPT optimisation.
RISKY_ASSETS: list[str] = ["stocks", "gold", "mutual_funds", "etf"]

# Valid risk category values (must match the classifier output exactly).
VALID_RISK_CATEGORIES: frozenset[str] = frozenset(_BOUNDARIES.keys())


# ── Public API ─────────────────────────────────────────────────────────────────

def get_risk_boundaries(risk_category: str) -> RiskBoundaries:
    """Return the allocation boundaries for *risk_category*.

    Parameters
    ----------
    risk_category:
        One of ``"CONSERVATIVE"``, ``"MODERATE"``, or ``"AGGRESSIVE"``
        (uppercase, matching the classifier output contract).

    Returns
    -------
    RiskBoundaries
        A dict with:
        - ``fd``           — fixed FD allocation (float, not a range).
        - ``stocks``       — ``{"min": float, "max": float}``
        - ``gold``         — ``{"min": float, "max": float}``
        - ``mutual_funds`` — ``{"min": float, "max": float}``
        - ``etf``          — ``{"min": float, "max": float}``

    Raises
    ------
    ValueError
        If *risk_category* is not one of the three valid values.
    """
    normalised = risk_category.strip().upper()
    if normalised not in _BOUNDARIES:
        raise ValueError(
            f"Unknown risk_category '{risk_category}'. "
            f"Must be one of: {sorted(VALID_RISK_CATEGORIES)}"
        )
    return _BOUNDARIES[normalised]
