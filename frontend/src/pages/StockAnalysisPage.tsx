import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Upload,
  Calendar,
  Layers,
  Activity,
  BarChart2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';
import { api } from '../services/api';

export const StockAnalysisPage: React.FC = () => {
  const { selectedStock, refreshTrigger } = useOutletContext<{ selectedStock: string; refreshTrigger: number }>();
  const [period, setPeriod] = useState<string>('1y');
  const [technicalData, setTechnicalData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadSuccess, setUploadSuccess] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  useEffect(() => {
    const fetchTech = async () => {
      setLoading(true);
      try {
        const res = await api.getTechnicalAnalysis(selectedStock, period);
        setTechnicalData(res.series || []);
      } catch (err) {
        console.error('Failed to load technical indicators', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTech();
  }, [selectedStock, period, refreshTrigger]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSuccess('');
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.uploadStockCSV(selectedStock, formData);
      setUploadSuccess(res.message || 'Dataset uploaded successfully!');
      // Reload indicators
      const updated = await api.getTechnicalAnalysis(selectedStock, period);
      setTechnicalData(updated.series || []);
    } catch (err: any) {
      setUploadError(err?.response?.data?.detail || 'Failed to upload CSV. Please verify required OHLCV columns.');
    } finally {
      setIsUploading(false);
    }
  };

  const [chartView, setChartView] = useState<'line' | 'ohlc'>('line');

  const latest = technicalData[technicalData.length - 1] || {};

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2">
            <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
            <span>Technical Indicator Suite</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mathematical momentum, trend, volatility, and volume indicators computed for {selectedStock}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Chart View Toggle */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-semibold">
            <button
              onClick={() => setChartView('line')}
              className={`px-2.5 py-1 rounded transition-colors ${chartView === 'line' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Indicators
            </button>
            <button
              onClick={() => setChartView('ohlc')}
              className={`px-2.5 py-1 rounded transition-colors ${chartView === 'ohlc' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Candlestick / OHLC
            </button>
          </div>

          {/* Period selector */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-semibold">
            {['1mo', '3mo', '6mo', '1y', '2y'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-md uppercase transition-colors ${
                  period === p ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Mode B: CSV Upload Button */}
          <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 rounded-lg cursor-pointer transition-colors">
            <Upload className="h-3.5 w-3.5 text-blue-400" />
            <span>{isUploading ? 'Uploading...' : 'Import CSV'}</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {uploadSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle className="h-4 w-4" />
          <span>{uploadSuccess}</span>
        </div>
      )}
      {uploadError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="h-4 w-4" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Snapshot Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">SMA (20)</span>
          <div className="text-base font-bold text-white font-mono mt-0.5">${latest.sma_20?.toFixed(2) || '---'}</div>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">SMA (50)</span>
          <div className="text-base font-bold text-white font-mono mt-0.5">${latest.sma_50?.toFixed(2) || '---'}</div>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">RSI (14)</span>
          <div className={`text-base font-bold font-mono mt-0.5 ${
            latest.rsi_14 > 70 ? 'text-red-400' : latest.rsi_14 < 30 ? 'text-emerald-400' : 'text-blue-400'
          }`}>
            {latest.rsi_14?.toFixed(1) || '---'}
          </div>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">MACD</span>
          <div className={`text-base font-bold font-mono mt-0.5 ${latest.macd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {latest.macd?.toFixed(3) || '---'}
          </div>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">BB Width</span>
          <div className="text-base font-bold text-slate-200 font-mono mt-0.5">{latest.bb_bandwidth?.toFixed(4) || '---'}</div>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">Rolling Volatility</span>
          <div className="text-base font-bold text-slate-200 font-mono mt-0.5">{latest.rolling_std_20?.toFixed(2) || '---'}</div>
        </div>
      </div>

      {/* Chart 1: Price with Bollinger Bands & Moving Averages OR OHLC / Candlestick */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-6">
        <h3 className="text-base font-bold text-white mb-1">
          {chartView === 'ohlc' ? 'OHLC & Price Range View' : 'Price Trend with Bollinger Bands & Moving Averages'}
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          {chartView === 'ohlc'
            ? 'High-low range and close price trajectories across trading sessions'
            : 'Close price, SMA 20, Upper & Lower 2-sigma Bollinger Bands'}
        </p>
        <div className="h-72 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === 'ohlc' ? (
              <ComposedChart data={technicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} domain={['auto', 'auto']} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="daily_return" fill="#3B82F6" name="Daily Return (%)" yAxisId={0} opacity={0.6} />
                <Line type="monotone" dataKey="close" stroke="#10B981" strokeWidth={2} dot={false} name="Close Price" />
                <Line type="monotone" dataKey="sma_10" stroke="#F59E0B" strokeWidth={1.5} dot={false} name="SMA (10)" />
              </ComposedChart>
            ) : (
              <ComposedChart data={technicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} domain={['auto', 'auto']} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="close" stroke="#3B82F6" strokeWidth={2} dot={false} name="Close Price" />
                <Line type="monotone" dataKey="sma_20" stroke="#F59E0B" strokeWidth={1.5} dot={false} name="SMA (20)" />
                <Line type="monotone" dataKey="bb_upper" stroke="#94A3B8" strokeDasharray="3 3" dot={false} name="BB Upper" />
                <Line type="monotone" dataKey="bb_lower" stroke="#94A3B8" strokeDasharray="3 3" dot={false} name="BB Lower" />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: RSI (14) Momentum Indicator */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-white">Relative Strength Index (RSI 14)</h3>
          <span className="text-xs text-slate-400">Overbought: 70 | Oversold: 30</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">Measures speed and change of price movements</p>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={technicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={10} domain={[0, 100]} tickLine={false} ticks={[20, 30, 50, 70, 80]} />
              <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }} />
              <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="3 3" label={{ value: '70 Overbought', fill: '#EF4444', fontSize: 10 }} />
              <ReferenceLine y={30} stroke="#10B981" strokeDasharray="3 3" label={{ value: '30 Oversold', fill: '#10B981', fontSize: 10 }} />
              <Line type="monotone" dataKey="rsi_14" stroke="#8B5CF6" strokeWidth={2} dot={false} name="RSI (14)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: MACD (Moving Average Convergence Divergence) */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-1">MACD Oscillator (12, 26, 9)</h3>
        <p className="text-xs text-slate-400 mb-4">MACD Line, 9-day Signal EMA, and Histogram Divergence</p>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={technicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="macd_hist" fill="#0EA5E9" name="MACD Histogram" />
              <Line type="monotone" dataKey="macd" stroke="#3B82F6" strokeWidth={1.5} dot={false} name="MACD" />
              <Line type="monotone" dataKey="macd_signal" stroke="#EF4444" strokeWidth={1.5} dot={false} name="Signal" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

