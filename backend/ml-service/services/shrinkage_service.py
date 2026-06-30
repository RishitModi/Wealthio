"""
services/shrinkage_service.py
------------------------------
Applies James-Stein shrinkage to the four risky assets' raw annualised
expected returns before they are passed to the MPT optimiser in Step 6.

Why shrinkage?
--------------
Raw historical mean returns are noisy estimates. Small estimation errors
get amplified by mean-variance optimisation — the so-called "error
maximisation" problem — producing extreme, unstable allocations that
over-concentrate in whichever asset had the highest recent return.

James-Stein shrinkage addresses this by pulling each asset's individual
return estimate partway toward the grand mean return across all assets.
This reduces the sensitivity of the optimiser to any single asset's
estimation noise while preserving the relative ranking signal.

Formula:
    shrunk_return[i] = (alpha * grand_mean) + ((1 - alpha) * raw_return[i])

where alpha is the shrinkage_factor in [0, 1].

Shrinkage factor choice (alpha = 0.3):
---------------------------------------
- alpha = 0.0: no shrinkage, raw historical returns used unchanged.
  Maximally sensitive to estimation noise; unstable allocations.
- alpha = 1.0: complete shrinkage, every asset gets the grand mean.
  All individual asset signal is discarded; allocation becomes trivial.
- alpha = 0.3: moderate shrinkage. Preserves ~70% of the individual
  asset signal (the dominant, reliable component) while pulling 30%
  toward the grand mean (reducing the impact of outliers). This value
  is widely used in practice and is defensible as a prior-weakly-
  informative regularisation choice for four-asset portfolios with
  10 years of data.
"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Dict

from services.risk_service import RISKY_ASSETS

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Shrinkage factor (alpha). See module docstring for justification.
DEFAULT_SHRINKAGE_FACTOR: float = 0.3


# -- Internal building blocks -------------------------------------------------

def load_raw_returns() -> Dict[str, float]:
    """
    Read data/asset_summary.csv and return the raw annualised return for
    each of the four risky assets, in the canonical order defined by
    RISKY_ASSETS in risk_service.py.

    Returns
    -------
    dict mapping asset name -> raw annualised return (decimal, e.g. 0.1382)
    Guaranteed to contain exactly the four keys in RISKY_ASSETS order.
    """
    path = DATA_DIR / "asset_summary.csv"
    raw: Dict[str, float] = {}

    with open(path, mode="r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            asset = row["asset"]
            if asset in RISKY_ASSETS:
                raw[asset] = float(row["annualized_return"])

    if set(raw.keys()) != set(RISKY_ASSETS):
        missing = set(RISKY_ASSETS) - set(raw.keys())
        raise RuntimeError(
            f"asset_summary.csv is missing entries for: {missing}. "
            "Re-run data/collect_data.py to regenerate the file."
        )

    # Return in the canonical RISKY_ASSETS order so downstream code
    # can rely on dict insertion order (Python 3.7+).
    return {asset: raw[asset] for asset in RISKY_ASSETS}


def compute_grand_mean(raw_returns: Dict[str, float]) -> float:
    """
    Compute the simple arithmetic mean of the four raw annualised returns.

    Parameters
    ----------
    raw_returns:
        Dictionary mapping asset name -> raw annualised return (decimal).

    Returns
    -------
    float: the grand mean return across all assets.
    """
    values = list(raw_returns.values())
    return sum(values) / len(values)


def apply_shrinkage(
    raw_returns: Dict[str, float],
    shrinkage_factor: float = DEFAULT_SHRINKAGE_FACTOR,
) -> Dict[str, float]:
    """
    Apply James-Stein shrinkage to each asset's raw return.

    Formula:
        shrunk[i] = (alpha * grand_mean) + ((1 - alpha) * raw[i])

    Parameters
    ----------
    raw_returns:
        Dict mapping asset name -> raw annualised return (decimal).
    shrinkage_factor:
        Alpha in [0, 1]. Defaults to DEFAULT_SHRINKAGE_FACTOR (0.3).

    Returns
    -------
    Dict with the same keys as raw_returns, values replaced by shrunk returns.
    """
    if not (0.0 <= shrinkage_factor <= 1.0):
        raise ValueError(
            f"shrinkage_factor must be in [0, 1], got {shrinkage_factor}"
        )

    grand_mean = compute_grand_mean(raw_returns)

    return {
        asset: (shrinkage_factor * grand_mean) + ((1.0 - shrinkage_factor) * raw_ret)
        for asset, raw_ret in raw_returns.items()
    }


# -- Public entry point -------------------------------------------------------

def get_shrunk_returns(
    shrinkage_factor: float = DEFAULT_SHRINKAGE_FACTOR,
) -> Dict[str, float]:
    """
    Main entry point for Step 6. Loads raw returns from asset_summary.csv
    and applies James-Stein shrinkage with the given factor.

    Parameters
    ----------
    shrinkage_factor:
        Alpha in [0, 1]. Defaults to 0.3 (see module docstring for rationale).

    Returns
    -------
    Dict mapping asset name -> shrunk annualised return (decimal),
    in RISKY_ASSETS canonical order: stocks, gold, mutual_funds, etf.
    """
    raw = load_raw_returns()
    return apply_shrinkage(raw, shrinkage_factor)
