import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  LineChart,
  Newspaper,
  TrendingUp,
  Scale,
  BrainCircuit,
  History,
  ShieldCheck,
  Cpu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  onCloseMobile?: () => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile, isMobile = false }) => {
  const { user, isAdmin } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Stock Analysis', path: '/analysis', icon: LineChart },
    { name: 'News & FinBERT', path: '/news', icon: Newspaper },
    { name: 'Trend Prediction', path: '/predict', icon: TrendingUp },
    { name: 'Model Comparison', path: '/comparison', icon: Scale },
    { name: 'Explainable AI', path: '/explainability', icon: BrainCircuit },
    { name: 'Prediction History', path: '/history', icon: History },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Admin Panel', path: '/admin', icon: ShieldCheck });
  }

  return (
    <aside className="w-64 bg-[#111827] border-r border-slate-800 flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <Cpu className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg tracking-tight text-white flex items-center">
              Stock<span className="text-blue-500">XAI</span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">FinBERT + SHAP Lab</p>
          </div>
        </div>

        {isMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 sm:p-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
          Research Analytics
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => {
              if (isMobile && onCloseMobile) onCloseMobile();
            }}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`
            }
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Session Footer */}
      <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/40">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-400 shrink-0">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Guest User'}</p>
            <div className="flex items-center space-x-1.5">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${isAdmin ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              <p className="text-[10px] sm:text-[11px] text-slate-400 capitalize">{user?.role || 'Guest'}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
