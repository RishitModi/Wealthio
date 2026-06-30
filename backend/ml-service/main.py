from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import risk, market, forecast, portfolio

app = FastAPI(
    title="Wealthio ML Service",
    description="AI-powered investment recommendation & market data API",
    version="1.0.0",
)

# ── CORS (allow Spring Boot backend + React frontend) ────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
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


# ── Run directly ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    from config import get_settings
    settings = get_settings()
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
    