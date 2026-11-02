import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  History,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
  Eye
} from 'lucide-react';
import { api } from '../services/api';

export const PredictionHistoryPage: React.FC = () => {
  const { selectedStock } = useOutletContext<{ selectedStock: string }>();
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const [selectedPrediction, setSelectedPrediction] = useState<any | null>(null);

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);
      try {
        const symbolParam = filterSymbol === 'all' ? undefined : filterSymbol;
        const res = await api.getPredictions(symbolParam);
        setPredictions(res.data || []);
      } catch (err) {
        console.error('Failed to load predictions history', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [filterSymbol]);

  const handleExportCSV = () => {
    window.open(api.downloadReportUrl(selectedStock, 'xgboost', 1, 'csv'), '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2.5">
            <History className="h-6 w-6 text-blue-500" />
            <span>Empirical Prediction Audit & History</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit log of generated classifications, prediction dates, data cutoffs, and observable outcomes
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={filterSymbol}
            onChange={(e) => setFilterSymbol(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Ticker Symbols</option>
            <option value={selectedStock}>Active Symbol ({selectedStock})</option>
            <option value="AAPL">AAPL</option>
            <option value="MSFT">MSFT</option>
            <option value="NVDA">NVDA</option>
            <option value="TSLA">TSLA</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-xs text-left">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Prediction Date</th>
                <th className="py-3.5 px-4">Symbol</th>
                <th className="py-3.5 px-4">Horizon</th>
                <th className="py-3.5 px-4">Model & Pipeline</th>
                <th className="py-3.5 px-4">Predicted Class</th>
                <th className="py-3.5 px-4">Confidence</th>
                <th className="py-3.5 px-4">Actual Outcome</th>
                <th className="py-3.5 px-4">Evaluation Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {predictions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-sans">
                    No prediction records recorded yet. Generate predictions from the Trend Prediction page.
                  </td>
                </tr>
              ) : (
                predictions.map((p, idx) => {
                  const isUp = p.predicted_class === 'UPWARD';
                  const isDown = p.predicted_class === 'DOWNWARD';
                  const hasActual = Boolean(p.actual_class);
                  const isCorrect = hasActual && p.actual_class === p.predicted_class;

                  return (
                    <tr key={p.prediction_id || idx} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 text-slate-300">
                        {p.prediction_date ? p.prediction_date.replace('T', ' ').slice(0, 19) : '---'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">{p.symbol}</td>
                      <td className="py-3.5 px-4 text-slate-300">{p.horizon} Day(s)</td>
                      <td className="py-3.5 px-4 text-slate-400 font-sans">
                        <span className="font-semibold text-slate-200">{p.model_name?.toUpperCase()}</span>
                        <span className="text-[10px] block text-slate-500">{p.experiment_type}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block font-bold px-2 py-0.5 rounded text-[11px] ${
                            isUp
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : isDown
                              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                              : 'bg-slate-700/30 text-slate-300 border border-slate-600/30'
                          }`}
                        >
                          {p.predicted_class}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-200 font-bold">
                        {(p.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        {hasActual ? (
                          <span className={p.actual_class === 'UPWARD' ? 'text-emerald-400' : p.actual_class === 'DOWNWARD' ? 'text-red-400' : 'text-slate-300'}>
                            {p.actual_class}
                          </span>
                        ) : (
                          <span className="text-slate-500 flex items-center space-x-1 font-sans text-[11px]">
                            <Clock className="h-3 w-3" />
                            <span>Observing</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        {hasActual ? (
                          isCorrect ? (
                            <span className="flex items-center space-x-1 text-emerald-400 text-[11px] font-semibold">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>Correct</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1 text-red-400 text-[11px] font-semibold">
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Incorrect</span>
                            </span>
                          )
                        ) : (
                          <span className="text-slate-500 text-[11px]">Pending Future Market Close</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedPrediction(p)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                          title="View SHAP Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SHAP Modal Dialog */}
      {selectedPrediction && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Prediction Attribution Breakdown</h3>
              <button
                onClick={() => setSelectedPrediction(null)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Prediction ID:</span>
                <span className="font-mono text-slate-200">{selectedPrediction.prediction_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Predicted Class:</span>
                <span className="font-bold text-blue-400">{selectedPrediction.predicted_class}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Probability Vector:</span>
                <span className="font-mono text-slate-300">
                  UP: {((selectedPrediction.probabilities?.UPWARD || 0)*100).toFixed(1)}% |
                  SIDE: {((selectedPrediction.probabilities?.SIDEWAYS || 0)*100).toFixed(1)}% |
                  DOWN: {((selectedPrediction.probabilities?.DOWNWARD || 0)*100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-300 uppercase">Top Attributed SHAP Features:</h5>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {selectedPrediction.shap_explanation?.top_features?.map((f: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-slate-900 px-3 py-1.5 rounded-lg text-xs font-mono">
                    <span className="text-slate-300">{f.feature_name}</span>
                    <span className={f.shap_value >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {f.shap_value >= 0 ? `+${f.shap_value.toFixed(4)}` : f.shap_value.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedPrediction(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

