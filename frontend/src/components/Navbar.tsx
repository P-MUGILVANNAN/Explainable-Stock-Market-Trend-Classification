import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  LogOut,
  Sparkles,
  Database,
  Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StockItem } from '../types';

interface NavbarProps {
  selectedStock: string;
  onSelectStock: (symbol: string) => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedStock,
  onSelectStock,
  onRefreshData,
  isRefreshing = false,
  onToggleMobileMenu
}) => {
  const { logout } = useAuth();
  const [stocks, setStocks] = useState<StockItem[]>([]);

  useEffect(() => {
    const loadStocks = async () => {
      try {
        const data = await api.getStocks();
        setStocks(data);
      } catch (e) {
        console.error('Failed to load stocks list', e);
      }
    };
    loadStocks();
  }, []);

  return (
    <header className="h-16 bg-[#111827]/95 backdrop-blur border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile Menu Toggle & Stock Selector */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden transition-colors"
          title="Open Navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Stock Picker */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-900 border border-slate-800 rounded-lg px-2 sm:px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedStock}
            onChange={(e) => onSelectStock(e.target.value)}
            className="bg-transparent text-xs sm:text-sm font-semibold text-slate-200 focus:outline-none cursor-pointer max-w-[130px] sm:max-w-none"
          >
            {stocks.map((s) => (
              <option key={s.symbol} value={s.symbol} className="bg-slate-900 text-slate-200">
                {s.symbol} {s.company_name ? `- ${s.company_name}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Sync Button */}
        <button
          onClick={onRefreshData}
          disabled={isRefreshing}
          className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition-colors disabled:opacity-50"
          title="Sync live prices & news"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          <span className="hidden sm:inline">Sync Live</span>
        </button>
      </div>

      {/* Right: Telemetry & Actions */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Pipeline Pill (hidden on mobile, visible on tablet and desktop) */}
        <div className="hidden md:flex items-center space-x-2 bg-blue-950/40 border border-blue-800/50 rounded-full px-3 py-1 text-xs text-blue-300">
          <Sparkles className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <span>FinBERT NLP + SHAP</span>
        </div>

        {/* DB Status (hidden on mobile/tablet, visible on desktop) */}
        <div className="hidden xl:flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
          <Database className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>MongoDB Ready</span>
        </div>

        {/* Sign Out */}
        <button
          onClick={logout}
          className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
