from fastapi import FastAPI

app = FastAPI(title="Wealthio ML Service")


@app.get("/")
async def root():
    return {"status": "ok"}

