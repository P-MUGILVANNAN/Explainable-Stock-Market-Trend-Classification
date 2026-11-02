from fastapi import APIRouter, HTTPException, Depends
from app.database.connection import get_db, is_database_mock
from app.core.config import settings
from app.schemas.admin import SystemStatusResponse, ThresholdsUpdateRequest
from app.api.deps import require_admin_user

router = APIRouter(prefix="/admin", tags=["Admin Management"])

@router.get("/system-status", response_model=SystemStatusResponse)
def get_system_status():
    import torch
    db = get_db()
    users_cnt = db.users.count_documents({})
    preds_cnt = db.predictions.count_documents({})
    stocks_cnt = db.stocks.count_documents({})
    news_cnt = db.financial_news.count_documents({})
    models_cnt = db.model_registry.count_documents({})

    return {
        "status": "ONLINE",
        "database": settings.DATABASE_NAME,
        "is_mock_db": is_database_mock(),
        "registered_users_count": users_cnt,
        "total_predictions_count": preds_cnt,
        "cached_stocks_count": stocks_cnt,
        "news_articles_count": news_cnt,
        "trained_models_count": models_cnt,
        "cuda_available": torch.cuda.is_available(),
        "torch_version": torch.__version__
    }

@router.get("/dashboard")
def get_admin_dashboard(current_user: dict = Depends(require_admin_user)):
    db = get_db()
    users = list(db.users.find({}, {"password_hash": 0}).limit(20))
    for u in users:
        u["id"] = str(u.get("_id", ""))
        u.pop("_id", None)

    recent_preds = list(db.predictions.find({}, {"_id": 0}).sort("prediction_date", -1).limit(10))
    recent_training = list(db.training_history.find({}, {"_id": 0}).sort("training_started", -1).limit(10))

    return {
        "system_status": get_system_status(),
        "users": users,
        "recent_predictions": recent_preds,
        "training_history": recent_training,
        "thresholds": {
            "upward_threshold": settings.UPWARD_THRESHOLD,
            "downward_threshold": settings.DOWNWARD_THRESHOLD,
            "default_horizon_days": settings.DEFAULT_HORIZON_DAYS
        }
    }

@router.get("/users")
def list_users(current_user: dict = Depends(require_admin_user)):
    db = get_db()
    users = list(db.users.find({}, {"password_hash": 0}))
    for u in users:
        u["id"] = str(u.get("_id", ""))
        u.pop("_id", None)
    return {"count": len(users), "users": users}

@router.get("/training-history")
def get_training_history():
    db = get_db()
    history = list(db.training_history.find({}, {"_id": 0}).sort("training_started", -1).limit(50))
    return {"count": len(history), "history": history}

@router.post("/thresholds")
def update_thresholds(req: ThresholdsUpdateRequest, current_user: dict = Depends(require_admin_user)):
    settings.UPWARD_THRESHOLD = req.upward_threshold
    settings.DOWNWARD_THRESHOLD = req.downward_threshold
    settings.DEFAULT_HORIZON_DAYS = req.default_horizon_days
    return {
        "message": "Thresholds updated successfully",
        "upward_threshold": settings.UPWARD_THRESHOLD,
        "downward_threshold": settings.DOWNWARD_THRESHOLD,
        "default_horizon_days": settings.DEFAULT_HORIZON_DAYS
    }
