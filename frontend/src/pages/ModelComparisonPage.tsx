import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Scale,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart3,
  TrendingUp,
  Cpu
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { api } from '../services/api';
import { ExperimentComparisonData } from '../types';

export const ModelComparisonPage: React.FC = () => {
  const { selectedStock } = useOutletContext<{ selectedStock: string }>();

  const [modelName, setModelName] = useState<string>('xgboost');
  const [horizonDays, setHorizonDays] = useState<number>(1);
  const [comparison, setComparison] = useState<ExperimentComparisonData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const loadComparison = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getModelComparison(selectedStock, modelName, horizonDays);
      setComparison(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to compute research comparison.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComparison();
  }, [selectedStock, modelName, horizonDays]);

  const metricsChartData = comparison ? [
    {
      metric: 'Accuracy',
      'Price-Only': Number((comparison.price_only_metrics.accuracy * 100).toFixed(1)),
      'Price + News': Number((comparison.price_news_metrics.accuracy * 100).toFixed(1)),
    },
    {
      metric: 'Balanced Acc',
      'Price-Only': Number((comparison.price_only_metrics.balanced_accuracy * 100).toFixed(1)),
      'Price + News': Number((comparison.price_news_metrics.balanced_accuracy * 100).toFixed(1)),
    },
    {
      metric: 'Macro F1',
      'Price-Only': Number((comparison.price_only_metrics.f1_macro * 100).toFixed(1)),
      'Price + News': Number((comparison.price_news_metrics.f1_macro * 100).toFixed(1)),
    },
    {
      metric: 'Precision',
      'Price-Only': Number((comparison.price_only_metrics.precision_macro * 100).toFixed(1)),
      'Price + News': Number((comparison.price_news_metrics.precision_macro * 100).toFixed(1)),
    },
    {
      metric: 'Recall',
      'Price-Only': Number((comparison.price_only_metrics.recall_macro * 100).toFixed(1)),
      'Price + News': Number((comparison.price_news_metrics.recall_macro * 100).toFixed(1)),
    }
  ] : [];

  const mA = comparison?.price_only_metrics;
  const mB = comparison?.price_news_metrics;
  const delta = comparison?.improvement_delta;
  const stat = comparison?.statistical_test;

  const downloadPdf = () => {
    window.open(api.downloadReportUrl(selectedStock, modelName, horizonDays, 'pdf'), '_blank');
  };

  const downloadCsv = () => {
    window.open(api.downloadReportUrl(selectedStock, modelName, horizonDays, 'csv'), '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center space-x-2.5">
              <Scale className="h-6 w-6 text-blue-500" />
              <span>Research Experiment: Price-Only vs. Price + FinBERT News</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Paired statistical comparison evaluating whether financial news sentiment improves trend classification for {selectedStock}
            </p>
          </div>

          {/* Download Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={downloadPdf}
              className="flex items-center space-x-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>Download PDF Report</span>
            </button>
            <button
              onClick={downloadCsv}
              className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Model and Horizon Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Model Evaluated</label>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="xgboost">XGBoost Classifier</option>
              <option value="random_forest">Random Forest Classifier</option>
              <option value="logistic_regression">Logistic Regression</option>
              <option value="svm">Support Vector Machine</option>
              <option value="lstm">LSTM Neural Network</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Prediction Horizon</label>
            <select
              value={horizonDays}
              onChange={(e) => setHorizonDays(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value={1}>1 Trading Day (Target: &gt; +0.5% / &lt; -0.5%)</option>
              <option value={3}>3 Trading Days</option>
              <option value={5}>5 Trading Days (1 Week)</option>
              <option value={10}>10 Trading Days (2 Weeks)</option>
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm">
          Training paired chronological pipelines and computing bootstrap tests...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {comparison && !loading && (
        <div className="space-y-6">
          {/* Comparative Metrics Bar Chart */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-1">Empirical Performance Comparison (%)</h3>
            <p className="text-xs text-slate-400 mb-4">
              Side-by-side evaluation on identical chronological test sample ({mA?.sample_count} trading sessions)
            </p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricsChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="metric" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(val: any) => [`${val}%`]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Price-Only" fill="#64748B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Price + News" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Metrics Comparative Table */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4">Quantitative Metric Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                    <th className="py-3 px-4">Metric</th>
                    <th className="py-3 px-4">Price-Only Baseline</th>
                    <th className="py-3 px-4">Price + FinBERT News</th>
                    <th className="py-3 px-4">Delta (Difference)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr>
                    <td className="py-3 px-4 font-sans font-medium text-slate-200">Accuracy</td>
                    <td className="py-3 px-4 text-slate-300">{((mA?.accuracy ?? 0) * 100).toFixed(2)}%</td>
                    <td className="py-3 px-4 text-blue-400 font-bold">{((mB?.accuracy ?? 0) * 100).toFixed(2)}%</td>
                    <td className={`py-3 px-4 font-bold ${Number(delta?.accuracy_delta) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {Number(delta?.accuracy_delta) >= 0 ? `+${(Number(delta?.accuracy_delta)*100).toFixed(2)}%` : `${(Number(delta?.accuracy_delta)*100).toFixed(2)}%`}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans font-medium text-slate-200">Balanced Accuracy</td>
                    <td className="py-3 px-4 text-slate-300">{((mA?.balanced_accuracy ?? 0) * 100).toFixed(2)}%</td>
                    <td className="py-3 px-4 text-blue-400 font-bold">{((mB?.balanced_accuracy ?? 0) * 100).toFixed(2)}%</td>
                    <td className={`py-3 px-4 font-bold ${Number(delta?.balanced_accuracy_delta) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {Number(delta?.balanced_accuracy_delta) >= 0 ? `+${(Number(delta?.balanced_accuracy_delta)*100).toFixed(2)}%` : `${(Number(delta?.balanced_accuracy_delta)*100).toFixed(2)}%`}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans font-medium text-slate-200">Macro F1-Score</td>
                    <td className="py-3 px-4 text-slate-300">{((mA?.f1_macro ?? 0) * 100).toFixed(2)}%</td>
                    <td className="py-3 px-4 text-blue-400 font-bold">{((mB?.f1_macro ?? 0) * 100).toFixed(2)}%</td>
                    <td className={`py-3 px-4 font-bold ${Number(delta?.macro_f1_delta) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {Number(delta?.macro_f1_delta) >= 0 ? `+${(Number(delta?.macro_f1_delta)*100).toFixed(2)}%` : `${(Number(delta?.macro_f1_delta)*100).toFixed(2)}%`}
                    </td>
                  </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-slate-200">Cross-Entropy Log Loss</td>
                  <td className="py-3 px-4 text-slate-300">{mA?.log_loss?.toFixed(4) || 'N/A'}</td>
                  <td className="py-3 px-4 text-slate-300">{mB?.log_loss?.toFixed(4) || 'N/A'}</td>
                  <td className="py-3 px-4 text-slate-400">{delta?.log_loss_reduction?.toFixed(4) || '---'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-slate-200">Brier Score (Calibration)</td>
                  <td className="py-3 px-4 text-slate-300">{mA?.brier_score?.toFixed(4) || 'N/A'}</td>
                  <td className="py-3 px-4 text-slate-300">{mB?.brier_score?.toFixed(4) || 'N/A'}</td>
                  <td className="py-3 px-4 text-slate-400">{delta?.brier_score_reduction?.toFixed(4) || '---'}</td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>

          {/* Confusion Matrices Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Confusion Matrix A */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
              <h4 className="text-sm font-bold text-white mb-1">Price-Only Confusion Matrix</h4>
              <p className="text-xs text-slate-400 mb-4">Actual (Rows) vs. Predicted (Columns)</p>
              <div className="grid grid-cols-4 gap-1 text-center font-mono text-xs">
                <div></div>
                <div className="text-[10px] text-slate-500 font-bold">PRED DOWN</div>
                <div className="text-[10px] text-slate-500 font-bold">PRED SIDE</div>
                <div className="text-[10px] text-slate-500 font-bold">PRED UP</div>

                {['ACT DOWN', 'ACT SIDE', 'ACT UP'].map((label, rIdx) => (
                  <React.Fragment key={label}>
                    <div className="text-[10px] text-slate-500 font-bold flex items-center justify-end pr-2">{label}</div>
                    {[0, 1, 2].map((cIdx) => {
                      const val = mA?.confusion_matrix?.[rIdx]?.[cIdx] ?? 0;
                      const isDiag = rIdx === cIdx;
                      return (
                        <div
                          key={cIdx}
                          className={`p-3 rounded-lg border ${
                            isDiag
                              ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          {val}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Confusion Matrix B */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
              <h4 className="text-sm font-bold text-white mb-1">Price + FinBERT Confusion Matrix</h4>
              <p className="text-xs text-slate-400 mb-4">Actual (Rows) vs. Predicted (Columns)</p>
              <div className="grid grid-cols-4 gap-1 text-center font-mono text-xs">
                <div></div>
                <div className="text-[10px] text-slate-500 font-bold">PRED DOWN</div>
                <div className="text-[10px] text-slate-500 font-bold">PRED SIDE</div>
                <div className="text-[10px] text-slate-500 font-bold">PRED UP</div>

                {['ACT DOWN', 'ACT SIDE', 'ACT UP'].map((label, rIdx) => (
                  <React.Fragment key={label}>
                    <div className="text-[10px] text-slate-500 font-bold flex items-center justify-end pr-2">{label}</div>
                    {[0, 1, 2].map((cIdx) => {
                      const val = mB?.confusion_matrix?.[rIdx]?.[cIdx] ?? 0;
                      const isDiag = rIdx === cIdx;
                      return (
                        <div
                          key={cIdx}
                          className={`p-3 rounded-lg border ${
                            isDiag
                              ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          {val}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Statistical Hypothesis Test & Research Conclusion Card */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Statistical Hypothesis Testing (500 Bootstrap Replications)</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase">95% Confidence Interval</span>
                <div className="font-bold text-slate-200 mt-0.5">
                  [{Number(stat?.ci_95_lower)*100 >= 0 ? `+${(Number(stat?.ci_95_lower)*100).toFixed(2)}%` : `${(Number(stat?.ci_95_lower)*100).toFixed(2)}%`}, {Number(stat?.ci_95_upper)*100 >= 0 ? `+${(Number(stat?.ci_95_upper)*100).toFixed(2)}%` : `${(Number(stat?.ci_95_upper)*100).toFixed(2)}%`}]
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase">p-Value</span>
                <div className="font-bold text-slate-200 mt-0.5">{stat?.p_value?.toFixed(4) || '---'}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Significance Test</span>
                <div className={`font-bold mt-0.5 ${stat?.statistically_significant ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {stat?.statistically_significant ? 'Statistically Significant (p < 0.05)' : 'Not Statistically Significant'}
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-950/30 border border-blue-800/40 rounded-xl text-xs text-blue-200 leading-relaxed">
              <span className="font-bold text-white">Empirical Research Finding: </span>
              {comparison.conclusion}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

