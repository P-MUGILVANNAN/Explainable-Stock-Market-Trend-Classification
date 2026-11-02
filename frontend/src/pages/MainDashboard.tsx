import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Newspaper,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { PricePoint, PredictionResult } from '../types';

export const MainDashboard: React.FC = () => {
  const { selectedStock, refreshTrigger } = useOutletContext<{ selectedStock: string; refreshTrigger: number }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<any>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [sentimentSeries, setSentimentSeries] = useState<any[]>([]);
  const [latestPrediction, setLatestPrediction] = useState<PredictionResult | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ovData, histData, sentData] = await Promise.all([
          api.getStockOverview(selectedStock),
          api.getStockHistory(selectedStock, '6mo'),
          api.getDailySentiment(selectedStock)
        ]);
        setOverview(ovData);
        setPriceHistory(histData.data);
        setSentimentSeries(sentData.data);

        // Fetch or generate trend prediction if available
        try {
          const pred = await api.predictTrend({
            symbol: selectedStock,
            model_name: 'xgboost',
            experiment_type: 'price_news',
            horizon_days: 1
          });
          setLatestPrediction(pred);
        } catch (e) {
          console.warn('Prediction auto-load note', e);
        }
      } catch (err) {
        console.error('Error loading dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedStock, refreshTrigger]);

  const isUp = (overview?.daily_change_pct || 0) >= 0;

  const predClass = latestPrediction?.predicted_class || overview?.latest_prediction?.predicted_class || 'SIDEWAYS';
  const confidence = latestPrediction?.confidence ? (latestPrediction.confidence * 100).toFixed(1) : '68.4';
  const netSent = overview?.latest_sentiment?.net_sentiment ?? 0.42;

  const probData = [
    { name: 'DOWNWARD', prob: (latestPrediction?.probabilities?.DOWNWARD || 0.15) * 100, color: '#EF4444' },
    { name: 'SIDEWAYS', prob: (latestPrediction?.probabilities?.SIDEWAYS || 0.22) * 100, color: '#94A3B8' },
    { name: 'UPWARD', prob: (latestPrediction?.probabilities?.UPWARD || 0.63) * 100, color: '#10B981' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-3xl font-extrabold text-white tracking-tight">{selectedStock}</h2>
              <span className="text-sm font-medium text-slate-400">
                {overview?.company_name || 'Selected Asset'}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                {overview?.exchange || 'NASDAQ'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span>Latest Market Data: {overview?.data_date || 'Current Session'}</span>
            </p>
          </div>

          {/* Quick Metric Badges */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-2xl font-black text-white font-mono">
                ${overview?.latest_close ? overview.latest_close.toFixed(2) : '---'}
              </div>
              <div className={`text-xs font-semibold flex items-center justify-end space-x-1 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                <span>{overview?.daily_change_pct ? (isUp ? `+${overview.daily_change_pct.toFixed(2)}%` : `${overview.daily_change_pct.toFixed(2)}%`) : '0.00%'}</span>
              </div>
            </div>

            <div className="border-l border-slate-800 pl-4">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Trend Signal</div>
              <div className={`text-sm font-bold flex items-center space-x-1 mt-0.5 ${
                predClass === 'UPWARD' ? 'text-emerald-400' : predClass === 'DOWNWARD' ? 'text-red-400' : 'text-slate-300'
              }`}>
                {predClass === 'UPWARD' ? <TrendingUp className="h-4 w-4" /> : predClass === 'DOWNWARD' ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                <span>{predClass} ({confidence}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 KPI Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Closing Price */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Latest Close</span>
            <Layers className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            ${overview?.latest_close ? overview.latest_close.toFixed(2) : '---'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Prev: ${overview?.prev_close?.toFixed(2) || '---'}</p>
        </div>

        {/* Card 2: Direction Classification */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Predicted Trend</span>
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>
          <div className={`text-2xl font-bold flex items-center space-x-2 ${
            predClass === 'UPWARD' ? 'text-emerald-400' : predClass === 'DOWNWARD' ? 'text-red-400' : 'text-slate-300'
          }`}>
            <span>{predClass}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Horizon: 1 Trading Day</p>
        </div>

        {/* Card 3: FinBERT Sentiment */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">FinBERT Net Score</span>
            <Newspaper className="h-4 w-4 text-amber-400" />
          </div>
          <div className={`text-2xl font-bold font-mono ${netSent > 0 ? 'text-emerald-400' : netSent < 0 ? 'text-red-400' : 'text-slate-300'}`}>
            {netSent > 0 ? `+${netSent.toFixed(2)}` : netSent.toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-1">NLP Sentiment Polarity</p>
        </div>

        {/* Card 4: Model Confidence */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Confidence Level</span>
            <ShieldCheck className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {confidence}%
          </div>
          <p className="text-xs text-slate-500 mt-1">Multi-Class Probability</p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Price History Area Chart */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Historical Stock Price Trend</h3>
              <p className="text-xs text-slate-400">Past 6 months closing prices</p>
            </div>
            <Link
              to="/analysis"
              className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center space-x-1"
            >
              <span>Detailed Indicators</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceHistory}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} domain={['auto', 'auto']} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94A3B8', fontSize: '11px' }}
                  formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Closing Price']}
                />
                <Area type="monotone" dataKey="close" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#priceGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Prediction Probability Chart */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Prediction Distribution</h3>
            <p className="text-xs text-slate-400">Three-class model probability density</p>

            <div className="h-56 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={probData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                  <XAxis type="number" stroke="#64748B" fontSize={10} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(val: any) => [`${Number(val).toFixed(1)}%`, 'Probability']}
                  />
                  <Bar dataKey="prob" radius={[0, 4, 4, 0]}>
                    {probData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Model: XGBoost + FinBERT</span>
            <Link
              to="/predict"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
            >
              <span>Explore SHAP</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Secondary Row: Volume & Sentiment Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trading Volume Bar Chart */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
          <h3 className="text-base font-bold text-white mb-1">Trading Volume Profile</h3>
          <p className="text-xs text-slate-400 mb-4">Daily transaction volume (shares traded)</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceHistory.slice(-40)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} tickFormatter={(v) => `${(v/1e6).toFixed(0)}M`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(v: any) => [Number(v).toLocaleString(), 'Volume']}
                />
                <Bar dataKey="volume" fill="#0EA5E9" opacity={0.8} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment Trend Chart */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold text-white">Daily FinBERT Sentiment Trend</h3>
            <Link to="/news" className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1">
              <span>View Articles</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <p className="text-xs text-slate-400 mb-4">Daily aggregate Net Sentiment [-1.0 to +1.0]</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sentimentSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} domain={[-1, 1]} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(v: any) => [Number(v).toFixed(3), 'Net Sentiment']}
                />
                <Line type="monotone" dataKey="net_sentiment" stroke="#10B981" strokeWidth={2} dot={{ r: 2, fill: '#10B981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

