from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from app.database.connection import get_db
from app.schemas.ml import PredictRequest, PredictionResponse
from app.ml.prediction.predictor import trend_predictor
from app.api.deps import get_current_user

router = APIRouter(tags=["Stock Trend Prediction"])

@router.post("/predict", response_model=PredictionResponse)
def predict_trend(req: PredictRequest, current_user: Optional[dict] = Depends(get_current_user)):
    user_id = current_user.get("id") if current_user else "guest"
    try:
        res = trend_predictor.generate_prediction(
            symbol=req.symbol,
            model_name=req.model_name,
            experiment_type=req.experiment_type,
            horizon_days=req.horizon_days,
            cutoff_date=req.cutoff_date,
            user_id=user_id
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")

@router.get("/predictions")
def list_predictions(
    symbol: Optional[str] = Query(None),
    limit: int = Query(50, description="Max predictions to retrieve"),
    skip: int = Query(0)
):
    db = get_db()
    query = {}
    if symbol:
        query["symbol"] = symbol.upper()

    cursor = db.predictions.find(query, {"_id": 0}).sort("prediction_date", -1).skip(skip).limit(limit)
    records = list(cursor)
    total = db.predictions.count_documents(query)

    return {
        "total": total,
        "count": len(records),
        "data": records
    }

@router.get("/predictions/{prediction_id}")
def get_prediction_by_id(prediction_id: str):
    db = get_db()
    record = db.predictions.find_one({"prediction_id": prediction_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return record

