from fastapi import APIRouter, Query
from services.forecast_service import forecast_asset

router = APIRouter(prefix="/api/market", tags=["Forecasting"])


@router.get("/forecast")
async def get_forecast(
    asset:   str = Query(..., description="Asset to forecast: gold or nifty"),
    periods: int = Query(default=30, ge=7, le=90,
                         description="Forecast horizon in days")
):
    """
    30-day price forecast using Facebook Prophet.
    Returns Buy/Hold/Wait signal with confidence intervals.
    Built on 10 years of real NSE and MCX historical data.
    """
    return forecast_asset(asset.lower(), periods=periods)
