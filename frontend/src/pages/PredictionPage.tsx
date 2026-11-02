import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ShieldCheck,
  BrainCircuit,
  AlertTriangle,
  Play,
  Layers,
  Calendar,
  ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { PredictionResult } from '../types';

export const PredictionPage: React.FC = () => {
  const { selectedStock } = useOutletContext<{ selectedStock: string }>();

  const [modelName, setModelName] = useState<string>('xgboost');
  const [experimentType, setExperimentType] = useState<string>('price_news');
  const [horizonDays, setHorizonDays] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string>('');

  const handlePredict = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.predictTrend({
        symbol: selectedStock,
        model_name: modelName,
        experiment_type: experimentType,
        horizon_days: horizonDays
      });
      setPrediction(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Prediction failed. Please ensure historical price data is available.');
    } finally {
      setLoading(false);
    }
  };

  const probData = prediction ? [
    { name: 'DOWNWARD', prob: (prediction.probabilities.DOWNWARD || 0) * 100, color: '#EF4444' },
    { name: 'SIDEWAYS', prob: (prediction.probabilities.SIDEWAYS || 0) * 100, color: '#94A3B8' },
    { name: 'UPWARD', prob: (prediction.probabilities.UPWARD || 0) * 100, color: '#10B981' }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-blue-500" />
              <span>Interactive Stock Trend Classification</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select ML architecture, prediction horizon, and feature configuration for {selectedStock}
            </p>
          </div>

          <button
            onClick={handlePredict}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
          >
            <Play className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Evaluating Model & SHAP...' : 'Generate Prediction'}</span>
          </button>
        </div>

        {/* Form Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
          {/* Model Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Model Architecture</label>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="xgboost">XGBoost Classifier (Extreme Gradient Boosting)</option>
              <option value="random_forest">Random Forest Classifier (Ensemble Trees)</option>
              <option value="logistic_regression">Logistic Regression (L2 Multinomial)</option>
              <option value="svm">Support Vector Machine (RBF Kernel)</option>
              <option value="lstm">LSTM Neural Network (Sequence Recurrent)</option>
            </select>
          </div>

          {/* Experiment Pipeline */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Feature Pipeline Group</label>
            <select
              value={experimentType}
              onChange={(e) => setExperimentType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="price_news">Group B: Price + FinBERT News Sentiment</option>
              <option value="price_only">Group A: Price & Technical Indicators Only</option>
            </select>
          </div>

          {/* Horizon Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Prediction Horizon</label>
            <select
              value={horizonDays}
              onChange={(e) => setHorizonDays(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value={1}>1 Trading Day (+0.5% / -0.5% Threshold)</option>
              <option value={3}>3 Trading Days</option>
              <option value={5}>5 Trading Days (1 Trading Week)</option>
              <option value={10}>10 Trading Days (2 Trading Weeks)</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Prediction Output Results */}
      {prediction && (
        <div className="space-y-6">
          {/* Main Result Card */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Predicted Class */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Directional Classification
                </span>
                <div className={`text-4xl font-extrabold flex items-center space-x-3 ${
                  prediction.predicted_class === 'UPWARD'
                    ? 'text-emerald-400'
                    : prediction.predicted_class === 'DOWNWARD'
                    ? 'text-red-400'
                    : 'text-slate-300'
                }`}>
                  {prediction.predicted_class === 'UPWARD' && <TrendingUp className="h-9 w-9" />}
                  {prediction.predicted_class === 'DOWNWARD' && <TrendingDown className="h-9 w-9" />}
                  {prediction.predicted_class === 'SIDEWAYS' && <Minus className="h-9 w-9" />}
                  <span>{prediction.predicted_class}</span>
                </div>
                <p className="text-xs text-slate-400">
                  Target Cutoff: <span className="font-mono text-slate-200">{prediction.data_cutoff}</span>
                </p>
              </div>

              {/* Confidence */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Model Confidence
                </span>
                <div className="text-4xl font-extrabold text-white font-mono">
                  {(prediction.confidence * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-slate-400">
                  Pipeline: <span className="text-blue-400 font-semibold">{prediction.model_name.toUpperCase()}</span>
                </p>
              </div>

              {/* Probabilities Mini Bar */}
              <div className="space-y-2 bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-400 font-semibold">UPWARD</span>
                  <span className="font-mono text-white">{((prediction.probabilities.UPWARD || 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">SIDEWAYS</span>
                  <span className="font-mono text-white">{((prediction.probabilities.SIDEWAYS || 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-red-400 font-semibold">DOWNWARD</span>
                  <span className="font-mono text-white">{((prediction.probabilities.DOWNWARD || 0) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Local SHAP Feature Attribution Waterfall */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <BrainCircuit className="h-5 w-5 text-purple-400" />
                  <span>Local Prediction SHAP Attribution</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Specific feature contributions shifting classification score toward {prediction.predicted_class}
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">SHAP TreeExplainer</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {prediction.top_features.slice(0, 8).map((feat, i) => {
                const isPos = feat.shap_value > 0;
                const isNews = feat.category === 'sentiment';

                return (
                  <div
                    key={i}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-200">{feat.feature_name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.2 rounded-full ${
                            isNews
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {feat.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Raw Value: {feat.feature_value.toFixed(4)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs font-mono font-bold ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isPos ? `+${feat.shap_value.toFixed(4)}` : feat.shap_value.toFixed(4)}
                      </span>
                      <p className="text-[10px] text-slate-500 uppercase">{feat.contribution} signal</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Supporting News */}
          {prediction.supporting_news && prediction.supporting_news.length > 0 && (
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-1">Supporting Financial News Evidence</h3>
              <p className="text-xs text-slate-400 mb-4">
                Headlines strictly published prior to data cutoff timestamp ({prediction.data_cutoff})
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prediction.supporting_news.slice(0, 4).map((art, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{art.source}</span>
                      <span>{art.published_at?.slice(0, 10)}</span>
                    </div>
                    <h5 className="text-xs font-bold text-slate-200 hover:text-blue-400 transition-colors">
                      {art.title}
                    </h5>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-[11px] text-slate-400 italic leading-relaxed flex items-start space-x-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-300 not-italic">Scientific & Financial Disclaimer</p>
              <p>{prediction.disclaimer}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

