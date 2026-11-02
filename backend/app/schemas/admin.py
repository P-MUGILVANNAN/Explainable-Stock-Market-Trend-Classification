from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class SystemStatusResponse(BaseModel):
    status: str
    database: str
    is_mock_db: bool
    registered_users_count: int
    total_predictions_count: int
    cached_stocks_count: int
    news_articles_count: int
    trained_models_count: int
    cuda_available: bool
    torch_version: str

class ThresholdsUpdateRequest(BaseModel):
    upward_threshold: float
    downward_threshold: float
    default_horizon_days: int

