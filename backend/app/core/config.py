import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Explainable Stock Market Trend Classification"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Environment & Security
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "stock_trend_xai")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-stock-xai-key-change-in-production-123456")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Financial News APIs
    NEWS_API_KEY: str = os.getenv("NEWS_API_KEY", "")
    FINNHUB_API_KEY: str = os.getenv("FINNHUB_API_KEY", "")
    
    # ML & FinBERT
    FINBERT_MODEL_NAME: str = os.getenv("FINBERT_MODEL_NAME", "ProsusAI/finbert")
    MODEL_STORAGE_PATH: str = os.getenv("MODEL_STORAGE_PATH", "backend/saved_models")
    DEVICE: str = os.getenv("DEVICE", "cpu")  # auto-detected if cuda available
    
    # Prediction Horizon and Thresholds
    DEFAULT_HORIZON_DAYS: int = 1
    UPWARD_THRESHOLD: float = 0.005    # +0.5%
    DOWNWARD_THRESHOLD: float = -0.005  # -0.5%
    
    # Supported Stocks
    DEFAULT_SYMBOLS: List[str] = [
        "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA",
        "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS"
    ]
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]



settings = Settings()
