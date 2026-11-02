#!/usr/bin/env python3
"""
Multi-Model Benchmark Suite
Evaluates all 5 ML models (Logistic Regression, Random Forest, XGBoost, SVM, LSTM)
across identical out-of-sample test partitions under both experimental groups.
"""

import os
import sys
import argparse
import pandas as pd

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database.connection import init_db
from app.ml.data_collection.stock_collector import StockCollector
from app.ml.data_collection.news_collector import NewsCollector
from app.ml.finbert.sentiment_aggregator import sentiment_aggregator
from app.ml.feature_engineering.pipeline import feature_pipeline
from app.ml.training.model_trainer import model_trainer

MODELS = ["logistic_regression", "random_forest", "xgboost", "svm", "lstm"]

def run_benchmarks(symbol: str = "AAPL", horizon: int = 1):
    init_db()
    stock_col = StockCollector()
    news_col = NewsCollector()

    print("=" * 85)
    print(f"MULTI-MODEL ARCHITECTURAL BENCHMARK: {symbol} (Horizon = {horizon} Day)")
    print("=" * 85)

    price_df = stock_col.fetch_historical_prices(symbol, period="2y")
    news_items = news_col.fetch_news(symbol, limit=40)
    sent_df = sentiment_aggregator.aggregate_daily_sentiment(symbol, news_items)

    # 1. Price-Only Dataset
    X_price, y_price, _ = feature_pipeline.prepare_dataset(price_df, None, horizon_days=horizon)
    split_price = feature_pipeline.chronological_train_test_split(X_price, y_price)

    # 2. Price + News Dataset
    X_news, y_news, _ = feature_pipeline.prepare_dataset(price_df, sent_df, horizon_days=horizon)
    split_news = feature_pipeline.chronological_train_test_split(X_news, y_news)

    records = []

    for model_name in MODELS:
        print(f"\n[+] Benchmarking {model_name.upper()}...")

        # Evaluate Price-Only
        res_price = model_trainer.train_and_evaluate(
            model_name=model_name,
            X_train=split_price["X_train"],
            y_train=split_price["y_train"],
            X_test=split_price["X_test"],
            y_test=split_price["y_test"]
        )

        # Evaluate Price + News
        res_news = model_trainer.train_and_evaluate(
            model_name=model_name,
            X_train=split_news["X_train"],
            y_train=split_news["y_train"],
            X_test=split_news["X_test"],
            y_test=split_news["y_test"]
        )

        acc_delta = res_news["accuracy"] - res_price["accuracy"]
        f1_delta = res_news["f1_macro"] - res_price["f1_macro"]

        rec = {
            "model": model_name,
            "price_only_accuracy": round(res_price["accuracy"] * 100, 2),
            "price_news_accuracy": round(res_news["accuracy"] * 100, 2),
            "acc_delta": round(acc_delta * 100, 2),
            "price_only_f1": round(res_price["f1_macro"] * 100, 2),
            "price_news_f1": round(res_news["f1_macro"] * 100, 2),
            "f1_delta": round(f1_delta * 100, 2),
            "price_news_log_loss": round(res_news["log_loss"], 4),
            "price_news_brier": round(res_news["brier_score"], 4)
        }
        records.append(rec)
        print(f"    - Accuracy: {rec['price_only_accuracy']}% -> {rec['price_news_accuracy']}% ({rec['acc_delta']:+0.2f}%)")
        print(f"    - Macro F1: {rec['price_only_f1']}% -> {rec['price_news_f1']}% ({rec['f1_delta']:+0.2f}%)")

    out_dir = os.path.join(os.path.dirname(__file__), "..", "reports")
    os.makedirs(out_dir, exist_ok=True)
    df_rec = pd.DataFrame(records)
    out_csv = os.path.join(out_dir, "model_benchmark_results.csv")
    df_rec.to_csv(out_csv, index=False)

    print("\n" + "=" * 85)
    print("CROSS-ARCHITECTURE BENCHMARK RESULTS")
    print("=" * 85)
    print(df_rec.to_string(index=False))
    print(f"\nBenchmark results saved to: {out_csv}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol", default="AAPL")
    parser.add_argument("--horizon", type=int, default=1)
    args = parser.parse_args()
    run_benchmarks(args.symbol, args.horizon)

