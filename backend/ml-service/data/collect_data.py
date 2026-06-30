"""
data/collect_data.py
--------------------
Standalone data collection script for Wealthio ML pipeline.

Run once from the ml-service root:
    python data/collect_data.py

Output: clean CSV files saved to the data/ folder.
These files are .gitignored -- regenerate them by running this script.
Only this script itself is committed to the repository.

Data collected here feeds Steps 3–8 of the ML pipeline.
Do NOT import this module from FastAPI or any service.
"""

from pathlib import Path
import numpy as np
import pandas as pd
import yfinance as yf

DATA_DIR = Path(__file__).resolve().parent

START_DATE = "2014-01-01"
END_DATE   = "2024-12-31"
TRADING_DAYS_PER_YEAR = 252


# -- Asset 1: Nifty 50 -- Indian Equity / Stocks proxy -------------------------

def collect_nifty50() -> pd.DataFrame:
    """
    Pull daily closing prices for ^NSEI (Nifty 50) from yfinance.

    Steps
    -----
    1. Download OHLCV data for the full date range.
    2. Keep only the 'Close' column; rename it to 'Close'.
    3. Compute Daily_Return as pct_change of Close; drop the first NaN row.
    4. Compute and print annualised return and volatility for verification.
    5. Save Date, Close, Daily_Return to data/nifty50_daily.csv.

    Returns
    -------
    pd.DataFrame with columns [Date, Close, Daily_Return]
    """
    print("\n[Asset 1] Collecting Nifty 50 (^NSEI) ...")

    raw = yf.download("^NSEI", start=START_DATE, end=END_DATE, auto_adjust=True, progress=False)

    if raw.empty:
        raise RuntimeError("yfinance returned no data for ^NSEI. Check ticker and network.")

    # Keep only closing price; flatten MultiIndex columns if present
    df = raw[["Close"]].copy()
    df.columns = ["Close"]
    df.index.name = "Date"

    # Daily return as % change (decimal, not x100)
    df["Daily_Return"] = df["Close"].pct_change()

    # Drop the first row -- it will always be NaN after pct_change
    df = df.dropna(subset=["Daily_Return"])

    # -- Summary statistics (printed for manual verification) -----------------
    ann_return = df["Daily_Return"].mean() * TRADING_DAYS_PER_YEAR
    ann_vol    = df["Daily_Return"].std()  * np.sqrt(TRADING_DAYS_PER_YEAR)
    print(f"  Rows collected  : {len(df):,}")
    print(f"  Date range      : {df.index.min().date()} -> {df.index.max().date()}")
    print(f"  Annualised return : {ann_return:.4f}  ({ann_return*100:.2f}%)")
    print(f"  Annualised volatility: {ann_vol:.4f}  ({ann_vol*100:.2f}%)")

    # -- Save -----------------------------------------------------------------
    out_path = DATA_DIR / "nifty50_daily.csv"
    df.reset_index()[["Date", "Close", "Daily_Return"]].to_csv(out_path, index=False)
    print(f"  Saved -> {out_path}")

    return df


# -- Asset 2: Gold -- converted to INR -----------------------------------------

def collect_gold() -> pd.DataFrame:
    """
    Pull Gold Futures (GC=F, USD) and USD/INR exchange rate (USDINR=X),
    multiply to produce daily Gold prices in INR, then compute returns.

    Steps
    -----
    1. Download GC=F and USDINR=X closing prices for the full date range.
    2. Join on a union of both calendars; forward-fill gaps (different trading
       calendars mean either series may be missing on any given date).
    3. Drop any rows that still have NaN after forward-fill.
    4. Compute Close_INR = Close_USD * USDINR.
    5. Compute Daily_Return from Close_INR via pct_change; drop the first row.
    6. Print annualised stats from the INR series for manual verification.
    7. Save Date, Close_USD, USDINR, Close_INR, Daily_Return to gold_daily.csv.

    Returns
    -------
    pd.DataFrame with columns [Date, Close_USD, USDINR, Close_INR, Daily_Return]
    """
    print("\n[Asset 2] Collecting Gold (GC=F x USDINR=X -> INR) ...")

    raw_gold = yf.download("GC=F",     start=START_DATE, end=END_DATE, auto_adjust=True, progress=False)
    raw_fx   = yf.download("USDINR=X", start=START_DATE, end=END_DATE, auto_adjust=True, progress=False)

    if raw_gold.empty:
        raise RuntimeError("yfinance returned no data for GC=F. Check ticker and network.")
    if raw_fx.empty:
        raise RuntimeError("yfinance returned no data for USDINR=X. Check ticker and network.")

    # Extract closing prices; flatten any MultiIndex columns
    gold_close = raw_gold[["Close"]].copy()
    gold_close.columns = ["Close_USD"]
    gold_close.index.name = "Date"

    fx_close = raw_fx[["Close"]].copy()
    fx_close.columns = ["USDINR"]
    fx_close.index.name = "Date"

    # Outer join -- keeps every date that appears in either series
    df = gold_close.join(fx_close, how="outer")

    # Forward-fill: propagate the last known value across calendar gaps
    df = df.ffill()

    # Drop any rows still NaN (typically at the very start before either series begins)
    df = df.dropna(subset=["Close_USD", "USDINR"])

    # INR price: multiply USD price by exchange rate
    df["Close_INR"] = df["Close_USD"] * df["USDINR"]

    # Daily return from INR series (decimal, not x100)
    df["Daily_Return"] = df["Close_INR"].pct_change()

    # Drop the first row -- NaN after pct_change
    df = df.dropna(subset=["Daily_Return"])

    # -- Summary statistics from INR series -----------------------------------
    ann_return = df["Daily_Return"].mean() * TRADING_DAYS_PER_YEAR
    ann_vol    = df["Daily_Return"].std()  * np.sqrt(TRADING_DAYS_PER_YEAR)
    print(f"  Rows collected  : {len(df):,}")
    print(f"  Date range      : {df.index.min().date()} -> {df.index.max().date()}")
    print(f"  Annualised return (INR) : {ann_return:.4f}  ({ann_return*100:.2f}%)")
    print(f"  Annualised volatility (INR): {ann_vol:.4f}  ({ann_vol*100:.2f}%)")

    # -- Save -----------------------------------------------------------------
    out_path = DATA_DIR / "gold_daily.csv"
    df.reset_index()[["Date", "Close_USD", "USDINR", "Close_INR", "Daily_Return"]].to_csv(out_path, index=False)
    print(f"  Saved -> {out_path}")

    return df


# -- Asset 3: ETF -- Nippon India ETF Nifty BeES (NIFTYBEES.NS) -----------------

def collect_etf() -> pd.DataFrame:
    """
    Pull daily closing prices for NIFTYBEES.NS (Nippon India ETF Nifty BeES).

    This is the most liquid Indian ETF and tracks Nifty 50 closely.
    High correlation with ^NSEI is expected and correct -- the covariance
    matrix will reflect this accurately. Do not attempt to decorrelate them;
    the MPT optimiser handles correlated assets by weighting them together.

    Steps
    -----
    1. Download OHLCV data for the full date range.
    2. Keep only the 'Close' column.
    3. Compute Daily_Return via pct_change; drop the first NaN row.
    4. Print annualised return and volatility for manual verification.
    5. Save Date, Close, Daily_Return to data/etf_daily.csv.

    Returns
    -------
    pd.DataFrame with columns [Date, Close, Daily_Return]
    """
    print("\n[Asset 3] Collecting ETF (NIFTYBEES.NS) ...")

    raw = yf.download("NIFTYBEES.NS", start=START_DATE, end=END_DATE, auto_adjust=True, progress=False)

    if raw.empty:
        raise RuntimeError("yfinance returned no data for NIFTYBEES.NS. Check ticker and network.")

    # Keep only closing price; flatten MultiIndex columns if present
    df = raw[["Close"]].copy()
    df.columns = ["Close"]
    df.index.name = "Date"

    # Daily return as % change (decimal, not x100)
    df["Daily_Return"] = df["Close"].pct_change()

    # Drop the first row -- it will always be NaN after pct_change
    df = df.dropna(subset=["Daily_Return"])

    # -- Outlier filter --------------------------------------------------------
    # NIFTYBEES.NS has a known yfinance unit-scaling glitch: two rows around
    # 2019-12-19 show the price in paisa instead of rupees, producing
    # |return| > 800%. NSE circuit breakers cap real moves at ±20%, so
    # filtering at ±25% removes only data-quality artefacts, not real events.
    outlier_mask = df["Daily_Return"].abs() > 0.25
    n_outliers = outlier_mask.sum()
    if n_outliers > 0:
        print(f"  Removed {n_outliers} outlier row(s) (|Daily_Return| > 25%):")
        print(df.loc[outlier_mask, ["Daily_Return"]].to_string())
        df = df.loc[~outlier_mask]

    # -- Summary statistics (printed for manual verification) ------------------
    ann_return = df["Daily_Return"].mean() * TRADING_DAYS_PER_YEAR
    ann_vol    = df["Daily_Return"].std()  * np.sqrt(TRADING_DAYS_PER_YEAR)
    print(f"  Rows collected  : {len(df):,}")
    print(f"  Date range      : {df.index.min().date()} -> {df.index.max().date()}")
    print(f"  Annualised return : {ann_return:.4f}  ({ann_return*100:.2f}%)")
    print(f"  Annualised volatility: {ann_vol:.4f}  ({ann_vol*100:.2f}%)")

    # -- Save -----------------------------------------------------------------
    out_path = DATA_DIR / "etf_daily.csv"
    df.reset_index()[["Date", "Close", "Daily_Return"]].to_csv(out_path, index=False)
    print(f"  Saved -> {out_path}")

    return df


# -- Asset 4: Mutual Funds via AMFI API ---------------------------------------

AMFI_API_URL = "https://api.mfapi.in/mf/{scheme_code}"

MUTUAL_FUNDS = {
    119598: "SBI Nifty Index Fund Direct Growth",
    120503: "Axis Bluechip Fund Direct Growth",
    118989: "HDFC Mid Cap Opportunities Fund Direct Growth",
}

# Composite weights for the mutual_funds asset class.
#
# Methodology note (interview-ready):
# ----------------------------------------------------------------------------
# The `mutual_funds` asset class does NOT represent a single fund.
# It is a 45 / 35 / 20 weighted blend of:
#   45% -- SBI Nifty Index Fund Direct Growth  (119598)
#          Passive index tracker; lowest cost, lowest manager risk.
#   35% -- Axis Bluechip Fund Direct Growth     (120503)
#          Active large-cap fund; consistent risk-adjusted performance.
#   20% -- HDFC Mid Cap Opportunities Fund Direct Growth (118989)
#          Satellite mid-cap allocation for growth; higher volatility,
#          kept to a minority weight to prevent it from dominating the composite.
#
# This mirrors standard "core-and-satellite" mutual fund advice in Indian
# retail investing: heavy in stable large-cap/index core, smaller growth
# satellite. Equal weighting (33/33/33) would artificially inflate the
# composite return because the mid-cap fund's 10-year outperformance would
# receive the same weight as the two large-cap funds -- a portfolio no
# moderate investor would actually hold.
# ----------------------------------------------------------------------------
MF_WEIGHTS: dict[int, float] = {
    119598: 0.45,   # SBI Nifty Index Fund  -- index core
    120503: 0.35,   # Axis Bluechip Fund    -- active large-cap core
    118989: 0.20,   # HDFC Mid Cap Fund     -- growth satellite
}


def _fetch_fund(scheme_code: int, name: str) -> pd.DataFrame:
    """
    Fetch NAV history for a single mutual fund from the AMFI API.

    Parameters
    ----------
    scheme_code : AMFI scheme code (e.g. 119598)
    name        : Human-readable fund name (used in log output only)

    Returns
    -------
    pd.DataFrame with columns [Date (DatetimeIndex), NAV, Daily_Return]
    filtered to START_DATE – END_DATE, sorted ascending.
    """
    import requests

    url = AMFI_API_URL.format(scheme_code=scheme_code)
    print(f"    Fetching {name} (scheme {scheme_code}) ...")

    resp = requests.get(url, timeout=30)
    resp.raise_for_status()

    payload = resp.json()
    records = payload.get("data", [])
    if not records:
        raise RuntimeError(f"AMFI API returned no data for scheme {scheme_code}.")

    # Build DataFrame; API returns newest-first, so sort ascending
    df = pd.DataFrame(records, columns=["date", "nav"])
    df["Date"] = pd.to_datetime(df["date"], format="%d-%m-%Y")
    df["NAV"]  = pd.to_numeric(df["nav"], errors="coerce")
    df = df[["Date", "NAV"]].sort_values("Date").reset_index(drop=True)

    # Filter to the project date range
    mask = (df["Date"] >= START_DATE) & (df["Date"] <= END_DATE)
    df = df.loc[mask].copy()

    if df.empty:
        raise RuntimeError(
            f"No data in range {START_DATE}–{END_DATE} for scheme {scheme_code}."
        )

    # Daily return as % change (decimal, not x100)
    df["Daily_Return"] = df["NAV"].pct_change()
    df = df.dropna(subset=["Daily_Return"])

    return df.set_index("Date")


def collect_mutual_funds() -> pd.DataFrame:
    """
    Fetch NAV history for three AMFI mutual funds, compute per-fund daily
    returns and annualised statistics, then build a 45/35/20 weighted
    composite return series.

    Composite methodology
    ---------------------
    The `mutual_funds` asset class is a weighted blend defined by MF_WEIGHTS:
        45% SBI Nifty Index Fund (119598)  -- passive index core
        35% Axis Bluechip Fund (120503)    -- active large-cap core
        20% HDFC Mid Cap Fund (118989)     -- growth satellite

    This reflects a realistic core-and-satellite allocation a moderate Indian
    retail investor would hold. Equal weighting (33/33/33) was deliberately
    avoided because the mid-cap fund's decade-long outperformance would
    dominate the composite at equal weight, producing an implausibly high
    blended return that no moderate-risk portfolio would actually achieve.

    Scheme codes
    ------------
    119598 -- SBI Nifty Index Fund Direct Growth
    120503 -- Axis Bluechip Fund Direct Growth
    118989 -- HDFC Mid Cap Opportunities Fund Direct Growth

    Steps
    -----
    1. Fetch each fund via AMFI REST API (https://api.mfapi.in/mf/{code}).
    2. Parse dates from DD-MM-YYYY; sort ascending; filter to 2014–2024.
    3. Compute daily NAV returns; print annualised stats per fund.
    4. Save each fund to data/mf_{scheme_code}_daily.csv.
    5. Inner-join the three Daily_Return series on Date -- only dates where
       all three funds have a value contribute to the composite.
       (Inner join prevents silent NaN contamination of the weighted sum.)
    6. Compute Wtd_Daily_Return = sum(weight_i x return_i) per row.
    7. Print composite annualised stats.
    8. Save composite to data/mutual_fund_composite_daily.csv.

    Returns
    -------
    pd.DataFrame with columns [Date, Wtd_Daily_Return]
    """
    print("\n[Asset 4] Collecting Mutual Funds (AMFI API) ...")

    return_series: dict[int, pd.Series] = {}

    for scheme_code, name in MUTUAL_FUNDS.items():
        df = _fetch_fund(scheme_code, name)

        # -- Per-fund annualised statistics ------------------------------------
        ann_return = df["Daily_Return"].mean() * TRADING_DAYS_PER_YEAR
        ann_vol    = df["Daily_Return"].std()  * np.sqrt(TRADING_DAYS_PER_YEAR)
        print(f"      Rows : {len(df):,}")
        print(f"      Range: {df.index.min().date()} -> {df.index.max().date()}")
        print(f"      Ann. return : {ann_return*100:.2f}%")
        print(f"      Ann. vol    : {ann_vol*100:.2f}%")

        # -- Save individual fund CSV ------------------------------------------
        out_path = DATA_DIR / f"mf_{scheme_code}_daily.csv"
        df.reset_index()[["Date", "NAV", "Daily_Return"]].to_csv(out_path, index=False)
        print(f"      Saved -> {out_path}")

        return_series[scheme_code] = df["Daily_Return"].rename(str(scheme_code))

    # -- Build composite: inner join ensures all three funds have a value -------
    # An outer join would introduce NaN on dates one fund was closed;
    # a weighted sum over NaN would silently mis-weight -- inner join prevents this.
    composite = pd.concat(return_series.values(), axis=1, join="inner")
    composite.index.name = "Date"

    # -- Weighted composite return (45 / 35 / 20 blend) -----------------------
    # MF_WEIGHTS maps scheme_code (int) -> weight (float); columns are str(code).
    composite["Wtd_Daily_Return"] = sum(
        composite[str(code)] * weight
        for code, weight in MF_WEIGHTS.items()
    )

    # -- Composite annualised statistics --------------------------------------
    ann_return = composite["Wtd_Daily_Return"].mean() * TRADING_DAYS_PER_YEAR
    ann_vol    = composite["Wtd_Daily_Return"].std()  * np.sqrt(TRADING_DAYS_PER_YEAR)
    print(f"\n  Composite (45% SBI Index / 35% Axis Bluechip / 20% HDFC Mid Cap):")
    print(f"  Rows        : {len(composite):,}")
    print(f"  Date range  : {composite.index.min().date()} -> {composite.index.max().date()}")
    print(f"  Ann. return : {ann_return*100:.2f}%")
    print(f"  Ann. vol    : {ann_vol*100:.2f}%")

    # -- Save composite CSV ----------------------------------------------------
    out_path = DATA_DIR / "mutual_fund_composite_daily.csv"
    composite.reset_index()[["Date", "Wtd_Daily_Return"]].to_csv(out_path, index=False)
    print(f"  Saved -> {out_path}")

    return composite.reset_index()[["Date", "Wtd_Daily_Return"]]


# -- Asset 5: Fixed Deposit -- Static Risk-Free Rate Series ----------------------

# Approximate SBI 1-year FD rates by year -- publicly available and verifiable.
# Source: SBI website historical rate announcements.
# NOTE: This file is NOT used in the covariance matrix or MPT optimisation.
#       It is used for:
#         • Displaying expected FD return on the user dashboard.
#         • Sharpe ratio calculation (FD rate = risk-free rate).
_FD_RATES = {
    2014: 9.0,
    2015: 8.5,
    2016: 7.5,
    2017: 7.0,
    2018: 6.5,
    2019: 6.5,
    2020: 5.5,
    2021: 5.5,
    2022: 6.0,
    2023: 7.0,
    2024: 6.5,
}

# Current rate used for present-day Sharpe ratio calculations.
FD_CURRENT_RATE_PCT: float = 6.5


def create_fd_rates() -> pd.DataFrame:
    """
    Write the static FD rate series to data/fd_rates.csv.

    This file is committed to the repository (it is un-ignored in .gitignore)
    since the values are fixed reference data, not derived from any live API.
    Running this function is idempotent -- it always produces the same file.

    Columns
    -------
    Year               : int  (2014 – 2024)
    Annual_Return_Pct  : float (e.g. 6.5 means 6.5% per year)
    """
    print("\n[Asset 5] Writing FD rate series (static) ...")

    df = pd.DataFrame(
        list(_FD_RATES.items()),
        columns=["Year", "Annual_Return_Pct"],
    )

    # Print for verification
    print(f"  Rows : {len(df)}  (years {df['Year'].min()} – {df['Year'].max()})")
    print(f"  Current rate (2024): {FD_CURRENT_RATE_PCT}%")
    print(f"  Average rate across period: {df['Annual_Return_Pct'].mean():.2f}%")

    out_path = DATA_DIR / "fd_rates.csv"
    df.to_csv(out_path, index=False)
    print(f"  Saved -> {out_path}  (committed to git -- static reference data)")

    return df


# -- Summary statistics file ----------------------------------------------------------

def create_asset_summary(
    nifty_df: pd.DataFrame,
    gold_df: pd.DataFrame,
    etf_df: pd.DataFrame,
    mf_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Compute a cross-asset summary statistics table read by Steps 4, 5, and 6.

    Parameters
    ----------
    nifty_df : DataFrame returned by collect_nifty50()  -- DatetimeIndex, col Daily_Return
    gold_df  : DataFrame returned by collect_gold()     -- DatetimeIndex, col Daily_Return
    etf_df   : DataFrame returned by collect_etf()      -- DatetimeIndex, col Daily_Return
    mf_df    : DataFrame returned by collect_mutual_funds() -- col Date, col Avg_Daily_Return

    Saves
    -----
    data/asset_summary.csv with columns:
        asset, annualized_return, annualized_volatility,
        data_start_date, data_end_date, trading_days

    Returns
    -------
    pd.DataFrame (the summary table)
    """
    print("\n[Summary] Computing asset_summary.csv ...")

    # Normalise each series to (name, DatetimeIndex, return_values)
    # mf_df has Date as a column (reset_index was called); others have DatetimeIndex.
    def _to_series(df: pd.DataFrame, col: str) -> pd.Series:
        """Return a Series with a DatetimeIndex regardless of input shape."""
        if isinstance(df.index, pd.DatetimeIndex):
            return df[col]
        # Date is a plain column -- set it as index
        return df.set_index("Date")[col]

    assets: list[tuple[str, pd.Series]] = [
        ("stocks",       _to_series(nifty_df, "Daily_Return")),
        ("gold",         _to_series(gold_df,  "Daily_Return")),
        ("etf",          _to_series(etf_df,   "Daily_Return")),
        ("mutual_funds", _to_series(mf_df,    "Wtd_Daily_Return")),
    ]

    rows = []
    for asset_name, ret_series in assets:
        ann_return = ret_series.mean() * TRADING_DAYS_PER_YEAR
        ann_vol    = ret_series.std()  * np.sqrt(TRADING_DAYS_PER_YEAR)
        rows.append({
            "asset":                 asset_name,
            "annualized_return":     round(ann_return, 6),
            "annualized_volatility": round(ann_vol, 6),
            "data_start_date":       ret_series.index.min().date().isoformat(),
            "data_end_date":         ret_series.index.max().date().isoformat(),
            "trading_days":          len(ret_series),
        })

    summary_df = pd.DataFrame(rows)

    # Print table for manual verification
    print()
    print(f"  {'Asset':<16} {'Ann.Return':>12} {'Ann.Vol':>10} {'Days':>6}")
    print(f"  {'-'*16} {'-'*12} {'-'*10} {'-'*6}")
    for _, row in summary_df.iterrows():
        print(
            f"  {row['asset']:<16} "
            f"{row['annualized_return']*100:>11.2f}% "
            f"{row['annualized_volatility']*100:>9.2f}% "
            f"{row['trading_days']:>6,}"
        )

    out_path = DATA_DIR / "asset_summary.csv"
    summary_df.to_csv(out_path, index=False)
    print(f"\n  Saved -> {out_path}")

    return summary_df


# -- Covariance matrix ------------------------------------------------------------

# Must match RISKY_ASSETS in services/risk_service.py exactly.
RISKY_ASSETS_ORDER = ["stocks", "gold", "mutual_funds", "etf"]


def compute_covariance_matrix(
    nifty_df: pd.DataFrame,
    gold_df: pd.DataFrame,
    etf_df: pd.DataFrame,
    mf_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Align the four daily return series by date (inner join) and compute
    the annualised 4x4 covariance matrix.

    Parameters
    ----------
    nifty_df : DataFrame with DatetimeIndex, column Daily_Return   (stocks)
    gold_df  : DataFrame with DatetimeIndex, column Daily_Return   (gold)
    etf_df   : DataFrame with DatetimeIndex, column Daily_Return   (etf)
    mf_df    : DataFrame with plain Date column, column Avg_Daily_Return (mutual_funds)

    Column order in the saved CSV
    -----------------------------
    stocks, gold, mutual_funds, etf  -- matches RISKY_ASSETS in risk_service.py.

    Saves
    -----
    data/covariance_matrix.csv

    Returns
    -------
    pd.DataFrame -- the 4x4 annualised covariance matrix
    """
    print("\n[Covariance] Computing 4x4 annualised covariance matrix ...")

    # -- Extract and rename each return series ------------------------------
    def _get_series(df: pd.DataFrame, col: str, name: str) -> pd.Series:
        """Return a named Series with a DatetimeIndex."""
        if isinstance(df.index, pd.DatetimeIndex):
            return df[col].rename(name)
        return df.set_index("Date")[col].rename(name)

    stocks       = _get_series(nifty_df, "Daily_Return",     "stocks")
    gold         = _get_series(gold_df,  "Daily_Return",     "gold")
    etf          = _get_series(etf_df,   "Daily_Return",     "etf")
    mutual_funds = _get_series(mf_df,    "Wtd_Daily_Return", "mutual_funds")

    # -- Inner join: only dates where ALL four assets have data --------------
    aligned = pd.concat([stocks, gold, mutual_funds, etf], axis=1, join="inner")
    aligned.index.name = "Date"

    print(f"  Aligned rows (common trading days) : {len(aligned):,}")
    print(f"  Date range : {aligned.index.min().date()} -> {aligned.index.max().date()}")

    # -- Enforce canonical column order ----------------------------------
    aligned = aligned[RISKY_ASSETS_ORDER]

    # -- Daily covariance matrix, then annualise --------------------------
    daily_cov = aligned.cov()
    annual_cov = daily_cov * TRADING_DAYS_PER_YEAR

    # -- Print for manual verification ---------------------------------
    print("\n  Annualised covariance matrix:")
    print(annual_cov.to_string())

    # Sanity check: diagonal entries should equal variance = vol^2
    print("\n  Implied annualised volatilities (sqrt of diagonal):")
    for asset in RISKY_ASSETS_ORDER:
        implied_vol = np.sqrt(annual_cov.loc[asset, asset])
        print(f"    {asset:<16}: {implied_vol*100:.2f}%")

    # -- Save ---------------------------------------------------------------
    out_path = DATA_DIR / "covariance_matrix.csv"
    annual_cov.to_csv(out_path)
    print(f"\n  Saved -> {out_path}")

    return annual_cov


# -- Entry point ---------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("Wealthio -- Market Data Collection")
    print(f"Period: {START_DATE} to {END_DATE}")
    print("=" * 60)

    nifty_df = collect_nifty50()
    gold_df   = collect_gold()
    etf_df    = collect_etf()
    mf_df     = collect_mutual_funds()
    create_fd_rates()
    create_asset_summary(nifty_df, gold_df, etf_df, mf_df)
    compute_covariance_matrix(nifty_df, gold_df, etf_df, mf_df)

    print("\nDone.")
