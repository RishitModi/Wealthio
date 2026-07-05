import asyncio
import time
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import risk, market, forecast, portfolio

app = FastAPI(
    title="Wealthio ML Service",
    description="AI-powered investment recommendation & market data API",
    version="1.0.0",
)

import os

# Get allowed origins from environment, fallback to localhost defaults
allowed_origins_env = os.environ.get("CORS_ALLOWED_ORIGINS", "")
if allowed_origins_env:
    origins = [origin.strip() for origin in allowed_origins_env.split(",")]
else:
    origins = [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "https://wealthio-backend.onrender.com",
    ]

# ── CORS (allow Spring Boot backend + React frontend) ────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(risk.router)
app.include_router(market.router)
app.include_router(forecast.router)
app.include_router(portfolio.router)


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "service": "Wealthio ML Service", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}


# ── Background Data Scheduler & Sync Pipeline ──────────────────────────────────

_LAST_SYNC_METRICS = {
    "status": "NOT_RUN",
    "last_sync_time": None,
    "duration_seconds": None,
    "error": None
}

def is_data_stale() -> bool:
    required_files = [
        "nifty50_daily.csv",
        "gold_daily.csv",
        "etf_daily.csv",
        "mutual_fund_composite_daily.csv",
        "covariance_matrix.csv"
    ]
    data_dir = Path(__file__).resolve().parent / "data"
    for filename in required_files:
        filepath = data_dir / filename
        if not filepath.exists():
            return True
        
        # If file is older than 24 hours, count it as stale
        mtime = filepath.stat().st_mtime
        age_hours = (time.time() - mtime) / 3600
        if age_hours > 24:
            return True
    return False

def get_seconds_until_0200_ist() -> float:
    now = datetime.now()
    target = now.replace(hour=2, minute=0, second=0, microsecond=0)
    if now >= target:
        target += timedelta(days=1)
    return (target - now).total_seconds()

def sync_pipeline_worker():
    global _LAST_SYNC_METRICS
    start_time = time.time()
    _LAST_SYNC_METRICS["status"] = "RUNNING"
    print("[Background Scheduler] Running daily data sync pipeline...")
    try:
        from data.collect_data import run_collection_pipeline
        from services.optimizer_service import reload_optimizer_cache
        from services.forecast_service import precalculate_forecasts
        
        # Run sync pipeline using temp files
        run_collection_pipeline(use_temp_files=True)
        
        # Reload cache variables
        reload_optimizer_cache()
        precalculate_forecasts()
        
        _LAST_SYNC_METRICS.update({
            "status": "SUCCESS",
            "last_sync_time": datetime.now().isoformat(),
            "duration_seconds": round(time.time() - start_time, 2),
            "error": None
        })
        print("[Background Scheduler] Daily data sync pipeline completed successfully.")
    except Exception as e:
        print(f"[Background Scheduler] Error running daily sync: {e}")
        _LAST_SYNC_METRICS.update({
            "status": "FAILED",
            "last_sync_time": datetime.now().isoformat(),
            "duration_seconds": round(time.time() - start_time, 2),
            "error": str(e)
        })

async def start_background_scheduler():
    loop = asyncio.get_running_loop()
    
    # Pre-cache immediately on startup using existing disk CSVs
    try:
        from services.optimizer_service import reload_optimizer_cache
        from services.forecast_service import precalculate_forecasts
        reload_optimizer_cache()
        precalculate_forecasts()
    except Exception as e:
        print(f"[Background Scheduler] Failed to load initial caches on startup: {e}")
        
    # If files are stale/missing, run sync immediately
    if is_data_stale():
        print("[Background Scheduler] CSV files are stale/missing. Running startup sync...")
        with ThreadPoolExecutor() as pool:
            await loop.run_in_executor(pool, sync_pipeline_worker)
    else:
        print("[Background Scheduler] Cached CSV files are fresh. Startup sync skipped.")
        
    while True:
        sleep_secs = get_seconds_until_0200_ist()
        print(f"[Background Scheduler] Next sync scheduled in {round(sleep_secs/3600, 2)} hours (at 02:00 IST).")
        await asyncio.sleep(sleep_secs)
        
        print("[Background Scheduler] Triggering scheduled daily sync...")
        with ThreadPoolExecutor() as pool:
            await loop.run_in_executor(pool, sync_pipeline_worker)


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(start_background_scheduler())


@app.get("/api/ml/health/data", tags=["Health"])
async def data_health():
    required_files = [
        "nifty50_daily.csv",
        "gold_daily.csv",
        "etf_daily.csv",
        "mutual_fund_composite_daily.csv",
        "covariance_matrix.csv"
    ]
    data_dir = Path(__file__).resolve().parent / "data"
    
    file_statuses = {}
    all_fresh = True
    
    for filename in required_files:
        path = data_dir / filename
        exists = path.exists()
        if exists:
            mtime = datetime.fromtimestamp(path.stat().st_mtime).isoformat()
            age_hours = (time.time() - path.stat().st_mtime) / 3600
            fresh = age_hours <= 24
            if not fresh:
                all_fresh = False
            file_statuses[filename] = {"exists": True, "last_modified": mtime, "fresh": fresh}
        else:
            all_fresh = False
            file_statuses[filename] = {"exists": False}
            
    from services.optimizer_service import _COVARIANCE_MATRIX_CACHE
    from services.forecast_service import _FORECAST_CACHE
    
    return {
        "status": "HEALTHY" if (all_fresh and _LAST_SYNC_METRICS["status"] != "FAILED") else "DEGRADED",
        "last_sync": _LAST_SYNC_METRICS,
        "files": file_statuses,
        "cache": {
            "covariance_matrix_loaded": _COVARIANCE_MATRIX_CACHE is not None,
            "forecast_keys_cached": [str(k) for k in _FORECAST_CACHE.keys()]
        }
    }


# ── Run directly ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    from config import get_settings
    settings = get_settings()
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
    