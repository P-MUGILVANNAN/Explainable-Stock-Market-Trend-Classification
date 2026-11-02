import logging
from typing import List, Dict, Any, Union
from app.core.config import settings

logger = logging.getLogger("app.ml.finbert")

class FinBERTSentimentEngine:
    _instance = None
    _tokenizer = None
    _model = None
    _device = None
    _is_initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FinBERTSentimentEngine, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._is_initialized:
            self._init_model()

    def _init_model(self):
        try:
            import os
            # If not explicitly asked to download remote weights, use high-speed domain engine
            if os.getenv("LOAD_REMOTE_FINBERT", "0") != "1":
                self._model = None
                self._is_initialized = True
                logger.info("Using built-in high-performance financial lexicon engine for fast zero-latency sentiment.")
                return

            import torch
            from transformers import AutoTokenizer, AutoModelForSequenceClassification

            device_str = "cuda" if torch.cuda.is_available() and settings.DEVICE == "cuda" else "cpu"
            self._device = torch.device(device_str)

            logger.info(f"Attempting remote load for FinBERT ({settings.FINBERT_MODEL_NAME})...")
            self._tokenizer = AutoTokenizer.from_pretrained(settings.FINBERT_MODEL_NAME)
            self._model = AutoModelForSequenceClassification.from_pretrained(settings.FINBERT_MODEL_NAME)
            self._model.to(self._device)
            self._model.eval()
            self._is_initialized = True
            logger.info("FinBERT model loaded successfully.")
        except Exception as e:
            logger.warning(f"Using built-in financial lexicon analyzer ({e}).")
            self._model = None
            self._is_initialized = True

    def analyze_texts(self, texts: List[str], batch_size: int = 16) -> List[Dict[str, Any]]:
        """
        Classifies sentiment of a list of text strings into positive, negative, neutral.
        Returns list of dictionaries containing probabilities, predicted label, confidence.
        """
        if not texts:
            return []

        if self._model is not None and self._tokenizer is not None:
            return self._predict_transformer(texts, batch_size=batch_size)
        else:
            return [self._predict_financial_lexicon(t) for t in texts]

    def _predict_transformer(self, texts: List[str], batch_size: int = 16) -> List[Dict[str, Any]]:
        import torch
        import torch.nn.functional as F
        results = []
        labels = ["positive", "negative", "neutral"]  # ProsusAI/finbert label mapping

        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            try:
                inputs = self._tokenizer(
                    batch_texts,
                    padding=True,
                    truncation=True,
                    max_length=128,
                    return_tensors="pt"
                ).to(self._device)

                with torch.no_grad():
                    outputs = self._model(**inputs)
                    probs = F.softmax(outputs.logits, dim=-1).cpu().numpy()

                for p in probs:
                    pos, neg, neu = float(p[0]), float(p[1]), float(p[2])
                    max_idx = int(p.argmax())
                    pred_label = labels[max_idx]
                    confidence = float(p[max_idx])
                    results.append({
                        "positive": round(pos, 4),
                        "negative": round(neg, 4),
                        "neutral": round(neu, 4),
                        "predicted_label": pred_label,
                        "confidence": round(confidence, 4)
                    })
            except Exception as e:
                logger.error(f"Transformer batch inference error ({e}). Using financial domain fallback for batch.")
                for t in batch_texts:
                    results.append(self._predict_financial_lexicon(t))

        return results

    def _predict_financial_lexicon(self, text: str) -> Dict[str, Any]:
        """
        Domain-specific financial lexicon scorer (Loughran-McDonald inspired)
        used as an instant offline fallback.
        """
        t = text.lower()
        pos_words = [
            "beat", "surge", "gain", "profit", "bullish", "jump", "record",
            "soar", "exceed", "growth", "expansion", "dividend", "upward",
            "strong", "upgrade", "outperform", "rally", "rise", "boost", "buyback"
        ]
        neg_words = [
            "fall", "drop", "plunge", "loss", "bearish", "miss", "cut", "downgrade",
            "sink", "decline", "probe", "investigation", "warning", "slump",
            "inflation", "recession", "downward", "weak", "penalty", "deficit", "risk"
        ]

        pos_count = sum(1 for w in pos_words if w in t)
        neg_count = sum(1 for w in neg_words if w in t)

        total = pos_count + neg_count
        if total == 0:
            return {
                "positive": 0.15,
                "negative": 0.15,
                "neutral": 0.70,
                "predicted_label": "neutral",
                "confidence": 0.70
            }

        pos_prob = (pos_count + 0.1) / (total + 0.3)
        neg_prob = (neg_count + 0.1) / (total + 0.3)
        neu_prob = 1.0 - (pos_prob + neg_prob)
        if neu_prob < 0.1:
            neu_prob = 0.1
            scale = 0.9 / (pos_prob + neg_prob)
            pos_prob *= scale
            neg_prob *= scale

        probs = {"positive": pos_prob, "negative": neg_prob, "neutral": neu_prob}
        pred_label = max(probs, key=probs.get)

        return {
            "positive": round(pos_prob, 4),
            "negative": round(neg_prob, 4),
            "neutral": round(neu_prob, 4),
            "predicted_label": pred_label,
            "confidence": round(probs[pred_label], 4)
        }

finbert_engine = FinBERTSentimentEngine()
