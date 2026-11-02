from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
import pandas as pd
from app.database.connection import get_db
from app.schemas.news import NewsArticleItem, DailySentimentItem, NewsFetchRequest
from app.ml.data_collection.news_collector import NewsCollector
from app.ml.finbert.sentiment_engine import finbert_engine
from app.ml.finbert.sentiment_aggregator import sentiment_aggregator

router = APIRouter(prefix="/news", tags=["Financial News & FinBERT Sentiment"])
news_collector = NewsCollector()

@router.get("/{symbol}")
def get_news(
    symbol: str,
    limit: int = Query(30, description="Max news articles to retrieve"),
    sentiment_filter: Optional[str] = Query(None, description="positive, negative, or neutral")
):
    symbol = symbol.upper()
    articles = news_collector.fetch_news(symbol, limit=limit)

    # Score any unscored articles with FinBERT
    unscored_texts = []
    unscored_indices = []
    for idx, art in enumerate(articles):
        if not art.get("sentiment_probabilities"):
            unscored_texts.append(art.get("title", ""))
            unscored_indices.append(idx)

    if unscored_texts:
        sent_results = finbert_engine.analyze_texts(unscored_texts)
        db = get_db()
        for idx, res in zip(unscored_indices, sent_results):
            articles[idx]["sentiment_probabilities"] = res
            articles[idx]["sentiment"] = res["predicted_label"]
            db.financial_news.update_one(
                {"url": articles[idx].get("url")},
                {"$set": {
                    "sentiment_probabilities": res,
                    "sentiment": res["predicted_label"]
                }}
            )

    if sentiment_filter:
        articles = [a for a in articles if a.get("sentiment") == sentiment_filter.lower()]

    return {"symbol": symbol, "count": len(articles), "articles": articles}

@router.post("/{symbol}/fetch")
def refresh_news(symbol: str, req: NewsFetchRequest):
    symbol = symbol.upper()
    articles = news_collector.fetch_news(symbol, limit=req.limit or 50, force_refresh=True)

    # Run FinBERT batch scoring
    titles = [a.get("title", "") for a in articles]
    sent_results = finbert_engine.analyze_texts(titles)

    db = get_db()
    for art, res in zip(articles, sent_results):
        art["sentiment_probabilities"] = res
        art["sentiment"] = res["predicted_label"]
        db.financial_news.update_one(
            {"url": art.get("url")},
            {"$set": {
                "sentiment_probabilities": res,
                "sentiment": res["predicted_label"]
            }}
        )

    # Aggregate daily
    sentiment_aggregator.aggregate_daily_sentiment(symbol, articles)

    return {"message": f"Fetched and analyzed {len(articles)} articles with FinBERT", "count": len(articles)}

@router.get("/{symbol}/sentiment")
def get_daily_sentiment(symbol: str, limit: int = Query(60, description="Number of daily records")):
    symbol = symbol.upper()
    db = get_db()
    records = list(db.daily_sentiment.find({"symbol": symbol}, {"_id": 0}).sort("date", -1).limit(limit))
    records.reverse() # Chronological ascending order for charts
    return {"symbol": symbol, "count": len(records), "data": records}

