import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
import numpy as np
import pandas as pd
import joblib

from app.core.config import settings
from app.database.connection import get_db
from app.ml.data_collection.stock_collector import StockCollector
from app.ml.data_collection.news_collector import NewsCollector
from app.ml.finbert.sentiment_engine import finbert_engine
from app.ml.finbert.sentiment_aggregator import sentiment_aggregator
from app.ml.feature_engineering.pipeline import feature_pipeline, PRICE_ONLY_FEATURES, PRICE_NEWS_FEATURES
from app.ml.training.model_trainer import model_trainer
from app.ml.explainability.shap_explainer import shap_engine
from app.ml.feature_engineering.target_generator import LABEL_MAPPING

logger = logging.getLogger("app.ml.predictor")

class TrendPredictor:
    def __init__(self):
        self.db = get_db()
        self.stock_collector = StockCollector()
        self.news_collector = NewsCollector()

    def generate_prediction(
        self,
        symbol: str,
        model_name: str = "xgboost",
        experiment_type: str = "price_news",
        horizon_days: int = 1,
        cutoff_date: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes real-time inference with explainability and supporting evidence.
        """
        symbol = symbol.upper().strip()
        logger.info(f"Generating trend prediction for {symbol} | Model: {model_name} | Exp: {experiment_type}")

        # 1. Fetch Prices & News
        price_df = self.stock_collector.fetch_historical_prices(symbol, period="2y")
        if price_df.empty or len(price_df) < 55:
            raise ValueError(f"Insufficient historical data available for {symbol}")

        # Fetch and process news
        raw_news = self.news_collector.fetch_news(symbol, limit=40)
        
        # Analyze sentiment if not already analyzed
        unscored_texts = []
        unscored_indices = []
        for idx, art in enumerate(raw_news):
            if not art.get("sentiment_probabilities"):
                unscored_texts.append(art.get("title", ""))
                unscored_indices.append(idx)

        if unscored_texts:
            sent_results = finbert_engine.analyze_texts(unscored_texts)
            for idx, res in zip(unscored_indices, sent_results):
                raw_news[idx]["sentiment_probabilities"] = res
                raw_news[idx]["sentiment"] = res["predicted_label"]

        # Aggregate daily sentiment
        sentiment_df = sentiment_aggregator.aggregate_daily_sentiment(symbol, raw_news)

        # 2. Prepare Features
        features_df, y, returns = feature_pipeline.prepare_dataset(
            price_df=price_df,
            sentiment_df=sentiment_df if experiment_type == "price_news" else None,
            horizon_days=horizon_days
        )

        # Filter by cutoff date if provided (prevent lookahead!)
        if cutoff_date:
            features_df = features_df[features_df["date"] <= pd.to_datetime(cutoff_date)]
            if features_df.empty:
                raise ValueError(f"No data available on or before cutoff date: {cutoff_date}")

        selected_feature_cols = PRICE_NEWS_FEATURES if experiment_type == "price_news" else PRICE_ONLY_FEATURES

        # 3. Retrieve or Train Model
        registry_query = {
            "symbol": symbol,
            "model_name": model_name,
            "experiment_type": experiment_type,
            "horizon_days": horizon_days
        }
        reg_entry = self.db.model_registry.find_one(registry_query)

        trained_artifact = None
        if reg_entry and os.path.exists(reg_entry.get("artifact_path", "")):
            try:
                trained_artifact = joblib.load(reg_entry["artifact_path"])
            except Exception as e:
                logger.warning(f"Could not load cached artifact: {e}")

        if not trained_artifact:
            logger.info(f"Model artifact not found for {symbol}. Training automatically...")
            train_res = model_trainer.train_model(
                symbol=symbol,
                model_name=model_name,
                experiment_type=experiment_type,
                price_df=price_df,
                sentiment_df=sentiment_df,
                horizon_days=horizon_days
            )
            trained_artifact = joblib.load(train_res["artifact_path"])

        model = trained_artifact["model"]
        scaler = trained_artifact["scaler"]

        # 4. Extract Latest Feature Row
        latest_row = features_df.iloc[-1]
        data_cutoff_date = str(latest_row["date"])[:10]

        X_raw = features_df[selected_feature_cols].values
        X_latest_raw = latest_row[selected_feature_cols].values.reshape(1, -1)
        X_latest_scaled = scaler.transform(X_latest_raw)
        X_background = scaler.transform(X_raw[-60:])

        # 5. Predict Probabilities & Class
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X_latest_scaled)[0]
            pred_class_idx = int(np.argmax(probs))
        else:
            pred_class_idx = int(model.predict(X_latest_scaled)[0])
            probs = [0.0, 0.0, 0.0]
            probs[pred_class_idx] = 1.0

        predicted_class_name = LABEL_MAPPING.get(pred_class_idx, "SIDEWAYS")
        confidence = float(probs[pred_class_idx])

        # 6. Generate SHAP Explanation
        shap_res = shap_engine.explain_prediction(
            model=model,
            model_name=model_name,
            feature_names=selected_feature_cols,
            X_sample=X_latest_scaled,
            background_X=X_background,
            predicted_class_idx=pred_class_idx
        )

        # 7. Sentiment Summary & Supporting News
        # Relevant news strictly on or before data_cutoff_date
        relevant_news = [
            n for n in raw_news
            if n.get("published_at", "")[:10] <= data_cutoff_date
        ][:6]

        latest_sent = sentiment_df[sentiment_df["date"] <= pd.to_datetime(data_cutoff_date)] if not sentiment_df.empty else pd.DataFrame()
        if not latest_sent.empty:
            s_row = latest_sent.iloc[-1]
            sent_summary = {
                "date": str(s_row["date"])[:10],
                "net_sentiment": float(s_row.get("net_sentiment", 0.0)),
                "positive_score": float(s_row.get("positive_score", 0.0)),
                "negative_score": float(s_row.get("negative_score", 0.0)),
                "article_count": int(s_row.get("article_count", 0)),
                "sentiment_momentum": float(s_row.get("sentiment_momentum", 0.0))
            }
        else:
            sent_summary = {
                "date": data_cutoff_date,
                "net_sentiment": 0.0,
                "positive_score": 0.0,
                "negative_score": 0.0,
                "article_count": 0,
                "sentiment_momentum": 0.0
            }

        prediction_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        prob_dict = {
            "DOWNWARD": round(float(probs[0]), 4),
            "SIDEWAYS": round(float(probs[1]), 4),
            "UPWARD": round(float(probs[2]), 4)
        }

        # 8. Persist Prediction to Database
        prediction_doc = {
            "_id": prediction_id,
            "prediction_id": prediction_id,
            "user_id": user_id or "anonymous",
            "symbol": symbol,
            "prediction_date": now_iso,
            "data_cutoff": data_cutoff_date,
            "horizon": horizon_days,
            "model_name": model_name,
            "experiment_type": experiment_type,
            "predicted_class": predicted_class_name,
            "probabilities": prob_dict,
            "confidence": round(confidence, 4),
            "shap_explanation": shap_res,
            "actual_class": None, # Evaluated in the future once market closes
            "evaluation_status": "PENDING"
        }
        self.db.predictions.insert_one(prediction_doc)

        return {
            "prediction_id": prediction_id,
            "symbol": symbol,
            "model_name": model_name,
            "experiment_type": experiment_type,
            "horizon_days": horizon_days,
            "data_cutoff": data_cutoff_date,
            "prediction_date": now_iso,
            "predicted_class": predicted_class_name,
            "confidence": round(confidence, 4),
            "probabilities": prob_dict,
            "top_features": shap_res["top_features"],
            "sentiment_summary": sent_summary,
            "supporting_news": relevant_news,
            "disclaimer": (
                "This output is an experimental machine learning classification, not a guaranteed forecast "
                "or investment recommendation. Stock markets are uncertain, and historical model performance "
                "does not guarantee future results."
            )
        }

trend_predictor = TrendPredictor()

