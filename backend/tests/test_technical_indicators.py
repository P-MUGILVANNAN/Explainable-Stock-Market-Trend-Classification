import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from app.ml.feature_engineering.technical_indicators import technical_engine

def generate_synthetic_price_data(n_days=100):
    np.random.seed(42)
    start_dt = datetime(2025, 1, 1)
    dates = [start_dt + timedelta(days=i) for i in range(n_days)]
    
    # Generate geometric Brownian motion style prices
    returns = np.random.normal(0.001, 0.02, n_days)
    close = 150.0 * np.exp(np.cumsum(returns))
    high = close * (1.0 + np.random.uniform(0.002, 0.015, n_days))
    low = close * (1.0 - np.random.uniform(0.002, 0.015, n_days))
    open_p = low + np.random.uniform(0.0, 1.0, n_days) * (high - low)
    volume = np.random.randint(1000000, 5000000, n_days)

    df = pd.DataFrame({
        "date": dates,
        "open": open_p,
        "high": high,
        "low": low,
        "close": close,
        "adjusted_close": close,
        "volume": volume
    })
    return df

def test_technical_indicator_computation():
    df = generate_synthetic_price_data(100)
    res = technical_engine.compute_all_indicators(df)
    
    # Check that warm-up NaNs are dropped and rows exist
    assert not res.empty
    assert len(res) < len(df) # warm-up rows dropped
    assert len(res) >= 40

    # Verify key indicator columns exist
    required_cols = [
        "sma_10", "sma_20", "sma_50", "ema_12", "ema_26",
        "macd", "macd_signal", "macd_hist",
        "rsi_14", "roc_10", "stoch_k", "stoch_d",
        "bb_upper", "bb_lower", "bb_bandwidth",
        "atr_14", "obv", "daily_return", "log_return"
    ]
    for col in required_cols:
        assert col in res.columns, f"Missing indicator column: {col}"
        # Assert no NaNs or Infs
        assert not res[col].isna().any(), f"NaN found in {col}"
        assert not np.isinf(res[col]).any(), f"Inf found in {col}"

    # Verify RSI is bounded between 0 and 100
    assert (res["rsi_14"] >= 0).all() and (res["rsi_14"] <= 100).all()

    # Verify Bollinger Bands Upper >= Lower
    assert (res["bb_upper"] >= res["bb_lower"]).all()

