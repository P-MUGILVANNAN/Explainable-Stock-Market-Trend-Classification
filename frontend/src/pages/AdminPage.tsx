import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Database,
  Cpu,
  Sliders,
  Play,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { SystemStatus, User } from '../types';

export const AdminPage: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [trainingHistory, setTrainingHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Threshold controls
  const [upwardThresh, setUpwardThresh] = useState<number>(0.005);
  const [downwardThresh, setDownwardThresh] = useState<number>(-0.005);
  const [defaultHorizon, setDefaultHorizon] = useState<number>(1);
  const [updateMsg, setUpdateMsg] = useState<string>('');

  // Trigger training controls
  const [trainSymbol, setTrainSymbol] = useState<string>('AAPL');
  const [trainModel, setTrainModel] = useState<string>('xgboost');
  const [trainPipeline, setTrainPipeline] = useState<string>('both');
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainResult, setTrainResult] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusRes, dashRes] = await Promise.all([
        api.getSystemStatus(),
        api.getAdminDashboard()
      ]);
      setStatus(statusRes);
      setUsers(dashRes.users || []);
      setTrainingHistory(dashRes.training_history || []);
      if (dashRes.thresholds) {
        setUpwardThresh(dashRes.thresholds.upward_threshold);
        setDownwardThresh(dashRes.thresholds.downward_threshold);
        setDefaultHorizon(dashRes.thresholds.default_horizon_days);
      }
    } catch (err) {
      console.error('Failed to load admin telemetry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateMsg('');
    try {
      await api.updateThresholds({
        upward_threshold: upwardThresh,
        downward_threshold: downwardThresh,
        default_horizon_days: defaultHorizon
      });
      setUpdateMsg('Classification thresholds updated successfully!');
    } catch (err) {
      console.error('Failed to update thresholds', err);
    }
  };

  const handleTriggerTraining = async () => {
    setIsTraining(true);
    setTrainResult('');
    try {
      const res = await api.trainModel({
        symbol: trainSymbol,
        model_name: trainModel,
        experiment_type: trainPipeline,
        horizon_days: defaultHorizon,
        upward_threshold: upwardThresh,
        downward_threshold: downwardThresh
      });
      setTrainResult(`Training job completed successfully for ${trainSymbol}!`);
      loadData();
    } catch (err: any) {
      setTrainResult(`Training failed: ${err?.response?.data?.detail || 'Error'}`);
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2.5">
          <ShieldCheck className="h-6 w-6 text-amber-400" />
          <span>Platform Administrator Operations</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          System telemetry, model lifecycle training, registered analysts, and classification hyperparameters
        </p>
      </div>

      {/* System Telemetry KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase">System Status</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">{status?.status || 'ONLINE'}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Database: {status?.is_mock_db ? 'In-Memory Mock' : 'MongoDB Live'}</p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase">Registered Users</span>
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{status?.registered_users_count || 0}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Accounts configured</p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase">Trained Models</span>
            <Cpu className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{status?.trained_models_count || 0}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">In Model Registry</p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase">Predictions Generated</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{status?.total_predictions_count || 0}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Audited records</p>
        </div>
      </div>

      {/* Two Column Layout: Model Training Trigger & Threshold Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trigger Training Job Card */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Play className="h-4 w-4 text-blue-500" />
              <span>Trigger Model Training & Evaluation Job</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Initiates chronological train/val/test splitting, training, and saves model artifacts to disk
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Stock Symbol</label>
              <select
                value={trainSymbol}
                onChange={(e) => setTrainSymbol(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="AAPL">AAPL - Apple Inc.</option>
                <option value="MSFT">MSFT - Microsoft Corp.</option>
                <option value="GOOGL">GOOGL - Alphabet Inc.</option>
                <option value="TSLA">TSLA - Tesla Inc.</option>
                <option value="NVDA">NVDA - NVIDIA Corp.</option>
                <option value="RELIANCE.NS">RELIANCE.NS - Reliance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Model Architecture</label>
              <select
                value={trainModel}
                onChange={(e) => setTrainModel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="xgboost">XGBoost Classifier</option>
                <option value="random_forest">Random Forest Classifier</option>
                <option value="logistic_regression">Logistic Regression</option>
                <option value="svm">Support Vector Machine</option>
                <option value="lstm">LSTM Neural Network</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Experiment Mode</label>
              <select
                value={trainPipeline}
                onChange={(e) => setTrainPipeline(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="both">Comparative Experiment (Price-Only vs Price+News)</option>
                <option value="price_news">Price + News Only</option>
                <option value="price_only">Price-Only Only</option>
              </select>
            </div>

            <button
              onClick={handleTriggerTraining}
              disabled={isTraining}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
            >
              <Cpu className={`h-4 w-4 ${isTraining ? 'animate-spin' : ''}`} />
              <span>{isTraining ? 'Training Pipelines...' : 'Start Training Run'}</span>
            </button>

            {trainResult && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-blue-300 font-mono">
                {trainResult}
              </div>
            )}
          </div>
        </div>

        {/* Hyperparameter Thresholds Configuration */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Sliders className="h-4 w-4 text-emerald-400" />
              <span>Classification Thresholds Configuration</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configurable cutoffs separating UPWARD, SIDEWAYS, and DOWNWARD target returns
            </p>
          </div>

          <form onSubmit={handleUpdateThresholds} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Upward Threshold (Current: {(upwardThresh * 100).toFixed(2)}%)
              </label>
              <input
                type="number"
                step="0.001"
                value={upwardThresh}
                onChange={(e) => setUpwardThresh(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono"
              />
              <span className="text-[10px] text-slate-500">Future return &gt; threshold is classified as UPWARD</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Downward Threshold (Current: {(downwardThresh * 100).toFixed(2)}%)
              </label>
              <input
                type="number"
                step="0.001"
                value={downwardThresh}
                onChange={(e) => setDownwardThresh(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono"
              />
              <span className="text-[10px] text-slate-500">Future return &lt; threshold is classified as DOWNWARD</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Default Prediction Horizon (Days)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={defaultHorizon}
                onChange={(e) => setDefaultHorizon(parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow transition-colors"
            >
              Update Classification Hyperparameters
            </button>

            {updateMsg && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{updateMsg}</span>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Users Management Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-1">Registered System Analysts</h3>
        <p className="text-xs text-slate-400 mb-4">View analysts and administrators with platform credentials</p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[550px] text-xs text-left">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4">Email Address</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Registered Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {users.map((u, i) => (
                <tr key={u.id || i} className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-4 font-sans font-bold text-white">{u.name}</td>
                  <td className="py-2.5 px-4 text-slate-300">{u.email}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold font-sans ${
                        u.role === 'admin'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-400">{u.created_at?.slice(0, 10) || '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

