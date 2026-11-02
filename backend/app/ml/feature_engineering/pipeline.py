import logging
from typing import Tuple, List, Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from app.ml.feature_engineering.technical_indicators import technical_engine
from app.ml.feature_engineering.target_generator import target_generator

logger = logging.getLogger("app.ml.pipeline")

PRICE_ONLY_FEATURES = [
    "open", "high", "low", "close", "volume",
    "sma_10", "sma_20", "sma_50", "ema_12", "ema_26",
    "macd", "macd_signal", "macd_hist",
    "rsi_14", "roc_10", "stoch_k", "stoch_d",
    "bb_upper", "bb_lower", "bb_bandwidth", "bb_percent_b",
    "rolling_std_20", "atr_14", "obv", "volume_sma_20", "volume_ratio",
    "daily_return", "log_return", "high_low_range", "open_close_diff",
    "price_momentum_5", "lagged_return_1", "lagged_return_2"
]

NEWS_FEATURES = [
    "positive_score", "negative_score", "neutral_score",
    "net_sentiment", "weighted_sentiment", "sentiment_volatility",
    "sentiment_momentum", "pos_neg_ratio", "article_count",
    "sentiment_confidence", "news_available"
]

PRICE_NEWS_FEATURES = PRICE_ONLY_FEATURES + NEWS_FEATURES

class FeaturePipeline:
    """
    Unified, leakage-free feature engineering and chronological splitting pipeline.
    """

    def prepare_dataset(
        self,
        price_df: pd.DataFrame,
        sentiment_df: Optional[pd.DataFrame] = None,
        horizon_days: int = 1,
        upward_thresh: float = 0.005,
        downward_thresh: float = -0.005
    ) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
        """
        Calculates technical indicators, aligns sentiment, computes 3-class target.
        """
        # 1. Compute technical indicators
        tech_df = technical_engine.compute_all_indicators(price_df)
        if tech_df.empty:
            raise ValueError("Insufficient price data to compute technical indicators.")

        # Ensure date string column for join
        tech_df["date_str"] = pd.to_datetime(tech_df["date"]).dt.strftime("%Y-%m-%d")

        # 2. Merge daily sentiment if provided
        if sentiment_df is not None and not sentiment_df.empty:
            sent = sentiment_df.copy()
            sent["date_str"] = pd.to_datetime(sent["date"]).dt.strftime("%Y-%m-%d")
            # Select only sentiment feature columns
            keep_sent_cols = ["date_str"] + [c for c in NEWS_FEATURES if c in sent.columns]
            merged = pd.merge(tech_df, sent[keep_sent_cols], on="date_str", how="left")
        else:
            merged = tech_df.copy()

        # Fill missing news with explicit 0 news availability
        for col in NEWS_FEATURES:
            if col not in merged.columns:
                merged[col] = 0.0
            else:
                merged[col] = merged[col].fillna(0.0)

        # 3. Generate future targets
        features_df, y, returns = target_generator.generate_targets(
            merged,
            horizon_days=horizon_days,
            upward_thresh=upward_thresh,
            downward_thresh=downward_thresh
        )

        return features_df, y, returns

    def chronological_split(
        self,
        X_df: pd.DataFrame,
        y: pd.Series,
        feature_cols: List[str],
        test_ratio: float = 0.20,
        val_ratio: float = 0.10
    ) -> Dict[str, Any]:
        """
        Chronological train, validation, and test split.
        NEVER shuffles or uses future data in training.
        Fits StandardScaler strictly on training set.
        """
        n = len(X_df)
        n_test = int(n * test_ratio)
        n_val = int(n * val_ratio)
        n_train = n - n_val - n_test

        if n_train < 30:
            raise ValueError(f"Insufficient training samples ({n_train}) after splitting.")

        train_idx = slice(0, n_train)
        val_idx = slice(n_train, n_train + n_val)
        test_idx = slice(n_train + n_val, n)

        X_raw = X_df[feature_cols].values
        y_raw = y.values

        X_train_raw = X_raw[train_idx]
        X_val_raw = X_raw[val_idx]
        X_test_raw = X_raw[test_idx]

        y_train = y_raw[train_idx]
        y_val = y_raw[val_idx]
        y_test = y_raw[test_idx]

        # Fit scaler ONLY on training data!
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train_raw)
        X_val_scaled = scaler.transform(X_val_raw)
        X_test_scaled = scaler.transform(X_test_raw)

        dates_train = X_df["date"].iloc[train_idx].values
        dates_val = X_df["date"].iloc[val_idx].values
        dates_test = X_df["date"].iloc[test_idx].values

        return {
            "scaler": scaler,
            "feature_cols": feature_cols,
            "X_train": X_train_scaled,
            "y_train": y_train,
            "X_val": X_val_scaled,
            "y_val": y_val,
            "X_test": X_test_scaled,
            "y_test": y_test,
            "dates_train": dates_train,
            "dates_val": dates_val,
            "dates_test": dates_test,
            "test_df": X_df.iloc[test_idx].copy()
        }

feature_pipeline = FeaturePipeline()

