#!/usr/bin/env python3
"""
FinBERT Sentiment Feature Ablation Study
Empirically isolates the marginal classification value of each NLP sentiment feature.
"""

import os
import sys
import argparse
import pandas as pd
import numpy as np

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database.connection import init_db
from app.ml.data_collection.stock_collector import StockCollector
from app.ml.data_collection.news_collector import NewsCollector
from app.ml.finbert.sentiment_aggregator import sentiment_aggregator
from app.ml.feature_engineering.pipeline import feature_pipeline, PRICE_ONLY_FEATURES
from app.ml.training.model_trainer import model_trainer

def run_ablation(symbol: str = "AAPL", model_name: str = "xgboost"):
    init_db()
    stock_col = StockCollector()
    news_col = NewsCollector()

    print("=" * 80)
    print(f"FINBERT SENTIMENT FEATURE ABLATION STUDY: {symbol} ({model_name.upper()})")
    print("=" * 80)

    price_df = stock_col.fetch_historical_prices(symbol, period="2y")
    news_items = news_col.fetch_news(symbol, limit=40)
    sent_df = sentiment_aggregator.aggregate_daily_sentiment(symbol, news_items)

    # 1. Full Dataset with all features
    full_df, y, _ = feature_pipeline.prepare_dataset(price_df, sent_df, horizon_days=1)

    ablation_levels = {
        "Level 0: Technical Indicators Only": PRICE_ONLY_FEATURES,
        "Level 1: Tech + Net Sentiment": PRICE_ONLY_FEATURES + ["net_sentiment"],
        "Level 2: Tech + Net Sentiment + Momentum": PRICE_ONLY_FEATURES + ["net_sentiment", "sentiment_momentum"],
        "Level 3: Full FinBERT Feature Suite": [c for c in full_df.columns if c not in ["date", "symbol"]]
    }

    results = []

    for name, feat_list in ablation_levels.items():
        # Keep only available features
        valid_cols = [c for c in feat_list if c in full_df.columns]
        sub_X = full_df[valid_cols]

        split = feature_pipeline.chronological_train_test_split(sub_X, y)
        eval_metrics = model_trainer.train_and_evaluate(
            model_name=model_name,
            X_train=split["X_train"],
            y_train=split["y_train"],
            X_test=split["X_test"],
            y_test=split["y_test"]
        )

        row = {
            "ablation_tier": name,
            "feature_count": len(valid_cols),
            "accuracy": round(eval_metrics["accuracy"] * 100, 2),
            "balanced_accuracy": round(eval_metrics["balanced_accuracy"] * 100, 2),
            "macro_f1": round(eval_metrics["f1_macro"] * 100, 2),
            "log_loss": round(eval_metrics["log_loss"], 4),
            "brier_score": round(eval_metrics["brier_score"], 4)
        }
        results.append(row)
        print(f"\n{name} ({len(valid_cols)} features):")
        print(f"  Accuracy: {row['accuracy']}% | Balanced Acc: {row['balanced_accuracy']}% | Macro F1: {row['macro_f1']}%")
        print(f"  Log Loss: {row['log_loss']} | Brier Score: {row['brier_score']}")

    out_dir = os.path.join(os.path.dirname(__file__), "..", "reports")
    os.makedirs(out_dir, exist_ok=True)
    df_res = pd.DataFrame(results)
    out_csv = os.path.join(out_dir, "ablation_study_results.csv")
    df_res.to_csv(out_csv, index=False)

    print("\n" + "=" * 80)
    print("ABLATION RESULTS SUMMARY")
    print("=" * 80)
    print(df_res.to_string(index=False))
    print(f"\nAblation report saved to: {out_csv}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol", default="AAPL")
    parser.add_argument("--model", default="xgboost")
    args = parser.parse_args()
    run_ablation(args.symbol, args.model)

