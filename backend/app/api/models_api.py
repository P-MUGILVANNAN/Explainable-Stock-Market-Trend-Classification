from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from app.database.connection import get_db
from app.schemas.ml import TrainRequest, ExperimentComparison
from app.ml.data_collection.stock_collector import StockCollector
from app.ml.data_collection.news_collector import NewsCollector
from app.ml.finbert.sentiment_aggregator import sentiment_aggregator
from app.ml.training.model_trainer import model_trainer
from app.ml.evaluation.comparator import research_comparator

router = APIRouter(prefix="/models", tags=["Machine Learning Models & Experiments"])
stock_collector = StockCollector()
news_collector = NewsCollector()

@router.get("")
def list_registered_models(symbol: Optional[str] = Query(None)):
    db = get_db()
    query = {}
    if symbol:
        query["symbol"] = symbol.upper()
    models = list(db.model_registry.find(query, {"_id": 0}))
    return {"count": len(models), "models": models}

@router.post("/train")
def train_model_endpoint(req: TrainRequest):
    symbol = req.symbol.upper()
    price_df = stock_collector.fetch_historical_prices(symbol, period="2y")
    if price_df.empty or len(price_df) < 55:
        raise HTTPException(status_code=400, detail=f"Insufficient price data to train model for {symbol}")

    # Fetch news & aggregate daily sentiment
    articles = news_collector.fetch_news(symbol, limit=50)
    sentiment_df = sentiment_aggregator.aggregate_daily_sentiment(symbol, articles)

    if req.experiment_type in ["both", "all"]:
        # Run comparative research experiment
        comp_result = research_comparator.compare_experiments(
            symbol=symbol,
            model_name=req.model_name,
            price_df=price_df,
            sentiment_df=sentiment_df,
            horizon_days=req.horizon_days,
            upward_thresh=req.upward_threshold or 0.005,
            downward_thresh=req.downward_threshold or -0.005
        )
        return {"status": "SUCCESS", "mode": "comparative_experiment", "data": comp_result}
    else:
        # Run single experiment
        res = model_trainer.train_model(
            symbol=symbol,
            model_name=req.model_name,
            experiment_type=req.experiment_type,
            price_df=price_df,
            sentiment_df=sentiment_df,
            horizon_days=req.horizon_days,
            upward_thresh=req.upward_threshold or 0.005,
            downward_thresh=req.downward_threshold or -0.005
        )
        return {"status": "SUCCESS", "mode": "single_model", "data": res}

@router.get("/comparison", response_model=ExperimentComparison)
def get_model_comparison(
    symbol: str = Query("AAPL"),
    model_name: str = Query("xgboost"),
    horizon_days: int = Query(1)
):
    symbol = symbol.upper()
    price_df = stock_collector.fetch_historical_prices(symbol, period="2y")
    if price_df.empty or len(price_df) < 55:
        raise HTTPException(status_code=404, detail="Insufficient price data")

    articles = news_collector.fetch_news(symbol, limit=40)
    sentiment_df = sentiment_aggregator.aggregate_daily_sentiment(symbol, articles)

    result = research_comparator.compare_experiments(
        symbol=symbol,
        model_name=model_name,
        price_df=price_df,
        sentiment_df=sentiment_df,
        horizon_days=horizon_days
    )

    db = get_db()
    # Cache comparison record
    db.experiment_comparisons.update_one(
        {"symbol": symbol, "model_name": model_name, "horizon_days": horizon_days},
        {"$set": result},
        upsert=True
    )

    return {
        "symbol": symbol,
        "model_name": model_name,
        "horizon_days": horizon_days,
        "test_period": {
            "start": "Out-of-Sample Evaluation",
            "end": "Latest Market Close"
        },
        "price_only_metrics": result["price_only_metrics"],
        "price_news_metrics": result["price_news_metrics"],
        "improvement_delta": result["improvement_delta"],
        "statistical_test": result["statistical_test"],
        "conclusion": result["conclusion"]
    }

@router.get("/evaluation")
def get_model_evaluation(
    symbol: str = Query("AAPL"),
    model_name: str = Query("xgboost"),
    experiment_type: str = Query("price_news"),
    horizon_days: int = Query(1)
):
    symbol = symbol.upper()
    db = get_db()
    reg = db.model_registry.find_one({
        "symbol": symbol,
        "model_name": model_name,
        "experiment_type": experiment_type,
        "horizon_days": horizon_days
    }, {"_id": 0})

    if not reg:
        # Trigger training and return evaluation
        price_df = stock_collector.fetch_historical_prices(symbol, period="2y")
        articles = news_collector.fetch_news(symbol, limit=30)
        sentiment_df = sentiment_aggregator.aggregate_daily_sentiment(symbol, articles)
        res = model_trainer.train_model(
            symbol=symbol,
            model_name=model_name,
            experiment_type=experiment_type,
            price_df=price_df,
            sentiment_df=sentiment_df if experiment_type == "price_news" else None,
            horizon_days=horizon_days
        )
        return {"symbol": symbol, "model_name": model_name, "evaluation_metrics": res["metrics"]}

    return {"symbol": symbol, "model_name": model_name, "evaluation_metrics": reg["evaluation_metrics"]}

