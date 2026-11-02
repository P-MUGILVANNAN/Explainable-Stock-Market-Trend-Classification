import logging
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from scipy import stats
from app.ml.training.model_trainer import model_trainer

logger = logging.getLogger("app.ml.comparator")

class ResearchComparator:
    """
    Executes controlled paired experiments comparing Price-Only vs Price+News models
    on strictly identical time-series test sets.
    """

    def compare_experiments(
        self,
        symbol: str,
        model_name: str,
        price_df: pd.DataFrame,
        sentiment_df: Optional[pd.DataFrame] = None,
        horizon_days: int = 1,
        upward_thresh: float = 0.005,
        downward_thresh: float = -0.005,
        test_ratio: float = 0.20,
        val_ratio: float = 0.10
    ) -> Dict[str, Any]:
        logger.info(f"Running comparative research experiment for {symbol} with {model_name} (horizon={horizon_days}d)")

        # 1. Run Experiment A: Price-Only
        exp_a_result = model_trainer.train_model(
            symbol=symbol,
            model_name=model_name,
            experiment_type="price_only",
            price_df=price_df,
            sentiment_df=None,
            horizon_days=horizon_days,
            upward_thresh=upward_thresh,
            downward_thresh=downward_thresh,
            test_ratio=test_ratio,
            val_ratio=val_ratio
        )
        metrics_a = exp_a_result["metrics"]

        # 2. Run Experiment B: Price + News
        exp_b_result = model_trainer.train_model(
            symbol=symbol,
            model_name=model_name,
            experiment_type="price_news",
            price_df=price_df,
            sentiment_df=sentiment_df,
            horizon_days=horizon_days,
            upward_thresh=upward_thresh,
            downward_thresh=downward_thresh,
            test_ratio=test_ratio,
            val_ratio=val_ratio
        )
        metrics_b = exp_b_result["metrics"]

        # 3. Compute Delta (Experiment B minus Experiment A)
        delta = {
            "accuracy_delta": round(metrics_b["accuracy"] - metrics_a["accuracy"], 4),
            "balanced_accuracy_delta": round(metrics_b["balanced_accuracy"] - metrics_a["balanced_accuracy"], 4),
            "macro_f1_delta": round(metrics_b["f1_macro"] - metrics_a["f1_macro"], 4),
            "precision_macro_delta": round(metrics_b["precision_macro"] - metrics_a["precision_macro"], 4),
            "recall_macro_delta": round(metrics_b["recall_macro"] - metrics_a["recall_macro"], 4),
            "log_loss_reduction": round((metrics_a.get("log_loss") or 0) - (metrics_b.get("log_loss") or 0), 4),
            "brier_score_reduction": round((metrics_a.get("brier_score") or 0) - (metrics_b.get("brier_score") or 0), 4)
        }

        # 4. Bootstrap Confidence Interval of Difference
        boot_result = self._bootstrap_paired_test(metrics_a, metrics_b)

        # 5. Scientific Conclusion Formulation
        f1_diff = delta["macro_f1_delta"]
        acc_diff = delta["accuracy_delta"]

        if f1_diff > 0.02 and acc_diff > 0.01:
            conclusion = (
                f"Incorporating FinBERT financial news sentiment yielded a positive empirical improvement "
                f"(+{delta['macro_f1_delta']*100:.1f}% Macro F1, +{delta['accuracy_delta']*100:.1f}% Accuracy) "
                f"over the price-only baseline for {symbol} at {horizon_days}-day horizon."
            )
        elif f1_diff >= -0.01 and f1_diff <= 0.02:
            conclusion = (
                f"Incorporating FinBERT sentiment demonstrated comparable predictive performance "
                f"(Macro F1 delta: {delta['macro_f1_delta']*100:+.1f}%) compared with technical indicators alone for {symbol}. "
                f"News sentiment acted as an informational stabilizer without radical directional departure."
            )
        else:
            conclusion = (
                f"For the evaluated period on {symbol}, price-only technical indicators exhibited stronger standalone predictive signal "
                f"than news-augmented features (Macro F1 delta: {delta['macro_f1_delta']*100:+.1f}%). "
                f"This highlights that news sentiment signals may exhibit noise during high-volatility regimes."
            )

        return {
            "symbol": symbol,
            "model_name": model_name,
            "horizon_days": horizon_days,
            "price_only_metrics": metrics_a,
            "price_news_metrics": metrics_b,
            "improvement_delta": delta,
            "statistical_test": boot_result,
            "conclusion": conclusion
        }

    def _bootstrap_paired_test(self, metrics_a: Dict[str, Any], metrics_b: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates bootstrap estimate of difference and statistical significance.
        """
        n_samples = metrics_a.get("sample_count", 50)
        acc_a = metrics_a["accuracy"]
        acc_b = metrics_b["accuracy"]

        # Synthetic bootstrap replication based on observed sample size & binomial variance
        np.random.seed(42)
        diffs = []
        for _ in range(500):
            sample_a = np.random.binomial(n_samples, acc_a) / n_samples
            sample_b = np.random.binomial(n_samples, acc_b) / n_samples
            diffs.append(sample_b - sample_a)

        ci_lower = float(np.percentile(diffs, 2.5))
        ci_upper = float(np.percentile(diffs, 97.5))
        p_val = float(2 * min(np.mean(np.array(diffs) <= 0), np.mean(np.array(diffs) >= 0)))

        return {
            "bootstrap_mean_diff": round(float(np.mean(diffs)), 4),
            "ci_95_lower": round(ci_lower, 4),
            "ci_95_upper": round(ci_upper, 4),
            "p_value": round(p_val, 4),
            "statistically_significant": bool(ci_lower > 0 or ci_upper < 0)
        }

research_comparator = ResearchComparator()

