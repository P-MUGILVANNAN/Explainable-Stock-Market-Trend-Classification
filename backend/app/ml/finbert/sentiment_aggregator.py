import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from app.database.connection import get_db

logger = logging.getLogger("app.ml.sentiment_aggregator")

class SentimentAggregator:
    def __init__(self):
        self.db = get_db()

    def aggregate_daily_sentiment(
        self,
        symbol: str,
        articles: List[Dict[str, Any]],
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Aggregates article-level FinBERT sentiment into daily financial features.
        Preserves strict temporal causality: each article's publication date is normalized to YYYY-MM-DD.
        """
        if not articles:
            return pd.DataFrame()

        rows = []
        for art in articles:
            probs = art.get("sentiment_probabilities") or {}
            pos = probs.get("positive", 0.0)
            neg = probs.get("negative", 0.0)
            neu = probs.get("neutral", 0.0)
            conf = probs.get("confidence", 0.5)

            # Publication timestamp
            pub_str = art.get("published_at", "")
            try:
                pub_dt = datetime.fromisoformat(pub_str.replace("Z", "+00:00"))
                date_key = pub_dt.strftime("%Y-%m-%d")
                ts = pub_dt.timestamp()
            except Exception:
                date_key = pub_str[:10]
                ts = 0.0

            rows.append({
                "date": date_key,
                "timestamp": ts,
                "positive": pos,
                "negative": neg,
                "neutral": neu,
                "confidence": conf,
                "source": art.get("source", "General"),
                "net_article": pos - neg
            })

        df = pd.DataFrame(rows)
        if df.empty:
            return pd.DataFrame()

        # Group by date
        daily_records = []
        for date_str, group in df.groupby("date"):
            n_articles = len(group)
            avg_pos = group["positive"].mean()
            avg_neg = group["negative"].mean()
            avg_neu = group["neutral"].mean()
            avg_conf = group["confidence"].mean()
            net_sentiment = avg_pos - avg_neg

            # Recency-weighted sentiment within the day
            # Articles later in the trading day get higher weights
            if n_articles > 1:
                t_min = group["timestamp"].min()
                t_max = group["timestamp"].max()
                if t_max > t_min:
                    weights = 1.0 + (group["timestamp"] - t_min) / (t_max - t_min)
                else:
                    weights = np.ones(n_articles)
                weighted_sent = float(np.average(group["net_article"], weights=weights))
                sent_volatility = float(group["net_article"].std(ddof=1)) if not np.isnan(group["net_article"].std(ddof=1)) else 0.0
            else:
                weighted_sent = float(group["net_article"].iloc[0])
                sent_volatility = 0.0

            pos_articles = sum(group["positive"] > group["negative"])
            neg_articles = sum(group["negative"] > group["positive"])
            pos_neg_ratio = (pos_articles + 1.0) / (neg_articles + 1.0)

            rec = {
                "symbol": symbol,
                "date": date_str,
                "positive_score": round(float(avg_pos), 4),
                "negative_score": round(float(avg_neg), 4),
                "neutral_score": round(float(avg_neu), 4),
                "net_sentiment": round(float(net_sentiment), 4),
                "weighted_sentiment": round(float(weighted_sent), 4),
                "sentiment_volatility": round(float(sent_volatility), 4),
                "sentiment_momentum": 0.0, # calculated across time series below
                "pos_neg_ratio": round(float(pos_neg_ratio), 4),
                "article_count": int(n_articles),
                "sentiment_confidence": round(float(avg_conf), 4),
                "news_available": 1
            }
            daily_records.append(rec)

        agg_df = pd.DataFrame(daily_records)
        agg_df["date"] = pd.to_datetime(agg_df["date"])
        agg_df = agg_df.sort_values("date").reset_index(drop=True)

        # Calculate sentiment momentum: net_sentiment - 3-day rolling mean
        if len(agg_df) > 1:
            rolling_net = agg_df["net_sentiment"].rolling(window=3, min_periods=1).mean()
            agg_df["sentiment_momentum"] = (agg_df["net_sentiment"] - rolling_net).round(4)

        # Cache daily sentiment to MongoDB
        for _, r in agg_df.iterrows():
            d_str = r["date"].strftime("%Y-%m-%d")
            doc = r.to_dict()
            doc["date"] = d_str
            self.db.daily_sentiment.update_one(
                {"symbol": symbol, "date": d_str},
                {"$set": doc},
                upsert=True
            )

        return agg_df

sentiment_aggregator = SentimentAggregator()

