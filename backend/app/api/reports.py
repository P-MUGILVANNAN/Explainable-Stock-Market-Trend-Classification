from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Response
from app.database.connection import get_db
from app.services.report_generator import report_generator
from app.ml.data_collection.stock_collector import StockCollector
from app.ml.data_collection.news_collector import NewsCollector
from app.ml.finbert.sentiment_aggregator import sentiment_aggregator
from app.ml.evaluation.comparator import research_comparator

router = APIRouter(prefix="/reports", tags=["Analytical & Research Reports"])
stock_collector = StockCollector()
news_collector = NewsCollector()

@router.get("/performance")
def get_performance_report():
    db = get_db()
    models = list(db.model_registry.find({}, {"_id": 0}))
    return {"total_registered": len(models), "models": models}

@router.get("/predictions")
def get_prediction_accuracy_report():
    db = get_db()
    preds = list(db.predictions.find({}, {"_id": 0}))
    evaluated = [p for p in preds if p.get("actual_class")]
    correct = [p for p in evaluated if p.get("actual_class") == p.get("predicted_class")]
    acc = len(correct) / (len(evaluated) or 1)
    return {
        "total_predictions": len(preds),
        "evaluated_count": len(evaluated),
        "correct_count": len(correct),
        "empirical_accuracy": round(acc, 4)
    }

@router.get("/download")
def download_research_report(
    symbol: str = Query("AAPL"),
    model_name: str = Query("xgboost"),
    horizon_days: int = Query(1),
    format: str = Query("pdf", description="pdf or csv")
):
    symbol = symbol.upper()
    db = get_db()

    if format.lower() == "csv":
        predictions = list(db.predictions.find({"symbol": symbol}, {"_id": 0}))
        csv_content = report_generator.generate_predictions_csv(predictions)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={symbol}_predictions.csv"}
        )

    # Otherwise generate PDF report
    price_df = stock_collector.fetch_historical_prices(symbol, period="2y")
    articles = news_collector.fetch_news(symbol, limit=40)
    sentiment_df = sentiment_aggregator.aggregate_daily_sentiment(symbol, articles)

    comparison_data = research_comparator.compare_experiments(
        symbol=symbol,
        model_name=model_name,
        price_df=price_df,
        sentiment_df=sentiment_df,
        horizon_days=horizon_days
    )

    pdf_bytes = report_generator.generate_pdf_report(comparison_data)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={symbol}_{model_name}_h{horizon_days}_report.pdf"}
    )

