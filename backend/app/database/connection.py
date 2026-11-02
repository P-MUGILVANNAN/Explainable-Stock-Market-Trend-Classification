import logging
from pymongo import MongoClient, ASCENDING, DESCENDING
import mongomock
from app.core.config import settings
from app.core.security import get_password_hash

logger = logging.getLogger("app.database")

_client = None
_db = None
_is_mock = False

def init_db():
    global _client, _db, _is_mock
    import os
    uri = settings.MONGODB_URI
    if "mongodb+srv://" in uri or os.getenv("USE_REAL_MONGO", "0") == "1":
        try:
            real_client = MongoClient(uri, serverSelectionTimeoutMS=1500)
            real_client.admin.command('ping')
            _client = real_client
            _db = _client[settings.DATABASE_NAME]
            _is_mock = False
            logger.info(f"Connected to live MongoDB database.")
            _setup_indexes(_db)
            _seed_initial_data(_db)
            return _db
        except Exception as e:
            logger.warning(f"Could not connect to live MongoDB ({e}). Using mongomock.")

    _client = mongomock.MongoClient()
    _db = _client[settings.DATABASE_NAME]
    _is_mock = True
    _setup_indexes(_db)
    _seed_initial_data(_db)
    return _db

def get_db():
    global _db
    if _db is None:
        init_db()
    return _db

def is_database_mock() -> bool:
    global _is_mock
    return _is_mock

def _setup_indexes(db):
    try:
        # Users
        db.users.create_index([("email", ASCENDING)], unique=True)
        # Stocks
        db.stocks.create_index([("symbol", ASCENDING)], unique=True)
        # Stock prices
        db.stock_prices.create_index([("symbol", ASCENDING), ("date", ASCENDING)], unique=True)
        # Financial news
        db.financial_news.create_index([("symbol", ASCENDING), ("published_at", DESCENDING)])
        db.financial_news.create_index([("url", ASCENDING)], unique=True, sparse=True)
        # Daily sentiment
        db.daily_sentiment.create_index([("symbol", ASCENDING), ("date", ASCENDING)], unique=True)
        # Predictions
        db.predictions.create_index([("symbol", ASCENDING), ("prediction_date", DESCENDING)])
        db.predictions.create_index([("user_id", ASCENDING)])
        # Model registry
        db.model_registry.create_index([("model_name", ASCENDING), ("experiment_type", ASCENDING)])
        # Training history
        db.training_history.create_index([("training_started", DESCENDING)])
    except Exception as e:
        logger.warning(f"Index creation note: {e}")

def _seed_initial_data(db):
    # Seed Admin User if not exists
    admin = db.users.find_one({"email": "admin@stockxai.com"})
    if not admin:
        db.users.insert_one({
            "name": "System Administrator",
            "email": "admin@stockxai.com",
            "password_hash": get_password_hash("Admin@123456"),
            "role": "admin",
            "created_at": "2026-01-01T00:00:00Z"
        })
        logger.info("Seeded default admin user: admin@stockxai.com")

    # Seed Demo User
    demo_user = db.users.find_one({"email": "user@stockxai.com"})
    if not demo_user:
        db.users.insert_one({
            "name": "Research Analyst",
            "email": "user@stockxai.com",
            "password_hash": get_password_hash("User@123456"),
            "role": "user",
            "created_at": "2026-01-01T00:00:00Z"
        })
        logger.info("Seeded default demo user: user@stockxai.com")

    # Seed default stocks
    initial_stocks = [
        {"symbol": "AAPL", "company_name": "Apple Inc.", "exchange": "NASDAQ"},
        {"symbol": "MSFT", "company_name": "Microsoft Corporation", "exchange": "NASDAQ"},
        {"symbol": "GOOGL", "company_name": "Alphabet Inc.", "exchange": "NASDAQ"},
        {"symbol": "AMZN", "company_name": "Amazon.com Inc.", "exchange": "NASDAQ"},
        {"symbol": "TSLA", "company_name": "Tesla, Inc.", "exchange": "NASDAQ"},
        {"symbol": "NVDA", "company_name": "NVIDIA Corporation", "exchange": "NASDAQ"},
        {"symbol": "RELIANCE.NS", "company_name": "Reliance Industries Limited", "exchange": "NSE"},
        {"symbol": "TCS.NS", "company_name": "Tata Consultancy Services Limited", "exchange": "NSE"},
        {"symbol": "INFY.NS", "company_name": "Infosys Limited", "exchange": "NSE"},
        {"symbol": "HDFCBANK.NS", "company_name": "HDFC Bank Limited", "exchange": "NSE"},
    ]
    for s in initial_stocks:
        if not db.stocks.find_one({"symbol": s["symbol"]}):
            db.stocks.insert_one({**s, "created_at": "2026-01-01T00:00:00Z"})
