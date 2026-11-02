import axios from 'axios';
import {
  StockItem,
  PricePoint,
  NewsArticle,
  PredictionResult,
  ExperimentComparisonData,
  SystemStatus,
  User
} from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // --- Auth ---
  register: async (data: any) => (await apiClient.post('/auth/register', data)).data,
  login: async (data: any) => (await apiClient.post('/auth/login', data)).data,
  getMe: async (): Promise<User> => (await apiClient.get('/auth/me')).data,

  // --- Stocks ---
  getStocks: async (): Promise<StockItem[]> => (await apiClient.get('/stocks')).data,
  getStock: async (symbol: string): Promise<StockItem> => (await apiClient.get(`/stocks/${symbol}`)).data,
  getStockHistory: async (symbol: string, period = '1y'): Promise<{ data: PricePoint[]; count: number }> =>
    (await apiClient.get(`/stocks/${symbol}/history?period=${period}`)).data,
  refreshStockData: async (symbol: string) => (await apiClient.post(`/stocks/${symbol}/fetch`, {})).data,
  uploadStockCSV: async (symbol: string, formData: FormData) =>
    (await apiClient.post(`/stocks/${symbol}/upload-csv`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data,

  // --- News & Sentiment ---
  getNews: async (symbol: string, limit = 40): Promise<{ articles: NewsArticle[]; count: number }> =>
    (await apiClient.get(`/news/${symbol}?limit=${limit}`)).data,
  refreshNews: async (symbol: string) => (await apiClient.post(`/news/${symbol}/fetch`, {})).data,
  getDailySentiment: async (symbol: string): Promise<{ data: any[]; count: number }> =>
    (await apiClient.get(`/news/${symbol}/sentiment`)).data,

  // --- Analysis ---
  getTechnicalAnalysis: async (symbol: string, period = '1y') =>
    (await apiClient.get(`/analysis/${symbol}/technical?period=${period}`)).data,
  getSentimentAnalysis: async (symbol: string) =>
    (await apiClient.get(`/analysis/${symbol}/sentiment`)).data,
  getStockOverview: async (symbol: string) =>
    (await apiClient.get(`/analysis/${symbol}/overview`)).data,

  // --- Machine Learning & Predictions ---
  predictTrend: async (data: {
    symbol: string;
    model_name: string;
    experiment_type: string;
    horizon_days: number;
    cutoff_date?: string;
  }): Promise<PredictionResult> => (await apiClient.post('/predict', data)).data,

  getPredictions: async (symbol?: string) =>
    (await apiClient.get(`/predictions${symbol ? `?symbol=${symbol}` : ''}`)).data,

  getPredictionById: async (id: string): Promise<PredictionResult> =>
    (await apiClient.get(`/predictions/${id}`)).data,

  trainModel: async (data: any) => (await apiClient.post('/models/train', data)).data,
  getModelComparison: async (symbol: string, model_name: string, horizon_days: number): Promise<ExperimentComparisonData> =>
    (await apiClient.get(`/models/comparison?symbol=${symbol}&model_name=${model_name}&horizon_days=${horizon_days}`)).data,

  // --- Explainability ---
  getGlobalImportance: async (symbol: string, model_name = 'xgboost', experiment_type = 'price_news') =>
    (await apiClient.get(`/explainability/global/${symbol}?model_name=${model_name}&experiment_type=${experiment_type}`)).data,

  // --- Reports ---
  downloadReportUrl: (symbol: string, model_name: string, horizon_days: number, format: 'pdf' | 'csv') =>
    `${API_BASE_URL}/reports/download?symbol=${symbol}&model_name=${model_name}&horizon_days=${horizon_days}&format=${format}`,

  // --- Admin ---
  getSystemStatus: async (): Promise<SystemStatus> => (await apiClient.get('/admin/system-status')).data,
  getAdminDashboard: async () => (await apiClient.get('/admin/dashboard')).data,
  getAdminUsers: async () => (await apiClient.get('/admin/users')).data,
  updateThresholds: async (data: any) => (await apiClient.post('/admin/thresholds', data)).data,
};
