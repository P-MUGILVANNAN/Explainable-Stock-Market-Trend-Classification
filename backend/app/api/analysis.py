from typing import Optional
from fastapi import APIRouter, HTTPException, Query
import pandas as pd
import numpy as np
from app.database.connection import get_db
from app.ml.data_collection.stock_collector import StockCollector
from app.ml.feature_engineering.technical_indicators import technical_engine

router = APIRouter(prefix="/analysis", tags=["Analytics & Technical Indicators"])
collector = StockCollector()

@router.get("/{symbol}/technical")
def get_technical_analysis(
    symbol: str,
    period: str = Query("1y", description="1mo, 3mo, 6mo, 1y, 2y"),
    limit: Optional[int] = Query(100, description="Max historical points to return")
):
    symbol = symbol.upper()
    df = collector.fetch_historical_prices(symbol, period=period)
    if df.empty or len(df) < 55:
        raise HTTPException(status_code=404, detail="Insufficient price history for technical calculations")

    tech_df = technical_engine.compute_all_indicators(df)
    if limit and limit > 0:
        tech_df = tech_df.tail(limit)

    results = []
    for _, r in tech_df.iterrows():
        d_str = r["date"].strftime("%Y-%m-%d") if hasattr(r["date"], "strftime") else str(r["date"])[:10]
        results.append({
            "date": d_str,
            "close": round(float(r["close"]), 2),
            "sma_10": round(float(r["sma_10"]), 2),
            "sma_20": round(float(r["sma_20"]), 2),
            "sma_50": round(float(r["sma_50"]), 2),
            "rsi_14": round(float(r["rsi_14"]), 2),
            "macd": round(float(r["macd"]), 4),
            "macd_signal": round(float(r["macd_signal"]), 4),
            "macd_hist": round(float(r["macd_hist"]), 4),
            "bb_upper": round(float(r["bb_upper"]), 2),
            "bb_lower": round(float(r["bb_lower"]), 2),
            "bb_bandwidth": round(float(r["bb_bandwidth"]), 4),
            "daily_return": round(float(r["daily_return"]), 4),
            "rolling_std_20": round(float(r["rolling_std_20"]), 4),
            "obv": float(r["obv"]),
            "volume": float(r["volume"])
        })

    return {
        "symbol": symbol,
        "count": len(results),
        "latest": results[-1] if results else None,
        "series": results
    }

@router.get("/{symbol}/sentiment")
def get_sentiment_analysis(symbol: str):
    symbol = symbol.upper()
    db = get_db()
    articles = list(db.financial_news.find({"symbol": symbol}, {"_id": 0}))
    daily = list(db.daily_sentiment.find({"symbol": symbol}, {"_id": 0}).sort("date", -1).limit(30))

    pos_count = sum(1 for a in articles if a.get("sentiment") == "positive")
    neg_count = sum(1 for a in articles if a.get("sentiment") == "negative")
    neu_count = sum(1 for a in articles if a.get("sentiment") == "neutral")
    total = len(articles)

    return {
        "symbol": symbol,
        "total_articles": total,
        "distribution": {
            "positive": pos_count,
            "negative": neg_count,
            "neutral": neu_count,
            "positive_pct": round(pos_count / (total or 1) * 100, 1),
            "negative_pct": round(neg_count / (total or 1) * 100, 1),
            "neutral_pct": round(neu_count / (total or 1) * 100, 1)
        },
        "daily_trends": list(reversed(daily))
    }

@router.get("/{symbol}/overview")
def get_stock_overview(symbol: str):
    symbol = symbol.upper()
    db = get_db()
    df = collector.fetch_historical_prices(symbol, period="3mo")
    if df.empty:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")

    last_close = float(df["close"].iloc[-1])
    prev_close = float(df["close"].iloc[-2]) if len(df) > 1 else last_close
    change_pct = ((last_close - prev_close) / prev_close) * 100
    last_date = str(df["date"].iloc[-1])[:10]

    # Latest daily sentiment
    latest_sent = db.daily_sentiment.find_one({"symbol": symbol}, sort=[("date", -1)], projection={"_id": 0})

    # Latest prediction
    latest_pred = db.predictions.find_one({"symbol": symbol}, sort=[("prediction_date", -1)], projection={"_id": 0})

    stock_meta = db.stocks.find_one({"symbol": symbol}) or {}

    return {
        "symbol": symbol,
        "company_name": stock_meta.get("company_name", symbol),
        "exchange": stock_meta.get("exchange", "US"),
        "latest_close": round(last_close, 2),
        "prev_close": round(prev_close, 2),
        "daily_change_pct": round(change_pct, 2),
        "data_date": last_date,
        "latest_sentiment": latest_sent,
        "latest_prediction": latest_pred
    }

