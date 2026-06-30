import pandas as pd
import numpy as np
from prophet import Prophet
import warnings
warnings.filterwarnings("ignore")


def load_asset_history(asset: str) -> pd.DataFrame:
    if asset == "gold":
        df = pd.read_csv("data/raw/gold_historical.csv")
    elif asset == "nifty":
        df = pd.read_csv("data/raw/nifty50_historical.csv")
    else:
        raise ValueError(f"Unknown asset: {asset}. Use 'gold' or 'nifty'")

    df = df.rename(columns={"Price": "Date"})
    df = df[df["Date"] != "Ticker"]
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df["Close"] = pd.to_numeric(df["Close"], errors="coerce")
    df = df.dropna(subset=["Date", "Close"]).sort_values("Date")
    return df.rename(columns={"Date": "ds", "Close": "y"})[["ds", "y"]]


def run_prophet_forecast(df: pd.DataFrame, periods: int = 30) -> dict:
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


def forecast_asset(asset: str, periods: int = 30) -> dict:
    try:
        df     = load_asset_history(asset)
        result = run_prophet_forecast(df, periods=periods)
        result["asset"] = asset.upper()
        return result
    except Exception as e:
        return {
            "asset":   asset.upper(),
            "signal":  "UNAVAILABLE",
            "color":   "gray",
            "message": f"Forecast unavailable: {str(e)}",
            "error":   str(e),
        }
    