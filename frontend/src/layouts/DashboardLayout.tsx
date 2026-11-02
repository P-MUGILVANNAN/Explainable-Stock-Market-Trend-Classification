import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { api } from '../services/api';

export const DashboardLayout: React.FC = () => {
  const [selectedStock, setSelectedStock] = useState<string>('AAPL');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        api.refreshStockData(selectedStock),
        api.refreshNews(selectedStock)
      ]);
      setRefreshTrigger(prev => prev + 1);
    } catch (e) {
      console.error('Refresh error', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0B0F19] text-slate-100 overflow-hidden">
      {/* Desktop & Tablet Sidebar (hidden on mobile, visible on lg and up) */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar onCloseMobile={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* Mobile Slide-Over Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer content */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#111827] z-50 shadow-2xl">
            <Sidebar onCloseMobile={() => setIsMobileMenuOpen(false)} isMobile={true} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          selectedStock={selectedStock}
          onSelectStock={setSelectedStock}
          onRefreshData={handleRefresh}
          isRefreshing={isRefreshing}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet context={{ selectedStock, setSelectedStock, refreshTrigger }} />
          </div>
        </main>
      </div>
    </div>
  );
};
