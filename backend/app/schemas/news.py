from pydantic import BaseModel
from typing import List, Optional, Dict

class FinBERTSentiment(BaseModel):
    positive: float
    negative: float
    neutral: float
    predicted_label: str  # positive, negative, neutral
    confidence: float

class NewsArticleItem(BaseModel):
    id: Optional[str] = None
    symbol: str
    title: str
    description: Optional[str] = ""
    source: str
    url: Optional[str] = None
    published_at: str
    sentiment: Optional[str] = None
    sentiment_probabilities: Optional[FinBERTSentiment] = None
    processed_at: Optional[str] = None

class DailySentimentItem(BaseModel):
    symbol: str
    date: str
    positive_score: float
    negative_score: float
    neutral_score: float
    net_sentiment: float
    weighted_sentiment: float
    sentiment_volatility: float
    sentiment_momentum: float
    article_count: int
    news_available: int

class NewsFetchRequest(BaseModel):
    limit: Optional[int] = 50
    days: Optional[int] = 30

