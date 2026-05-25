"""
routers/market.py
-----------------
Endpoints:
  GET  /api/market/stock/{ticker}          — single stock price (yfinance)
  GET  /api/market/stock/{ticker}/history  — historical closing prices
  GET  /api/market/gold-silver             — gold & silver rates
  GET  /api/market/crypto/{coin}           — single crypto price (CoinGecko)
  GET  /api/market/crypto/top              — top 10 cryptos by market cap
  GET  /api/market/stock/{symbol}/overview — company fundamentals (Alpha Vantage)
  POST /api/market/stocks/batch            — batch price fetch
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from services.market_data import (
    get_stock_price,
    get_historical_prices,
    get_gold_silver_rates,
    get_crypto_price,
    get_top_cryptos,
    get_stock_quote_av,
    get_company_overview_av,
    get_multiple_stocks,
)

router = APIRouter(prefix="/api/market", tags=["Market Data"])


# ── Stocks / ETFs (yfinance) ──────────────────────────────────────────────────

@router.get("/stock/{ticker}")
async def stock_price(ticker: str):
    """
    Fetch latest price for a ticker.
    Use NSE suffix for Indian stocks: e.g. RELIANCE.NS, TCS.NS
    Alias keys also work: nifty50, gold, silver, nifty_bees
    """
    return get_stock_price(ticker)


@router.get("/stock/{ticker}/history")
async def stock_history(
    ticker: str,
    days: int = Query(default=90, ge=7, le=365, description="Number of past days"),
):
    """Historical closing prices — useful for charting & forecasting."""
    return get_historical_prices(ticker, days=days)


@router.get("/gold-silver")
async def gold_silver():
    """Latest gold (GLD) and silver (SLV) ETF prices as market proxies."""
    return get_gold_silver_rates()


class BatchTickerRequest(BaseModel):
    tickers: list[str]


@router.post("/stocks/batch")
async def batch_stocks(req: BatchTickerRequest):
    """Fetch prices for multiple tickers in one call."""
    return get_multiple_stocks(req.tickers)


# ── Crypto (CoinGecko) ────────────────────────────────────────────────────────

@router.get("/crypto/top")
async def top_cryptos(
    currency: str = Query(default="inr", description="vs currency: inr or usd"),
    limit:    int = Query(default=10, ge=1, le=50),
):
    """Top cryptos by market cap."""
    return get_top_cryptos(vs_currency=currency, limit=limit)


@router.get("/crypto/{coin}")
async def crypto_price(
    coin:     str,
    currency: str = Query(default="inr", description="vs currency: inr or usd"),
):
    """
    Price for a specific coin.
    Supported aliases: bitcoin/btc, ethereum/eth, bnb, solana/sol, xrp, doge
    """
    return get_crypto_price(coin, vs_currency=currency)


# ── Alpha Vantage ─────────────────────────────────────────────────────────────

@router.get("/av/quote/{symbol}")
async def av_quote(symbol: str):
    """Global stock quote via Alpha Vantage. Requires ALPHA_VANTAGE_API_KEY in .env"""
    return get_stock_quote_av(symbol)


@router.get("/av/overview/{symbol}")
async def av_overview(symbol: str):
    """Company fundamentals (P/E, EPS, sector, 52-week range) via Alpha Vantage."""
    return get_company_overview_av(symbol)
