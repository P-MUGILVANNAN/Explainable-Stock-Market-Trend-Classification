from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class TrainRequest(BaseModel):
    symbol: str = "AAPL"
    model_name: str = "xgboost"  # logistic_regression, random_forest, xgboost, svm, lstm
    horizon_days: int = 1        # 1, 3, 5, 10
    experiment_type: str = "both" # price_only, price_news, both
    upward_threshold: Optional[float] = 0.005
    downward_threshold: Optional[float] = -0.005
    test_size: Optional[float] = 0.2
    val_size: Optional[float] = 0.1

class PredictRequest(BaseModel):
    symbol: str = "AAPL"
    model_name: str = "xgboost"
    experiment_type: str = "price_news" # price_only or price_news
    horizon_days: int = 1
    cutoff_date: Optional[str] = None  # None means latest available

class FeatureContribution(BaseModel):
    feature_name: str
    feature_value: float
    shap_value: float
    contribution: str  # positive, negative, neutral
    category: str      # technical or sentiment

class PredictionResponse(BaseModel):
    prediction_id: str
    symbol: str
    model_name: str
    experiment_type: str
    horizon_days: int
    data_cutoff: str
    prediction_date: str
    predicted_class: str      # UPWARD, SIDEWAYS, DOWNWARD
    confidence: float
    probabilities: Dict[str, float] # {"UPWARD": 0.65, "SIDEWAYS": 0.20, "DOWNWARD": 0.15}
    top_features: List[FeatureContribution]
    sentiment_summary: Dict[str, Any]
    supporting_news: List[Dict[str, Any]]
    disclaimer: str

class ModelEvaluationMetrics(BaseModel):
    accuracy: float
    balanced_accuracy: float
    precision_macro: float
    recall_macro: float
    f1_macro: float
    f1_weighted: float
    log_loss: Optional[float] = None
    brier_score: Optional[float] = None
    roc_auc_macro: Optional[float] = None
    per_class_metrics: Dict[str, Dict[str, float]]
    confusion_matrix: List[List[int]]
    classes: List[str]
    sample_count: int

class ExperimentComparison(BaseModel):
    symbol: str
    model_name: str
    horizon_days: int
    test_period: Dict[str, str]
    price_only_metrics: ModelEvaluationMetrics
    price_news_metrics: ModelEvaluationMetrics
    improvement_delta: Dict[str, float]
    statistical_test: Dict[str, Any]
    conclusion: str

