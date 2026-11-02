import logging
import numpy as np
import pandas as pd

logger = logging.getLogger("app.ml.technical_indicators")

class TechnicalIndicatorEngine:
    """
    Computes mathematical financial technical indicators strictly on past/current prices.
    Prevents look-ahead bias and forward information leakage.
    """

    def compute_all_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty or len(df) < 55:
            logger.warning(f"Dataframe has {len(df)} rows, minimum 55 required for warm-up indicators.")
            return df

        df = df.copy()
        df = df.sort_values("date").reset_index(drop=True)

        close = df["close"]
        high = df["high"]
        low = df["low"]
        open_p = df["open"]
        volume = df["volume"]

        # --- 1. Trend Indicators ---
        df["sma_10"] = close.rolling(window=10, min_periods=10).mean()
        df["sma_20"] = close.rolling(window=20, min_periods=20).mean()
        df["sma_50"] = close.rolling(window=50, min_periods=50).mean()

        df["ema_12"] = close.ewm(span=12, adjust=False).mean()
        df["ema_26"] = close.ewm(span=26, adjust=False).mean()

        df["macd"] = df["ema_12"] - df["ema_26"]
        df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
        df["macd_hist"] = df["macd"] - df["macd_signal"]

        # --- 2. Momentum Indicators ---
        # RSI 14
        delta = close.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(alpha=1/14, min_periods=14, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1/14, min_periods=14, adjust=False).mean()
        rs = avg_gain / (avg_loss + 1e-9)
        df["rsi_14"] = 100 - (100 / (1 + rs))

        # ROC 10 (Rate of Change)
        df["roc_10"] = ((close - close.shift(10)) / (close.shift(10) + 1e-9)) * 100

        # Stochastic Oscillator (14-day %K and 3-day %D)
        lowest_14 = low.rolling(window=14, min_periods=14).min()
        highest_14 = high.rolling(window=14, min_periods=14).max()
        df["stoch_k"] = ((close - lowest_14) / ((highest_14 - lowest_14) + 1e-9)) * 100
        df["stoch_d"] = df["stoch_k"].rolling(window=3, min_periods=3).mean()

        # --- 3. Volatility Indicators ---
        # Bollinger Bands (20, 2)
        rolling_mean = df["sma_20"]
        rolling_std = close.rolling(window=20, min_periods=20).std()
        df["rolling_std_20"] = rolling_std
        df["bb_upper"] = rolling_mean + (rolling_std * 2)
        df["bb_lower"] = rolling_mean - (rolling_std * 2)
        df["bb_bandwidth"] = (df["bb_upper"] - df["bb_lower"]) / (rolling_mean + 1e-9)
        df["bb_percent_b"] = (close - df["bb_lower"]) / ((df["bb_upper"] - df["bb_lower"]) + 1e-9)

        # ATR 14 (Average True Range)
        prev_close = close.shift(1)
        tr1 = high - low
        tr2 = (high - prev_close).abs()
        tr3 = (low - prev_close).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        df["atr_14"] = tr.ewm(alpha=1/14, min_periods=14, adjust=False).mean()

        # --- 4. Volume Indicators ---
        # OBV (On-Balance Volume)
        direction = np.where(close > prev_close, 1, np.where(close < prev_close, -1, 0))
        direction[0] = 0
        df["obv"] = (direction * volume).cumsum()
        df["volume_sma_20"] = volume.rolling(window=20, min_periods=20).mean()
        df["volume_ratio"] = volume / (df["volume_sma_20"] + 1e-9)

        # --- 5. Price Return & Momentum Features ---
        df["daily_return"] = close.pct_change()
        df["log_return"] = np.log(close / (prev_close + 1e-9))
        df["high_low_range"] = (high - low) / (close + 1e-9)
        df["open_close_diff"] = (close - open_p) / (open_p + 1e-9)
        df["price_momentum_5"] = (close - close.shift(5)) / (close.shift(5) + 1e-9)
        df["lagged_return_1"] = df["daily_return"].shift(1)
        df["lagged_return_2"] = df["daily_return"].shift(2)

        # Drop warm-up NaN rows (from 50-day SMA, etc.)
        df_clean = df.dropna().reset_index(drop=True)
        return df_clean

technical_engine = TechnicalIndicatorEngine()

