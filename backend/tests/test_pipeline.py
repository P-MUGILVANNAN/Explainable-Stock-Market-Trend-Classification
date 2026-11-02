import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from app.ml.feature_engineering.target_generator import target_generator
from app.ml.feature_engineering.pipeline import feature_pipeline, PRICE_ONLY_FEATURES

def create_sample_price_df(n=120):
    start = datetime(2025, 1, 1)
    dates = [start + timedelta(days=i) for i in range(n)]
    close = [100.0 + i*0.2 + np.sin(i)*2 for i in range(n)]
    high = [c + 1.5 for c in close]
    low = [c - 1.5 for c in close]
    open_p = close
    vol = [1000000] * n
    return pd.DataFrame({
        "date": dates,
        "open": open_p,
        "high": high,
        "low": low,
        "close": close,
        "adjusted_close": close,
        "volume": vol
    })

def test_target_generation_no_leakage():
    df = create_sample_price_df(100)
    horizon = 3
    features_df, y, returns = target_generator.generate_targets(df, horizon_days=horizon)

    # Must have excluded exactly the last horizon rows
    assert len(features_df) == len(df) - horizon
    assert len(y) == len(features_df)
    assert len(returns) == len(features_df)

    # Target values must strictly be 0, 1, or 2
    assert set(y.unique()).issubset({0, 1, 2})

def test_chronological_split_strict_ordering():
    df = create_sample_price_df(120)
    features_df, y, returns = feature_pipeline.prepare_dataset(df, horizon_days=1)

    split = feature_pipeline.chronological_split(
        X_df=features_df,
        y=y,
        feature_cols=PRICE_ONLY_FEATURES,
        test_ratio=0.20,
        val_ratio=0.10
    )

    # Ensure max train date < min val date < min test date (chronological invariant)
    max_train_date = split["dates_train"][-1]
    min_val_date = split["dates_val"][0]
    max_val_date = split["dates_val"][-1]
    min_test_date = split["dates_test"][0]

    assert max_train_date < min_val_date, "Leakage violation: train dates overlap with validation!"
    assert max_val_date < min_test_date, "Leakage violation: validation dates overlap with test!"

    # Scaler must have been fitted on train only
    assert split["scaler"].mean_ is not None
    assert split["X_train"].shape[1] == len(PRICE_ONLY_FEATURES)

