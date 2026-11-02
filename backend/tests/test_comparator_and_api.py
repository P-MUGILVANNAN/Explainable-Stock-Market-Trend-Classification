import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from app.main import health_check, root
from app.api.stocks import list_stocks, get_stock
from app.api.auth import login, register
from app.schemas.user import UserLogin, UserRegister
from app.ml.evaluation.comparator import research_comparator
from app.database.connection import init_db

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

def test_api_health_endpoint():
    res = health_check()
    assert res["status"] == "healthy"
    r = root()
    assert r["status"] == "ONLINE"

def test_api_stocks_list():
    stocks = list_stocks()
    assert isinstance(stocks, list)
    assert len(stocks) >= 5
    symbols = [s["symbol"] for s in stocks]
    assert "AAPL" in symbols
    assert "MSFT" in symbols

def test_api_get_single_stock():
    stock = get_stock("AAPL")
    assert stock["symbol"] == "AAPL"
    assert "company_name" in stock

def test_api_auth_login():
    req = UserLogin(email="user@stockxai.com", password="User@123456")
    res = login(req)
    assert "access_token" in res
    assert res["user"]["email"] == "user@stockxai.com"
    assert res["user"]["role"] == "user"

def test_research_comparison_engine():
    np.random.seed(42)
    dates = [datetime(2025, 1, 1) + timedelta(days=i) for i in range(110)]
    close = 150.0 + np.cumsum(np.random.normal(0.05, 1.5, 110))
    price_df = pd.DataFrame({
        "date": dates,
        "open": close,
        "high": close + 1.0,
        "low": close - 1.0,
        "close": close,
        "adjusted_close": close,
        "volume": [2000000]*110
    })

    comp = research_comparator.compare_experiments(
        symbol="AAPL",
        model_name="random_forest",
        price_df=price_df,
        sentiment_df=None,
        horizon_days=1
    )

    assert "price_only_metrics" in comp
    assert "price_news_metrics" in comp
    assert "improvement_delta" in comp
    assert "statistical_test" in comp
    assert "conclusion" in comp
    assert comp["price_only_metrics"]["accuracy"] >= 0.0

def test_predictor_execution_end_to_end():
    from app.ml.prediction.predictor import trend_predictor
    pred = trend_predictor.generate_prediction(
        symbol="AAPL",
        model_name="random_forest",
        experiment_type="price_news",
        horizon_days=1
    )
    assert pred["symbol"] == "AAPL"
    assert pred["predicted_class"] in ["UPWARD", "SIDEWAYS", "DOWNWARD"]
    assert 0.0 <= pred["confidence"] <= 1.0
    assert len(pred["probabilities"]) == 3
    assert pred["probabilities"]["UPWARD"] >= 0.0
    assert pred["probabilities"]["SIDEWAYS"] >= 0.0
    assert pred["probabilities"]["DOWNWARD"] >= 0.0
    assert "top_features" in pred
    assert isinstance(pred["top_features"], list)
    assert len(pred["top_features"]) > 0


