import pytest
from app.ml.finbert.sentiment_engine import finbert_engine
from app.ml.finbert.sentiment_aggregator import sentiment_aggregator

def test_finbert_sentiment_classification():
    headlines = [
        "Apple reports record quarterly revenue and surges in pre-market trading",
        "Tesla stock plunges as vehicle deliveries miss analyst expectations",
        "Federal Reserve maintains current interest rate target range"
    ]
    results = finbert_engine.analyze_texts(headlines)
    assert len(results) == 3

    # Check structure
    for r in results:
        assert "positive" in r
        assert "negative" in r
        assert "neutral" in r
        assert "predicted_label" in r
        assert "confidence" in r
        # Probabilities sum approximately to 1
        total_p = r["positive"] + r["negative"] + r["neutral"]
        assert 0.98 <= total_p <= 1.02

    # Expect first to be positive, second to be negative
    assert results[0]["predicted_label"] == "positive"
    assert results[1]["predicted_label"] == "negative"

def test_sentiment_aggregation():
    sample_articles = [
        {
            "title": "Strong growth reported",
            "published_at": "2026-02-15T09:30:00Z",
            "sentiment_probabilities": {"positive": 0.8, "negative": 0.1, "neutral": 0.1, "confidence": 0.8}
        },
        {
            "title": "Expansion into new AI markets",
            "published_at": "2026-02-15T14:00:00Z",
            "sentiment_probabilities": {"positive": 0.7, "negative": 0.1, "neutral": 0.2, "confidence": 0.7}
        },
        {
            "title": "Supply chain disruption alert",
            "published_at": "2026-02-16T10:00:00Z",
            "sentiment_probabilities": {"positive": 0.1, "negative": 0.8, "neutral": 0.1, "confidence": 0.8}
        }
    ]

    agg_df = sentiment_aggregator.aggregate_daily_sentiment("AAPL", sample_articles)
    assert len(agg_df) == 2 # 2 distinct days: 2026-02-15 and 2026-02-16

    day1 = agg_df[agg_df["date"] == "2026-02-15"].iloc[0]
    assert day1["article_count"] == 2
    assert day1["net_sentiment"] > 0 # positive day
    assert day1["news_available"] == 1

    day2 = agg_df[agg_df["date"] == "2026-02-16"].iloc[0]
    assert day2["article_count"] == 1
    assert day2["net_sentiment"] < 0 # negative day

