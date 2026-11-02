export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  created_at?: string;
}

export interface StockItem {
  symbol: string;
  company_name: string;
  exchange: string;
}

export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjusted_close: number;
  volume: number;
}

export interface FinBERTSentiment {
  positive: number;
  negative: number;
  neutral: number;
  predicted_label: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface NewsArticle {
  id?: string;
  symbol: string;
  title: string;
  description: string;
  source: string;
  url?: string;
  published_at: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentiment_probabilities?: FinBERTSentiment;
}

export interface DailySentimentRecord {
  symbol: string;
  date: string;
  positive_score: number;
  negative_score: number;
  neutral_score: number;
  net_sentiment: number;
  weighted_sentiment: number;
  sentiment_volatility: number;
  sentiment_momentum: number;
  article_count: number;
  news_available: number;
}

export interface FeatureContribution {
  feature_name: string;
  feature_value: number;
  shap_value: number;
  contribution: 'positive' | 'negative' | 'neutral';
  category: 'technical' | 'sentiment';
}

export interface PredictionResult {
  prediction_id: string;
  symbol: string;
  model_name: string;
  experiment_type: string;
  horizon_days: number;
  data_cutoff: string;
  prediction_date: string;
  predicted_class: 'UPWARD' | 'SIDEWAYS' | 'DOWNWARD';
  confidence: number;
  probabilities: {
    UPWARD: number;
    SIDEWAYS: number;
    DOWNWARD: number;
  };
  top_features: FeatureContribution[];
  sentiment_summary: {
    date: string;
    net_sentiment: number;
    positive_score: number;
    negative_score: number;
    article_count: number;
    sentiment_momentum: number;
  };
  supporting_news: NewsArticle[];
  disclaimer: string;
}

export interface ModelMetrics {
  accuracy: number;
  balanced_accuracy: number;
  precision_macro: number;
  recall_macro: number;
  f1_macro: number;
  f1_weighted: number;
  log_loss?: number;
  brier_score?: number;
  roc_auc_macro?: number;
  confusion_matrix: number[][];
  classes: string[];
  sample_count: number;
  per_class_metrics?: Record<string, {
    precision: number;
    recall: number;
    f1: number;
    support: number;
  }>;
}

export interface ExperimentComparisonData {
  symbol: string;
  model_name: string;
  horizon_days: number;
  test_period: {
    start: string;
    end: string;
  };
  price_only_metrics: ModelMetrics;
  price_news_metrics: ModelMetrics;
  improvement_delta: {
    accuracy_delta: number;
    balanced_accuracy_delta: number;
    macro_f1_delta: number;
    precision_macro_delta: number;
    recall_macro_delta: number;
    log_loss_reduction: number;
    brier_score_reduction: number;
  };
  statistical_test: {
    bootstrap_mean_diff: number;
    ci_95_lower: number;
    ci_95_upper: number;
    p_value: number;
    statistically_significant: boolean;
  };
  conclusion: string;
}

export interface SystemStatus {
  status: string;
  database: string;
  is_mock_db: boolean;
  registered_users_count: number;
  total_predictions_count: number;
  cached_stocks_count: number;
  news_articles_count: number;
  trained_models_count: number;
  cuda_available: boolean;
  torch_version: string;
}

