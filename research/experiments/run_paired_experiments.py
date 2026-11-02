#!/usr/bin/env python3
"""
Paired Research Experiment Runner: Price-Only vs. Price + FinBERT News
Evaluates the primary research question with 500-iteration bootstrap hypothesis testing.
"""

import os
import sys
import argparse
import json
from datetime import datetime
import pandas as pd

# Inject backend path for model engine access
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database.connection import init_db
from app.ml.data_collection.stock_collector import StockCollector
from app.ml.data_collection.news_collector import NewsCollector
from app.ml.finbert.sentiment_aggregator import sentiment_aggregator
from app.ml.evaluation.comparator import research_comparator

def main():
    parser = argparse.ArgumentParser(description="Run paired stock trend classification experiments.")
    parser.add_argument("--symbols", nargs="+", default=["AAPL", "MSFT", "NVDA", "RELIANCE.NS"], help="Stock ticker symbols to evaluate")
    parser.add_argument("--model", type=str, default="xgboost", choices=["xgboost", "random_forest", "logistic_regression", "svm", "lstm"], help="ML model architecture")
    parser.add_argument("--horizon", type=int, default=1, help="Prediction horizon in trading days")
    parser.add_argument("--outdir", type=str, default=os.path.join(os.path.dirname(__file__), "..", "reports"), help="Output directory for reports")
    args = parser.parse_args()

    init_db()
    stock_col = StockCollector()
    news_col = NewsCollector()

    print("=" * 80)
    print(f"PAIRED RESEARCH EXPERIMENTS: Price-Only vs. Price + FinBERT News")
    print(f"Model: {args.model.upper()} | Horizon: {args.horizon} Day(s) | Tickers: {args.symbols}")
    print("=" * 80)

    results_summary = []

    for sym in args.symbols:
        print(f"\n[+] Processing Symbol: {sym}...")
        try:
            price_df = stock_col.fetch_historical_prices(sym, period="2y")
            news_items = news_col.fetch_news(sym, limit=40)
            sent_df = sentiment_aggregator.aggregate_daily_sentiment(sym, news_items)

            comp = research_comparator.compare_experiments(
                symbol=sym,
                model_name=args.model,
                price_df=price_df,
                sentiment_df=sent_df,
                horizon_days=args.horizon
            )

            p_only = comp["price_only_metrics"]
            p_news = comp["price_news_metrics"]
            delta = comp["improvement_delta"]
            stat = comp["statistical_test"]

            row = {
                "symbol": sym,
                "model": args.model,
                "horizon_days": args.horizon,
                "test_samples": p_only["sample_count"],
                "price_only_acc": round(p_only["accuracy"] * 100, 2),
                "price_news_acc": round(p_news["accuracy"] * 100, 2),
                "acc_delta": round(delta["accuracy_delta"] * 100, 2),
                "price_only_f1": round(p_only["f1_macro"] * 100, 2),
                "price_news_f1": round(p_news["f1_macro"] * 100, 2),
                "f1_delta": round(delta["macro_f1_delta"] * 100, 2),
                "p_value": stat["p_value"],
                "ci_lower": round(stat["ci_95_lower"] * 100, 2),
                "ci_upper": round(stat["ci_95_upper"] * 100, 2),
                "significant": stat["statistically_significant"]
            }
            results_summary.append(row)

            print(f"    - Price-Only Accuracy:   {row['price_only_acc']}% | Macro F1: {row['price_only_f1']}%")
            print(f"    - Price + News Accuracy: {row['price_news_acc']}% | Macro F1: {row['price_news_f1']}%")
            print(f"    - Accuracy Delta:        {row['acc_delta']:+0.2f}% (p-value: {row['p_value']:.4f})")
            print(f"    - 95% Confidence Int:    [{row['ci_lower']}%, {row['ci_upper']}%]")
            print(f"    - Statistically Sig:     {row['significant']}")

        except Exception as e:
            print(f"    [!] Error testing {sym}: {e}")

    if results_summary:
        os.makedirs(args.outdir, exist_ok=True)
        summary_df = pd.DataFrame(results_summary)
        csv_path = os.path.join(args.outdir, "paired_experiment_results.csv")
        json_path = os.path.join(args.outdir, "paired_experiment_results.json")

        summary_df.to_csv(csv_path, index=False)
        with open(json_path, "w") as f:
            json.dump(results_summary, f, indent=2)

        print("\n" + "=" * 80)
        print("EMPIRICAL EXPERIMENT SUMMARY TABLE")
        print("=" * 80)
        print(summary_df[["symbol", "price_only_acc", "price_news_acc", "acc_delta", "price_only_f1", "price_news_f1", "f1_delta", "p_value", "significant"]].to_string(index=False))
        print(f"\nArtifacts saved to:\n  - {csv_path}\n  - {json_path}")

if __name__ == "__main__":
    main()

