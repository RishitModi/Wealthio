from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    alpha_vantage_api_key: str = ""
    coingecko_api_key: str = ""
    port: int = 8000
    spring_backend_url: str = "http://localhost:8080"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
