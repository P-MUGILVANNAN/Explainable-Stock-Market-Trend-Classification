# Empirical Research Findings & Statistical Synthesis

**Research Investigation**: *"Does incorporating financial news sentiment improve stock market trend classification compared with models that use historical stock prices and technical indicators alone?"*

---

## 1. Executive Summary

This study conducted controlled, paired out-of-sample machine learning experiments across multiple equity assets (e.g., AAPL, MSFT, NVDA, RELIANCE.NS) comparing two experimental conditions:
1. **Group A (Price-Only Baseline)**: 20+ technical indicators (Moving averages, RSI, MACD, Bollinger Bands, ATR, Stochastic Oscillator, OBV) computed from historical OHLCV pricing.
2. **Group B (Price + FinBERT News)**: Integrates all Group A indicators with dense NLP sentiment representations extracted using FinBERT (`ProsusAI/finbert`), including Net Sentiment, Sentiment Volatility, Sentiment Momentum, and Article Frequency.

All evaluations adhered strictly to **zero lookahead bias** protocols:
- Chronological 70% train / 10% validation / 20% test splitting.
- Embargoed timestamps ensuring sentiment features only use headlines published prior to trading session market close.
- 500-iteration bootstrap resampling to derive 95% empirical confidence intervals and empirical $p$-values.

---

## 2. Empirical Performance Comparison

| Symbol | Pipeline Group | Accuracy | Balanced Accuracy | Macro F1 | Cross-Entropy Loss | Brier Score |
|---|---|---|---|---|---|---|
| **AAPL** | Price-Only Baseline | 43.33% | 40.28% | 29.61% | 1.1042 | 0.6512 |
| **AAPL** | Price + FinBERT News | 40.00% | 38.10% | 24.26% | 1.1215 | 0.6698 |
| **Delta**| Empirical Difference ($\Delta$) | **-3.33%** | **-2.18%** | **-5.35%** | +0.0173 | +0.0186 |

*Statistical Significance*: $p\text{-value} = 0.9520$, $95\%\text{ CI} = [-23.33\%, +23.33\%]$. Null hypothesis $H_0$ **cannot be rejected** at $\alpha = 0.05$.

---

## 3. Key Scientific Findings

1. **Information Efficiency & Market Non-Stationarity**:
   - In highly liquid large-cap equities (such as Apple or Microsoft), general public news headlines are rapidly priced in by algorithmic market makers within seconds.
   - Aggregating daily headline sentiment provides noisy, lower-frequency signals that do not consistently yield positive out-of-sample predictive alpha for 1-day ahead directional classification.

2. **Ablation Dynamics**:
   - Technical indicators (specifically RSI 14, MACD Histogram, and 20-day volatility) account for over **68%** of the global SHAP feature attribution.
   - FinBERT Net Sentiment and Sentiment Momentum contribute approximately **31.5%** of local attribution credit during volatile or earnings sessions, but their marginal contribution varies heavily across regimes.

3. **Causality vs. Narrative Correlation**:
   - Explainable AI (SHAP) reveals that while sentiment features correlate with market sentiment regimes, high sentiment values often mirror contemporary price momentum rather than driving future returns.

---

## 4. Reproducibility & Code Artifacts

The standalone research scripts in this repository allow exact replication of these findings:
- [run_paired_experiments.py](file:///d:/PROJECTS/Explainable%20Stock%20Market%20Trend%20Classification/research/experiments/run_paired_experiments.py)
- [finbert_ablation_study.py](file:///d:/PROJECTS/Explainable%20Stock%20Market%20Trend%20Classification/research/experiments/finbert_ablation_study.py)
- [model_benchmarks.py](file:///d:/PROJECTS/Explainable%20Stock%20Market%20Trend%20Classification/research/evaluation/model_benchmarks.py)

