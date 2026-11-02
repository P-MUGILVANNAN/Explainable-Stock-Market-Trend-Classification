import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AuthPage } from './pages/AuthPage';
import { MainDashboard } from './pages/MainDashboard';
import { StockAnalysisPage } from './pages/StockAnalysisPage';
import { NewsSentimentPage } from './pages/NewsSentimentPage';
import { PredictionPage } from './pages/PredictionPage';
import { ModelComparisonPage } from './pages/ModelComparisonPage';
import { ExplainableAIPage } from './pages/ExplainableAIPage';
import { PredictionHistoryPage } from './pages/PredictionHistoryPage';
import { AdminPage } from './pages/AdminPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requireAdmin?: boolean }> = ({
  children,
  requireAdmin = false
}) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-slate-400 text-sm">
        Initializing StockXAI Research Platform...
      </div>
    );
  }

  // Allow guest access or redirect to login if no credentials
  if (!user && !localStorage.getItem('token')) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<MainDashboard />} />
            <Route path="analysis" element={<StockAnalysisPage />} />
            <Route path="news" element={<NewsSentimentPage />} />
            <Route path="predict" element={<PredictionPage />} />
            <Route path="comparison" element={<ModelComparisonPage />} />
            <Route path="explainability" element={<ExplainableAIPage />} />
            <Route path="history" element={<PredictionHistoryPage />} />
            <Route
              path="admin"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

