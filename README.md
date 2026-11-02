# Explainable Stock Market Trend Classification Using News and Price Data

[![Python Version](https://img.shields.io/badge/python-3.11%20%7C%203.12%20%7C%203.14-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg)](https://react.dev)
[![FinBERT](https://img.shields.io/badge/NLP-ProsusAI%2FFinBERT-orange.svg)](https://huggingface.co/ProsusAI/finbert)
[![SHAP](https://img.shields.io/badge/XAI-SHAP-red.svg)](https://github.com/shap/shap)
[![License](https://img.shields.io/badge/license-Academic%20Research-green.svg)]()

A complete, full-stack, research-oriented financial machine learning platform designed to classify future stock market directional trends (**UPWARD**, **SIDEWAYS**, **DOWNWARD**) by synthesizing historical stock market prices, technical indicators, and financial news sentiment analysis using **FinBERT** and **SHAP** explainability.

---

## 1. Primary Research Objective

The primary scientific inquiry investigated by this platform is:

> *"Does incorporating financial news sentiment improve stock market trend classification compared with models that use historical stock prices and technical indicators alone?"*

To address this question with empirical validity, the platform implements **strictly controlled, paired out-of-sample experiments**:
- **Experiment A (Price-Only Baseline)**: Inputs comprise historical OHLCV data, lagged returns, and 20+ technical indicators (SMA, EMA, MACD, RSI, Stochastic Oscillator, Bollinger Bands, ATR, OBV).
- **Experiment B (Price + FinBERT News)**: Integrates all technical indicators alongside FinBERT daily sentiment metrics (Net Sentiment, Recency-Weighted Sentiment, Sentiment Volatility, Sentiment Momentum, Article Volume, Pos/Neg Ratios).
- **Temporal Integrity**: Chronological train-validation-test splits (70/10/20) and walk-forward evaluations to prevent look-ahead bias and target leakage. Future information is strictly embargoed.

---

## 2. System Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │      React + TypeScript + Vite Dashboard     │
                  │   Tailwind CSS • Recharts • Lucide Icons     │
                  └──────────────────────┬───────────────────────┘
                                         │ Axios REST API / JWT
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                              FastAPI Backend Engine                               │
├─────────────────────┬──────────────────────┬──────────────────────────────────────┤
│ Authentication & RBAC│ Market Data Collector│ Financial News & FinBERT NLP         │
│ (JWT + Bcrypt)      │ (Yahoo Finance + CSV)│ (ProsusAI/finbert Daily Aggregator)  │
├─────────────────────┼──────────────────────┼──────────────────────────────────────┤
│ Technical Engine    │ Feature Pipeline     │ 5 Machine Learning Models            │
│ (RSI, MACD, BB, ATR)│ (Zero-Leakage Split) │ (XGBoost, RF, Logistic, SVM, LSTM)   │
├─────────────────────┼──────────────────────┼──────────────────────────────────────┤
│ SHAP Explainability │ Research Comparator  │ Report Generator                     │
│ (TreeExplainer/XAI) │ (Bootstrap Paired CI)│ (Downloadable PDF & CSV Research Doc)│
└─────────────────────┴──────────┬───────────┴──────────────────────────────────────┘
                                 │
                                 ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                    MongoDB Storage Layer (Atlas / Local / Mock)                   │
│  Collections: users, stocks, stock_prices, financial_news, daily_sentiment,       │
│               model_registry, predictions, training_history                       │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Frontend
- **Framework**: React.js 18 with TypeScript and Vite
- **Styling**: Tailwind CSS (Dark financial charcoal/navy `#0B0F19` theme)
- **Charts**: Recharts (Interactive area charts, composed technical indicators, candlestick/OHLCV, probability density bars)
- **Icons**: Lucide React
- **HTTP Client**: Axios with JWT interceptors
- **Routing**: React Router DOM v6

### Backend
- **Framework**: FastAPI (Python 3.11+) with Uvicorn
- **Data Schemas**: Pydantic v2
- **Data Science**: Pandas, NumPy, SciPy

### Machine Learning & NLP
- **Algorithms**:
  1. XGBoost Classifier (`XGBClassifier`)
  2. Random Forest Classifier (`RandomForestClassifier`)
  3. Multinomial Logistic Regression (`LogisticRegression`)
  4. Support Vector Machine (`SVC` with RBF kernel and calibrated probabilities)
  5. Long Short-Term Memory Neural Network (`LSTM` sequence model)
- **NLP Sentiment**: Hugging Face Transformers with `ProsusAI/finbert` (with high-speed offline fallback)
- **Explainable AI**: SHAP (TreeExplainer, LinearExplainer, KernelExplainer)
- **Report Generation**: ReportLab (Academic PDF generator)

### Database
- **Database**: MongoDB 7.0 (MongoDB Atlas or local daemon via PyMongo)
- **Resilience**: Automatic zero-latency fallback to `mongomock` when a local MongoDB daemon is not running.

---

## 4. Project Folder Structure

```
Explainable Stock Market Trend Classification/
├── backend/
│   ├── app/
│   │   ├── api/               # API Routers (auth, stocks, news, analysis, models, predict, explainability, admin, reports)
│   │   ├── core/              # Configuration & JWT Security
│   │   ├── database/          # MongoDB connection & index seeding
│   │   ├── ml/
│   │   │   ├── data_collection/    # yfinance & news collector
│   │   │   ├── feature_engineering/# Technical indicators & zero-leakage target generator
│   │   │   ├── finbert/            # FinBERT tokenizer & daily sentiment aggregator
│   │   │   ├── training/           # ModelTrainer for 5 architectures
│   │   │   ├── prediction/         # Interactive TrendPredictor
│   │   │   ├── evaluation/         # Research Comparator & Bootstrap CI
│   │   │   └── explainability/     # SHAP Explainer (Global & Local)
│   │   ├── schemas/           # Pydantic validation schemas
│   │   ├── services/          # ReportLab PDF & CSV generator
│   │   └── main.py            # FastAPI entry point
│   ├── datasets/              # Sample CSV datasets (Mode B)
│   ├── saved_models/          # Serialized model artifacts (.joblib)
│   ├── tests/                 # Comprehensive Pytest test suites
│   ├── requirements.txt       # Python dependencies
│   └── .env.example           # Environment template
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Navbar, Sidebar
│   │   ├── context/           # AuthContext
│   │   ├── layouts/           # DashboardLayout
│   │   ├── pages/             # 9 Complete Dashboard Pages
│   │   ├── services/          # Axios API client
│   │   └── types/             # TypeScript interfaces
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── docker-compose.yml         # Containerized deployment
├── pytest.ini                 # Pytest configuration
└── README.md                  # Comprehensive Documentation
```

---

## 5. Getting Started & Installation

### Prerequisites
- Python 3.11+ installed
- Node.js 18+ and npm installed
- Git installed
- MongoDB (Optional: The application automatically uses an in-memory database if MongoDB is not running locally).

### Step 1: Clone or Navigate to the Repository
```powershell
# Windows PowerShell
cd "d:\PROJECTS\Explainable Stock Market Trend Classification"
```

### Step 2: Backend Setup & Dependency Installation
```powershell
# Windows PowerShell
python -m pip install -r backend/requirements.txt
```

```bash
# Linux / macOS
python3 -m pip install -r backend/requirements.txt
```

### Step 3: Frontend Setup & Dependency Installation
```powershell
# Windows PowerShell / macOS / Linux
cd frontend
npm install
cd ..
```

---

## 6. Running the Application

### Option A: Running Locally in Development Mode

**Terminal 1: Start FastAPI Backend**
```powershell
# Windows PowerShell
$env:PYTHONPATH="backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

```bash
# Linux / macOS
PYTHONPATH=backend python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API will start at: `http://localhost:8000`  
Swagger API Documentation is available at: `http://localhost:8000/docs`

**Terminal 2: Start Vite React Frontend**
```powershell
cd frontend
npm run dev
```
The React frontend dashboard will start at: `http://localhost:5173`

### Option B: Running with Docker Compose
```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- MongoDB: `mongodb://localhost:27017`

---

## 7. Default Credentials

The platform is pre-seeded with two standard accounts for instant evaluation:

| Role | Email | Password | Privileges |
|------|-------|----------|------------|
| **Administrator** | `admin@stockxai.com` | `Admin@123456` | Full platform access, user management, trigger training, configure classification thresholds |
| **Research Analyst** | `user@stockxai.com` | `User@123456` | Dashboard, stock analysis, prediction, model comparison, reports download |

*(You can also use the one-click "Demo Analyst" or "Demo Admin" buttons on the login screen).*

---

## 8. Dashboard Pages Walkthrough

The platform includes 9 specialized, research-grade pages:

1. **Login & Registration (`/login`)**:
   - Secure JWT authentication with Bcrypt password hashing.
   - Role-based authorization toggle (Admin vs. User).
2. **Main Dashboard (`/`)**:
   - Selected asset KPIs (Latest close, daily change %, direction signal, FinBERT net sentiment, model confidence).
   - Past 6 months closing price area chart.
   - Three-class prediction probability distribution.
   - Historical volume and daily sentiment trend lines.
3. **Stock Analysis (`/analysis`)**:
   - Technical indicator suite: SMA (10, 20, 50), EMA (12, 26), Bollinger Bands (20, 2), RSI (14) with overbought (70) and oversold (30) levels, MACD oscillator (12, 26, 9) with histogram.
   - Mode B Research CSV Upload: Allows users to import custom historical OHLCV CSV files for backtesting.
4. **News & FinBERT Sentiment (`/news`)**:
   - Financial news feed related to the selected company.
   - Per-article FinBERT probability vectors (Positive, Negative, Neutral probabilities and confidence).
   - Aggregate sentiment distribution badges.
   - Filter articles by sentiment category or keyword search.
5. **Trend Prediction (`/predict`)**:
   - Interactive prediction generator: select model (XGBoost, Random Forest, Logistic Regression, SVM, LSTM), horizon (1d, 3d, 5d, 10d), and pipeline group (Price-Only vs. Price + News).
   - Outputs predicted class (`UPWARD`, `SIDEWAYS`, `DOWNWARD`), class probabilities, and local SHAP feature attribution waterfall.
   - Displays supporting financial news strictly published prior to the data cutoff.
6. **Model Comparison (`/comparison`)**:
   - **Core Research Dashboard**: Side-by-side comparison between Price-Only and Price + News pipelines evaluated on identical test records.
   - Quantitative metrics: Accuracy, Balanced Accuracy, Macro F1, Precision, Recall, Cross-Entropy Log Loss, and Brier Score.
   - Dual 3x3 Confusion Matrices.
   - Bootstrap 95% Confidence Interval and statistical significance test ($p$-value).
   - One-click PDF Research Report and CSV export.
7. **Explainable AI (`/explainability`)**:
   - Global Feature Importance chart (Mean absolute SHAP across test sample).
   - Quantitative attribution breakdown: Technical feature impact vs. FinBERT sentiment feature impact.
   - Research advisory on correlation versus economic causality.
8. **Prediction History (`/history`)**:
   - Complete audit trail of predictions generated by users.
   - Displays predicted class versus actual observable market outcome once the future trading session concludes.
   - Correctness badge and modal to view local SHAP explanations for any past prediction.
9. **Admin Panel (`/admin`)**:
   - System telemetry (MongoDB status, registered users, PyTorch version, CUDA status).
   - Manage registered users and view system activity.
   - Trigger training and evaluation jobs across models and tickers.
   - Modify classification thresholds (e.g. +0.5% upward cutoff, -0.5% downward cutoff).

---

## 9. Automated Testing

The backend includes a comprehensive automated test suite verifying data integrity, zero-leakage target computation, FinBERT aggregation, and API contracts:

```powershell
# Run all tests with Pytest
python -m pytest backend/tests -v
```

### Verified Test Suites:
- `test_auth.py`: Password hashing with Bcrypt, JWT token creation, decoding, and expiration.
- `test_technical_indicators.py`: Calculation of SMA, EMA, MACD, RSI, Bollinger Bands, and warm-up row handling.
- `test_sentiment.py`: FinBERT sentiment probability vectors, probability summation, and daily sentiment aggregation.
- `test_pipeline.py`: Chronological train/val/test splits, verification that max train date < min val date < min test date, training-only scaler fitting, target generation without lookahead bias.
- `test_comparator_and_api.py`: Controlled paired experiments, delta calculation, bootstrap tests, and FastAPI endpoints.

---

## 10. Research Methodology & Data Leakage Safeguards

Financial machine learning time-series models are susceptible to subtle methodological errors. This platform strictly enforces the following scientific safeguards:

1. **Chronological Splitting Only**: Random train-test splitting is strictly disallowed. The dataset is split sequentially: Train (70%), Validation (10%), Test (20%).
2. **Training-Only Scaler Fitting**: `StandardScaler` is fitted exclusively on the training subset and applied to validation and test subsets.
3. **No Lookahead Target Leakage**: Future returns are calculated as $(Close_{t + h} - Close_t) / Close_t$. The last $h$ trading days are purged from training and evaluation sets because their future return is unobservable.
4. **News Publication Cutoff**: News articles published after a trading session's cutoff date are strictly filtered out to prevent forward information leakage.
5. **Missing News Integrity**: Days without news are flagged with `news_available = 0` and sentiment features explicitly set to 0. They are never treated as neutral sentiment.
6. **Time-Aligned Out-of-Sample Comparisons**: Both Experiment A and Experiment B are tested on identical chronological observations.

---

## 11. Disclaimer

> **ACADEMIC & RESEARCH DISCLAIMER**:  
> This platform and its generated outputs are for educational, academic, and computational research purposes only. Stock markets are non-stationary, complex, and influenced by macroeconomic factors not captured by technical or news sentiment models. The predictions generated by these models do **not** constitute financial, investment, or trading advice. Past model performance is no guarantee of future results.

