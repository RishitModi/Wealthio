import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings("ignore")

# Prophet import is optional — stan binary often fails on Windows
try:
    from prophet import Prophet
    _PROPHET_AVAILABLE = True
except ImportError:
    _PROPHET_AVAILABLE = False


def find_file(relative_path: str) -> str:
    import os
    if os.path.exists(relative_path):
        return relative_path
    alt_path = os.path.join("backend/ml-service", relative_path)
    if os.path.exists(alt_path):
        return alt_path
    return relative_path


def get_latest_usdinr_rate() -> float:
    try:
        df = pd.read_csv(find_file("data/gold_daily.csv"))
        return float(df["USDINR"].iloc[-1])
    except Exception:
        return 85.386


def load_asset_history(asset: str, currency: str = "INR") -> pd.DataFrame:
    if asset == "gold":
        df = pd.read_csv(find_file("data/gold_daily.csv"))
        col = "Close_INR" if currency == "INR" else "Close_USD"
        df = df.rename(columns={"Date": "ds", col: "y"})[["ds", "y"]]
    elif asset == "nifty":
        df = pd.read_csv(find_file("data/raw/nifty50_historical.csv"))
        df = df.rename(columns={"Price": "Date"})
        df = df[df["Date"] != "Ticker"]
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
        df["Close"] = pd.to_numeric(df["Close"], errors="coerce")
        df = df.dropna(subset=["Date", "Close"]).sort_values("Date")
        df = df.rename(columns={"Date": "ds", "Close": "y"})[["ds", "y"]]
    else:
        raise ValueError(f"Unknown asset: {asset}. Use 'gold' or 'nifty'")

    df["ds"] = pd.to_datetime(df["ds"], errors="coerce")
    df["y"] = pd.to_numeric(df["y"], errors="coerce")
    df = df.dropna(subset=["ds", "y"]).sort_values("ds")
    return df


def run_prophet_forecast(df: pd.DataFrame, periods: int = 30) -> dict:
    if not _PROPHET_AVAILABLE:
        raise RuntimeError("Prophet not available")

    model = Prophet(
        daily_seasonality=False,
        yearly_seasonality=True,
        weekly_seasonality=False,
        changepoint_prior_scale=0.05,
    )
    model.fit(df)

    future   = model.make_future_dataframe(periods=periods)
    forecast = model.predict(future)

    last_actual    = float(df["y"].iloc[-1])
    last_forecast  = forecast.iloc[-1]
    predicted      = float(last_forecast["yhat"])
    predicted_low  = float(last_forecast["yhat_lower"])
    predicted_high = float(last_forecast["yhat_upper"])
    change_pct     = ((predicted - last_actual) / last_actual) * 100

    if change_pct > 3:
        signal = "BUY"
        color  = "green"
        action = "Favorable entry point"
    elif change_pct < -3:
        signal = "WAIT"
        color  = "red"
        action = "Consider waiting"
    else:
        signal = "HOLD"
        color  = "yellow"
        action = "Neutral entry point"

    direction = "rise" if change_pct > 0 else "decline"

    # Last 60 days of real historical prices
    history_points = []
    for _, row in df.tail(60).iterrows():
        history_points.append({
            "date":  row["ds"].strftime("%Y-%m-%d"),
            "price": round(float(row["y"]), 2),
        })

    # 30-day Prophet forecast with confidence bands
    forecast_points = []
    for _, row in forecast.tail(periods).iterrows():
        forecast_points.append({
            "date":  row["ds"].strftime("%Y-%m-%d"),
            "price": round(float(row["yhat"]), 2),
            "lower": round(float(row["yhat_lower"]), 2),
            "upper": round(float(row["yhat_upper"]), 2),
        })

    return {
        "signal":         signal,
        "color":          color,
        "action":         action,
        "currentPrice":   round(last_actual, 2),
        "predictedPrice": round(predicted, 2),
        "predictedLow":   round(predicted_low, 2),
        "predictedHigh":  round(predicted_high, 2),
        "changePercent":  round(change_pct, 2),
        "forecastDays":   periods,
        "message":        f"Prices expected to {direction} by {abs(round(change_pct, 1))}% over next {periods} days — {action}.",
        "modelUsed":      "Facebook Prophet",
        "dataSource":     "10 years real historical data — NSE/MCX",
        "history":        history_points,
        "forecast":       forecast_points,
    }


def _synthetic_forecast(df: pd.DataFrame, periods: int = 30) -> dict:
    """Fallback using simple linear trend when Prophet stan binary fails on Windows."""
    # Last 60 days of real historical prices
    history_points = []
    for _, row in df.tail(60).iterrows():
        history_points.append({
            "date":  row["ds"].strftime("%Y-%m-%d"),
            "price": round(float(row["y"]), 2),
        })

    last_actual = float(df["y"].iloc[-1])
    last_date = df["ds"].iloc[-1]

    # Simple linear trend over last 90 days
    recent_df = df.tail(90).copy()
    x = np.arange(len(recent_df))
    y = recent_df["y"].values
    if len(x) > 1:
        slope, intercept = np.polyfit(x, y, 1)
    else:
        slope, intercept = 0, last_actual

    forecast_points = []
    for i in range(1, periods + 1):
        future_date = last_date + pd.Timedelta(days=i)
        future_val = intercept + slope * (len(recent_df) + i - 1)
        # Add some slight random noise for realism
        noise = future_val * np.random.normal(0, 0.01)
        yhat = future_val + noise
        forecast_points.append({
            "date":  future_date.strftime("%Y-%m-%d"),
            "price": round(float(yhat), 2),
            "lower": round(float(yhat * 0.95), 2),
            "upper": round(float(yhat * 1.05), 2),
        })

    predicted = forecast_points[-1]["price"]
    change_pct = ((predicted - last_actual) / last_actual) * 100

    if change_pct > 3:
        signal, color, action = "BUY", "green", "Favorable entry point"
    elif change_pct < -3:
        signal, color, action = "WAIT", "red", "Consider waiting"
    else:
        signal, color, action = "HOLD", "yellow", "Neutral entry point"

    direction = "rise" if change_pct > 0 else "decline"

    return {
        "signal":         signal,
        "color":          color,
        "action":         action,
        "currentPrice":   round(last_actual, 2),
        "predictedPrice": round(predicted, 2),
        "predictedLow":   forecast_points[-1]["lower"],
        "predictedHigh":  forecast_points[-1]["upper"],
        "changePercent":  round(change_pct, 2),
        "forecastDays":   periods,
        "message":        f"Prices expected to {direction} by {abs(round(change_pct, 1))}% over next {periods} days — {action}.",
        "modelUsed":      "Linear Trend (Fallback)",
        "dataSource":     "10 years real historical data — NSE/MCX",
        "history":        history_points,
        "forecast":       forecast_points,
    }


def forecast_asset(asset: str, periods: int = 30) -> dict:
    """
    Attempts Prophet forecast, falls back to linear trend on ANY failure.
    Uses BaseException to catch even SystemExit from Prophet's stan subprocess.
    """
    try:
        df = load_asset_history(asset)
    except BaseException as e:
        # Can't even load data — return a minimal error
        return {
            "asset": asset.upper(),
            "signal": "UNAVAILABLE",
            "color": "gray",
            "message": f"Data load failed: {e}",
        }

    try:
        result = run_prophet_forecast(df, periods=periods)
        result["asset"] = asset.upper()
        result["currency"] = currency.upper()
        result["usdinrRate"] = get_latest_usdinr_rate()
        return result
    except BaseException as e:
        print(f"[forecast_service] Prophet failed for {asset}: {e}. Using linear trend fallback.")
        result = _synthetic_forecast(df, periods=periods)
        result["asset"] = asset.upper()
        return result
    