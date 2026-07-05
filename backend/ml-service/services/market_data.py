"""
market_data.py
--------------
Utility functions to fetch live financial data from:
  1. yfinance         — stocks, ETFs, gold/silver (via GLD, SLV tickers)
  2. CoinGecko API    — crypto prices (no key needed for free tier)
  3. Alpha Vantage    — stocks + mutual fund NAV fallback

All functions return plain dicts so they are JSON-serialisable.
"""

import os
import requests
import yfinance as yf
from datetime import datetime, timedelta
from typing import Optional
from concurrent.futures import ThreadPoolExecutor
from config import get_settings

settings = get_settings()


# ─────────────────────────────────────────────
# 1. YFINANCE — Stocks / ETFs / Gold / Silver
# ─────────────────────────────────────────────

# Common Indian & global tickers for reference
TICKER_MAP = {
    # Indian indices / ETFs (NSE)
    "nifty50":     "^NSEI",
    "sensex":      "^BSESN",
    "nifty_bank":  "^NSEBANK",
    # Gold & Silver ETFs (US proxies — good for trend)
    "gold":        "GLD",
    "silver":      "SLV",
    # Popular Indian mutual fund proxies (ETFs)
    "nifty_bees":  "NIFTYBEES.NS",
    "gold_bees":   "GOLDBEES.NS",
    # Crypto (via yfinance as fallback)
    "bitcoin":     "BTC-USD",
    "ethereum":    "ETH-USD",
}


def get_stock_price(ticker: str) -> dict:
    """
    Fetch latest price for any yfinance ticker.
    ticker can be a raw ticker like 'RELIANCE.NS' or a key from TICKER_MAP.
    """
    resolved = TICKER_MAP.get(ticker.lower(), ticker)
    try:
        t = yf.Ticker(resolved)
        info = t.fast_info
        last_price = float(info.last_price)
        prev_close = float(info.previous_close) if info.previous_close else last_price
        change = last_price - prev_close
        change_pct = (change / prev_close * 100) if prev_close else 0.0

        return {
            "ticker":        resolved,
            "alias":         ticker,
            "current_price": round(last_price, 2),
            "change":        round(change, 2),
            "change_%":      round(change_pct, 2),
            "currency":      info.currency,
            "exchange":      info.exchange,
            "fetched_at":    datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {"error": str(e), "ticker": resolved}


def get_historical_prices(ticker: str, days: int = 90) -> dict:
    """
    Returns closing prices for the last `days` days.
    Useful for the market forecasting module later.
    """
    resolved = TICKER_MAP.get(ticker.lower(), ticker)
    end   = datetime.today()
    start = end - timedelta(days=days)
    try:
        df = yf.download(resolved, start=start, end=end, progress=False, auto_adjust=True)
        if df.empty:
            return {"error": "No data returned", "ticker": resolved}

        prices = [
            {"date": str(idx.date()), "close": round(float(row["Close"]), 2)}
            for idx, row in df.iterrows()
        ]
        return {
            "ticker":     resolved,
            "alias":      ticker,
            "days":       days,
            "data":       prices,
            "fetched_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {"error": str(e), "ticker": resolved}


def get_gold_silver_rates() -> dict:
    """Fetch latest gold (GLD) and silver (SLV) ETF prices as price proxies."""
    gold   = get_stock_price("gold")
    silver = get_stock_price("silver")
    return {
        "gold":       gold,
        "silver":     silver,
        "note":       "Prices are GLD/SLV ETF USD values. Multiply by ~0.1 oz factor for spot approximation.",
        "fetched_at": datetime.utcnow().isoformat(),
    }


def get_multiple_stocks(tickers: list[str]) -> dict:
    """Batch fetch prices for a list of tickers concurrently."""
    results = {}
    with ThreadPoolExecutor(max_workers=10) as executor:
        for t, price_data in zip(tickers, executor.map(get_stock_price, tickers)):
            results[t] = price_data
    return {"results": results, "fetched_at": datetime.utcnow().isoformat()}


# ─────────────────────────────────────────────
# 2. COINGECKO — Crypto Prices
# ─────────────────────────────────────────────

COINGECKO_BASE = "https://api.coingecko.com/api/v3"

CRYPTO_ID_MAP = {
    "bitcoin":  "bitcoin",
    "btc":      "bitcoin",
    "ethereum": "ethereum",
    "eth":      "ethereum",
    "bnb":      "binancecoin",
    "solana":   "solana",
    "sol":      "solana",
    "xrp":      "ripple",
    "usdt":     "tether",
    "dogecoin": "dogecoin",
    "doge":     "dogecoin",
}


def _coingecko_headers() -> dict:
    headers = {"accept": "application/json"}
    if settings.coingecko_api_key:
        headers["x-cg-pro-api-key"] = settings.coingecko_api_key
    return headers


def get_crypto_price(coin: str, vs_currency: str = "inr") -> dict:
    """
    Fetch current price of a crypto coin.
    coin: name or alias from CRYPTO_ID_MAP, or a raw CoinGecko id.
    vs_currency: 'inr' (default) or 'usd'
    """
    coin_id = CRYPTO_ID_MAP.get(coin.lower(), coin.lower())
    url = f"{COINGECKO_BASE}/simple/price"
    params = {
        "ids":                coin_id,
        "vs_currencies":      vs_currency,
        "include_24hr_change": "true",
        "include_market_cap":  "true",
    }
    try:
        resp = requests.get(url, params=params, headers=_coingecko_headers(), timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if coin_id not in data:
            return {"error": f"Coin '{coin_id}' not found on CoinGecko"}

        coin_data = data[coin_id]
        return {
            "coin":          coin_id,
            "alias":         coin,
            "currency":      vs_currency.upper(),
            "price":         coin_data.get(vs_currency),
            "change_24h_%":  round(coin_data.get(f"{vs_currency}_24h_change", 0), 2),
            "market_cap":    coin_data.get(f"{vs_currency}_market_cap"),
            "fetched_at":    datetime.utcnow().isoformat(),
        }
    except requests.RequestException as e:
        return {"error": str(e), "coin": coin_id}


def get_top_cryptos(vs_currency: str = "inr", limit: int = 10) -> dict:
    """Fetch top N coins by market cap."""
    url = f"{COINGECKO_BASE}/coins/markets"
    params = {
        "vs_currency":  vs_currency,
        "order":        "market_cap_desc",
        "per_page":     limit,
        "page":         1,
        "sparkline":    False,
    }
    try:
        resp = requests.get(url, params=params, headers=_coingecko_headers(), timeout=10)
        resp.raise_for_status()
        coins = resp.json()
        return {
            "currency":   vs_currency.upper(),
            "coins": [
                {
                    "rank":         c["market_cap_rank"],
                    "id":           c["id"],
                    "symbol":       c["symbol"].upper(),
                    "name":         c["name"],
                    "price":        c["current_price"],
                    "change_24h_%": round(c.get("price_change_percentage_24h") or 0, 2),
                    "market_cap":   c["market_cap"],
                }
                for c in coins
            ],
            "fetched_at": datetime.utcnow().isoformat(),
        }
    except requests.RequestException as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────
# 3. ALPHA VANTAGE — Stocks & Overview
# ─────────────────────────────────────────────

AV_BASE = "https://www.alphavantage.co/query"


def _av_params(function: str, **kwargs) -> dict:
    return {
        "function": function,
        "apikey":   settings.alpha_vantage_api_key,
        **kwargs,
    }


def get_stock_quote_av(symbol: str) -> dict:
    """
    Global quote for a stock symbol via Alpha Vantage.
    Good for US stocks. For Indian stocks use yfinance (NSE suffix).
    """
    if not settings.alpha_vantage_api_key:
        return {"error": "ALPHA_VANTAGE_API_KEY not set in .env"}
    try:
        params = _av_params("GLOBAL_QUOTE", symbol=symbol)
        resp = requests.get(AV_BASE, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json().get("Global Quote", {})
        if not data:
            return {"error": "No data returned. Check symbol or API key quota."}
        return {
            "symbol":        data.get("01. symbol"),
            "price":         float(data.get("05. price", 0)),
            "change":        float(data.get("09. change", 0)),
            "change_%":      float(data.get("10. change percent", "0%").replace("%", "")),
            "volume":        int(data.get("06. volume", 0)),
            "latest_day":    data.get("07. latest trading day"),
            "fetched_at":    datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {"error": str(e)}


def get_company_overview_av(symbol: str) -> dict:
    """Fetch company fundamentals — sector, P/E, EPS, market cap etc."""
    if not settings.alpha_vantage_api_key:
        return {"error": "ALPHA_VANTAGE_API_KEY not set in .env"}
    try:
        params = _av_params("OVERVIEW", symbol=symbol)
        resp = requests.get(AV_BASE, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if "Symbol" not in data:
            return {"error": "No overview data. Check symbol or quota."}
        return {
            "symbol":      data.get("Symbol"),
            "name":        data.get("Name"),
            "sector":      data.get("Sector"),
            "industry":    data.get("Industry"),
            "market_cap":  data.get("MarketCapitalization"),
            "pe_ratio":    data.get("PERatio"),
            "eps":         data.get("EPS"),
            "52wk_high":   data.get("52WeekHigh"),
            "52wk_low":    data.get("52WeekLow"),
            "fetched_at":  datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {"error": str(e)}
