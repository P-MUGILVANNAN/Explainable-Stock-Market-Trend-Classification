import logging
from typing import Tuple
import pandas as pd
import numpy as np
from app.core.config import settings

logger = logging.getLogger("app.ml.target_generator")

LABEL_MAPPING = {
    0: "DOWNWARD",
    1: "SIDEWAYS",
    2: "UPWARD"
}
LABEL_TO_INT = {v: k for k, v in LABEL_MAPPING.items()}

class TargetGenerator:
    """
    Computes future return target variable with strict zero-leakage safeguards.
    """

    def generate_targets(
        self,
        df: pd.DataFrame,
        horizon_days: int = 1,
        upward_thresh: float = 0.005,
        downward_thresh: float = -0.005
    ) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
        """
        Calculates future return: (Close[t + horizon] - Close[t]) / Close[t].
        Assigns UPWARD (2), SIDEWAYS (1), DOWNWARD (0).
        Removes the last `horizon_days` rows where future outcome is unobservable.
        """
        if df.empty or len(df) <= horizon_days:
            raise ValueError(f"Dataframe has {len(df)} rows, cannot compute target for horizon {horizon_days}")

        df = df.copy().sort_values("date").reset_index(drop=True)

        # Future close at t + horizon_days
        future_close = df["close"].shift(-horizon_days)
        future_return = (future_close - df["close"]) / df["close"]

        # 3-Class classification
        conditions = [
            future_return > upward_thresh,
            future_return < downward_thresh
        ]
        choices = [2, 0] # 2: UPWARD, 0: DOWNWARD
        target_int = np.select(conditions, choices, default=1) # 1: SIDEWAYS

        target_series = pd.Series(target_int, index=df.index, name="target")
        future_return_series = pd.Series(future_return, index=df.index, name="future_return")

        # Exclude the last horizon_days rows (their future returns are NaN / unobservable)
        valid_mask = ~future_close.isna()

        features_df = df[valid_mask].copy().reset_index(drop=True)
        y = target_series[valid_mask].copy().reset_index(drop=True)
        returns = future_return_series[valid_mask].copy().reset_index(drop=True)

        logger.info(
            f"Generated targets for horizon={horizon_days}d. Class distribution: "
            f"DOWNWARD={int(sum(y==0))}, SIDEWAYS={int(sum(y==1))}, UPWARD={int(sum(y==2))}"
        )
        return features_df, y, returns

target_generator = TargetGenerator()

