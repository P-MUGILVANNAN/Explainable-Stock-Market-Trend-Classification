import os
import time
import logging
import tempfile
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

os.environ["MPLCONFIGDIR"] = os.path.join(tempfile.gettempdir(), "matplotlib")
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import numpy as np
import pandas as pd
import joblib

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from xgboost import XGBClassifier
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score,
    precision_score, recall_score, f1_score,
    confusion_matrix, log_loss, brier_score_loss, roc_auc_score
)
from sklearn.preprocessing import label_binarize

from app.core.config import settings
from app.database.connection import get_db
from app.ml.feature_engineering.pipeline import feature_pipeline, PRICE_ONLY_FEATURES, PRICE_NEWS_FEATURES
from app.ml.feature_engineering.target_generator import LABEL_MAPPING

logger = logging.getLogger("app.ml.trainer")

class ModelTrainer:
    def __init__(self):
        self.db = get_db()
        self.storage_dir = settings.MODEL_STORAGE_PATH
        os.makedirs(self.storage_dir, exist_ok=True)

    def train_model(
        self,
        symbol: str,
        model_name: str,
        experiment_type: str, # "price_only" or "price_news"
        price_df: pd.DataFrame,
        sentiment_df: Optional[pd.DataFrame] = None,
        horizon_days: int = 1,
        upward_thresh: float = 0.005,
        downward_thresh: float = -0.005,
        test_ratio: float = 0.20,
        val_ratio: float = 0.10
    ) -> Dict[str, Any]:
        """
        Trains and validates specified model chronologically without data leakage.
        """
        start_time = datetime.now(timezone.utc)
        logger.info(f"Initiating training for {symbol} | Model: {model_name} | Exp: {experiment_type} | Horizon: {horizon_days}d")

        # 1. Prepare Features & Targets
        features_df, y, returns = feature_pipeline.prepare_dataset(
            price_df=price_df,
            sentiment_df=sentiment_df if experiment_type == "price_news" else None,
            horizon_days=horizon_days,
            upward_thresh=upward_thresh,
            downward_thresh=downward_thresh
        )

        selected_feature_cols = PRICE_NEWS_FEATURES if experiment_type == "price_news" else PRICE_ONLY_FEATURES

        # 2. Chronological Split & Training Scaler Fit
        split_data = feature_pipeline.chronological_split(
            X_df=features_df,
            y=y,
            feature_cols=selected_feature_cols,
            test_ratio=test_ratio,
            val_ratio=val_ratio
        )

        X_train, y_train = split_data["X_train"], split_data["y_train"]
        X_val, y_val = split_data["X_val"], split_data["y_val"]
        X_test, y_test = split_data["X_test"], split_data["y_test"]
        scaler = split_data["scaler"]

        # Ensure all 3 classes exist in train (or handle gracefully)
        unique_classes = np.unique(y_train)

        # 3. Model Architecture Instantiation & Fit
        trained_model = self._fit_model_algorithm(
            model_name=model_name.lower(),
            X_train=X_train,
            y_train=y_train,
            X_val=X_val,
            y_val=y_val
        )

        # 4. Out-of-Sample Evaluation on untouched Test Set
        metrics = self.evaluate_model(trained_model, model_name, X_test, y_test)

        # 5. Persist Artifacts
        version = f"{int(time.time())}"
        artifact_filename = f"{symbol}_{model_name}_{experiment_type}_h{horizon_days}_{version}.joblib"
        artifact_path = os.path.join(self.storage_dir, artifact_filename)

        save_dict = {
            "model": trained_model,
            "scaler": scaler,
            "feature_cols": selected_feature_cols,
            "model_name": model_name,
            "symbol": symbol,
            "experiment_type": experiment_type,
            "horizon_days": horizon_days,
            "upward_thresh": upward_thresh,
            "downward_thresh": downward_thresh,
            "version": version,
            "metrics": metrics,
            "trained_at": start_time.isoformat()
        }
        joblib.dump(save_dict, artifact_path)

        end_time = datetime.now(timezone.utc)

        # 6. Record in Database
        registry_doc = {
            "symbol": symbol,
            "model_name": model_name,
            "experiment_type": experiment_type,
            "version": version,
            "horizon_days": horizon_days,
            "training_date": start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "training_configuration": {
                "upward_threshold": upward_thresh,
                "downward_threshold": downward_thresh,
                "train_samples": int(len(X_train)),
                "val_samples": int(len(X_val)),
                "test_samples": int(len(X_test)),
                "feature_count": len(selected_feature_cols)
            },
            "evaluation_metrics": metrics,
            "artifact_path": artifact_path
        }
        self.db.model_registry.update_one(
            {"symbol": symbol, "model_name": model_name, "experiment_type": experiment_type, "horizon_days": horizon_days},
            {"$set": registry_doc},
            upsert=True
        )

        self.db.training_history.insert_one({
            "symbol": symbol,
            "model_name": model_name,
            "experiment_type": experiment_type,
            "horizon_days": horizon_days,
            "training_started": start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "training_completed": end_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "status": "COMPLETED",
            "metrics": metrics,
            "dataset_information": {
                "start_date": str(split_data["dates_train"][0]),
                "end_date": str(split_data["dates_test"][-1]),
                "total_samples": len(features_df)
            }
        })

        logger.info(f"Completed training {model_name} ({experiment_type}) for {symbol}. Test Accuracy: {metrics['accuracy']:.4f}")
        return {
            "registry_id": f"{symbol}_{model_name}_{experiment_type}",
            "metrics": metrics,
            "artifact_path": artifact_path,
            "version": version,
            "split_info": {
                "train_samples": len(X_train),
                "val_samples": len(X_val),
                "test_samples": len(X_test)
            }
        }

    def _fit_model_algorithm(
        self,
        model_name: str,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray
    ) -> Any:
        if model_name in ["logistic_regression", "lr"]:
            model = LogisticRegression(max_iter=1000, multi_class="multinomial", solver="lbfgs", random_state=42)
            model.fit(X_train, y_train)
            return model

        elif model_name in ["random_forest", "rf"]:
            model = RandomForestClassifier(n_estimators=100, max_depth=6, min_samples_split=4, random_state=42)
            model.fit(X_train, y_train)
            return model

        elif model_name in ["xgboost", "xgb"]:
            model = XGBClassifier(
                objective="multi:softprob",
                num_class=3,
                n_estimators=120,
                max_depth=4,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                eval_metric="mlogloss",
                random_state=42
            )
            model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
            return model

        elif model_name in ["svm", "svc"]:
            model = SVC(kernel="rbf", C=1.0, probability=True, random_state=42)
            model.fit(X_train, y_train)
            return model

        elif model_name in ["lstm", "neural_net"]:
            return self._fit_lstm(X_train, y_train, X_val, y_val)

        else:
            raise ValueError(f"Unsupported model name: {model_name}")

    def _fit_lstm(self, X_train: np.ndarray, y_train: np.ndarray, X_val: np.ndarray, y_val: np.ndarray) -> Any:
        """
        Sequence LSTM model implemented with PyTorch / TF compatibility wrapper.
        Uses lookback window = 5 trading days.
        """
        import torch
        import torch.nn as nn
        from torch.utils.data import TensorDataset, DataLoader

        lookback = 5
        def create_sequences(X, y, window):
            X_seq, y_seq = [], []
            for i in range(len(X) - window):
                X_seq.append(X[i:i + window])
                y_seq.append(y[i + window])
            return np.array(X_seq, dtype=np.float32), np.array(y_seq, dtype=np.int64)

        X_train_s, y_train_s = create_sequences(X_train, y_train, lookback)
        X_val_s, y_val_s = create_sequences(X_val, y_val, lookback)

        if len(X_train_s) < 10:
            # Fallback to Random Forest if dataset is too small for sequences
            rf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
            rf.fit(X_train, y_train)
            return rf

        class PyTorchLSTM(nn.Module):
            def __init__(self, input_dim, hidden_dim=32, num_classes=3):
                super().__init__()
                self.lstm = nn.LSTM(input_dim, hidden_dim, batch_first=True, num_layers=1)
                self.dropout = nn.Dropout(0.2)
                self.fc = nn.Linear(hidden_dim, num_classes)

            def forward(self, x):
                out, _ = self.lstm(x)
                out = self.dropout(out[:, -1, :])
                return self.fc(out)

            def predict_proba(self, X):
                self.eval()
                # If 2D array, create pseudo-sequences or repeat
                if len(X.shape) == 2:
                    # Expand to (N, 5, D) using last observations
                    X_exp = np.repeat(X[:, np.newaxis, :], lookback, axis=1).astype(np.float32)
                else:
                    X_exp = X.astype(np.float32)

                with torch.no_grad():
                    inputs = torch.tensor(X_exp)
                    logits = self.forward(inputs)
                    probs = torch.softmax(logits, dim=-1).numpy()
                return probs

            def predict(self, X):
                probs = self.predict_proba(X)
                return np.argmax(probs, axis=1)

        input_dim = X_train.shape[1]
        model = PyTorchLSTM(input_dim=input_dim, hidden_dim=32, num_classes=3)
        criterion = nn.CrossEntropyLoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=1e-4)

        train_dataset = TensorDataset(torch.tensor(X_train_s), torch.tensor(y_train_s))
        train_loader = DataLoader(train_dataset, batch_size=16, shuffle=False)

        model.train()
        for epoch in range(15):
            for batch_x, batch_y in train_loader:
                optimizer.zero_grad()
                outputs = model(batch_x)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()

        model.eval()
        return model

    def evaluate_model(
        self,
        model: Any,
        model_name: str,
        X_test: np.ndarray,
        y_test: np.ndarray
    ) -> Dict[str, Any]:
        """
        Calculates all research metrics:
        Accuracy, Balanced Acc, Precision, Recall, Macro F1, Log Loss, Brier Score, ROC-AUC, Confusion Matrix.
        """
        # Predictions & Probabilities
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X_test)
            preds = np.argmax(probs, axis=1)
        else:
            preds = model.predict(X_test)
            # Create one-hot probs
            probs = np.zeros((len(preds), 3))
            for i, p in enumerate(preds):
                probs[i, int(p)] = 1.0

        # Metrics
        acc = float(accuracy_score(y_test, preds))
        bal_acc = float(balanced_accuracy_score(y_test, preds))
        prec_macro = float(precision_score(y_test, preds, average="macro", zero_division=0))
        rec_macro = float(recall_score(y_test, preds, average="macro", zero_division=0))
        f1_mac = float(f1_score(y_test, preds, average="macro", zero_division=0))
        f1_wt = float(f1_score(y_test, preds, average="weighted", zero_division=0))

        # Log Loss & Brier Score
        try:
            # Ensure probs are clipped to prevent inf
            clipped_probs = np.clip(probs, 1e-7, 1.0 - 1e-7)
            # Normalize to sum to 1
            clipped_probs = clipped_probs / clipped_probs.sum(axis=1, keepdims=True)
            loss_val = float(log_loss(y_test, clipped_probs, labels=[0, 1, 2]))
        except Exception:
            loss_val = None

        # Multi-class Brier score = 1/N * sum((p_ij - y_ij)^2)
        try:
            y_bin = label_binarize(y_test, classes=[0, 1, 2])
            if y_bin.shape[1] == 1:
                # If only 2 classes present in y_test, expand to 3
                y_bin_3 = np.zeros((len(y_test), 3))
                for idx, c in enumerate(y_test):
                    y_bin_3[idx, c] = 1.0
                y_bin = y_bin_3
            brier_val = float(np.mean(np.sum((probs - y_bin) ** 2, axis=1)))
        except Exception:
            brier_val = None

        # ROC-AUC (One-vs-Rest)
        try:
            auc_val = float(roc_auc_score(y_test, probs, multi_class="ovr", average="macro", labels=[0, 1, 2]))
        except Exception:
            auc_val = None

        # Confusion Matrix
        cm = confusion_matrix(y_test, preds, labels=[0, 1, 2]).tolist()

        # Per-class metrics
        per_class = {}
        for class_idx, class_name in LABEL_MAPPING.items():
            y_binary = (y_test == class_idx).astype(int)
            pred_binary = (preds == class_idx).astype(int)
            per_class[class_name] = {
                "precision": round(float(precision_score(y_binary, pred_binary, zero_division=0)), 4),
                "recall": round(float(recall_score(y_binary, pred_binary, zero_division=0)), 4),
                "f1": round(float(f1_score(y_binary, pred_binary, zero_division=0)), 4),
                "support": int(np.sum(y_binary))
            }

        return {
            "accuracy": round(acc, 4),
            "balanced_accuracy": round(bal_acc, 4),
            "precision_macro": round(prec_macro, 4),
            "recall_macro": round(rec_macro, 4),
            "f1_macro": round(f1_mac, 4),
            "f1_weighted": round(f1_wt, 4),
            "log_loss": round(loss_val, 4) if loss_val is not None else None,
            "brier_score": round(brier_val, 4) if brier_val is not None else None,
            "roc_auc_macro": round(auc_val, 4) if auc_val is not None else None,
            "per_class_metrics": per_class,
            "confusion_matrix": cm,
            "classes": ["DOWNWARD", "SIDEWAYS", "UPWARD"],
            "sample_count": len(y_test)
        }

model_trainer = ModelTrainer()

