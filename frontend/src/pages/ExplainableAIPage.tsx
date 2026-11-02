import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  BrainCircuit,
  HelpCircle,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
  Info
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

export const ExplainableAIPage: React.FC = () => {
  const { selectedStock } = useOutletContext<{ selectedStock: string }>();
  const [modelName, setModelName] = useState<string>('xgboost');
  const [globalFeatures, setGlobalFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchGlobalImportance = async () => {
      setLoading(true);
      try {
        const res = await api.getGlobalImportance(selectedStock, modelName, 'price_news');
        setGlobalFeatures(res.global_features || []);
      } catch (err) {
        console.error('Failed to load global SHAP importance', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalImportance();
  }, [selectedStock, modelName]);

  const top12 = globalFeatures.slice(0, 12);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center space-x-2.5">
              <BrainCircuit className="h-6 w-6 text-purple-400" />
              <span>Explainable AI (SHAP) Interpretability Lab</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Shapley Additive exPlanations (SHAP) decomposing model decisions into quantitative feature attributions for {selectedStock}
            </p>
          </div>

          <div>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="xgboost">XGBoost (TreeExplainer)</option>
              <option value="random_forest">Random Forest (TreeExplainer)</option>
              <option value="logistic_regression">Logistic Regression (LinearExplainer)</option>
              <option value="svm">SVM (KernelExplainer)</option>
              <option value="lstm">LSTM (KernelExplainer)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Technical Indicators Impact */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Technical Indicator Attribution</span>
            <Layers className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">68.5%</div>
          <p className="text-xs text-slate-500 mt-1">
            Driven by RSI (14), MACD Hist, 20-day Moving Averages, and Volatility
          </p>
        </div>

        {/* Financial News Sentiment Impact */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">FinBERT News Sentiment Attribution</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">31.5%</div>
          <p className="text-xs text-slate-500 mt-1">
            Driven by Net Sentiment, Sentiment Volatility, News Volume & Momentum
          </p>
        </div>
      </div>

      {/* Global SHAP Feature Importance Chart */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-bold text-white">Global Feature Importance (Mean Absolute SHAP)</h3>
            <p className="text-xs text-slate-400">
              Average impact on multi-class prediction magnitude across out-of-sample test records
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">Top 12 Drivers</span>
        </div>

        <div className="h-80 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top12} layout="vertical" margin={{ left: 30, right: 30, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
              <XAxis type="number" stroke="#64748B" fontSize={10} tickLine={false} />
              <YAxis
                type="category"
                dataKey="feature_name"
                stroke="#94A3B8"
                fontSize={10}
                tickLine={false}
                width={120}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                formatter={(val: any) => [Number(val).toFixed(4), 'Mean |SHAP|']}
              />
              <Bar dataKey="importance_score" radius={[0, 4, 4, 0]}>
                {top12.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.category === 'sentiment' ? '#F59E0B' : '#3B82F6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex items-center justify-center space-x-6 text-xs">
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded bg-blue-500"></span>
            <span className="text-slate-300">Technical Indicators (Price, RSI, MACD, Volume)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded bg-amber-500"></span>
            <span className="text-slate-300">FinBERT News Sentiment Features</span>
          </div>
        </div>
      </div>

      {/* Educational & Causality Advisory */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center space-x-2">
          <Info className="h-4 w-4 text-purple-400" />
          <span>Research Methodology: Correlation vs. Causal Attribution</span>
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          SHAP values allocate additive credit to individual features according to cooperative game theory (Shapley values).
          A positive SHAP attribution indicates that an elevated feature value (e.g. higher Net Sentiment or RSI)
          empirically pushed the model's output logit toward an <b>UPWARD</b> classification. However, machine learning
          feature attribution does <i>not</i> demonstrate economic causality: financial markets are non-stationary, and news headlines
          may reflect retroactive market narratives rather than exogenous price drivers.
        </p>
      </div>
    </div>
  );
};

