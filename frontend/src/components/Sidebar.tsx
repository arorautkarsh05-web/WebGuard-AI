import React from 'react';
import {
  LayoutDashboard,
  Globe,
  Bot,
  TrendingUp,
  FileDiff,
  AlertTriangle,
  History,
  Settings,
  ShieldCheck,
  Radio,
  ExternalLink
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isTinyFishConnected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isTinyFishConnected,
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'websites', label: 'Website Health', icon: Globe },
    { id: 'testing', label: 'Functional Testing', icon: Bot, badge: 'TinyFish Agent' },
    { id: 'competitors', label: 'Competitor Intel', icon: TrendingUp, badge: 'TinyFish Search' },
    { id: 'changes', label: 'Change Detection', icon: FileDiff, badge: 'TinyFish Fetch' },
    { id: 'incidents', label: 'Incident Intel', icon: AlertTriangle },
    { id: 'history', label: 'Audit & History', icon: History },
    { id: 'settings', label: 'Settings & API', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen fixed left-0 top-0 select-none z-30">
      <div>
        {/* Brand Header */}
        <div className="p-5 flex items-center gap-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-wide flex items-center gap-1.5">
              WebGuard <span className="text-cyan-400">AI</span>
            </h1>
            <p className="text-[11px] text-slate-400">Autonomous Web Intel</p>
          </div>
        </div>

        {/* Live Provider Status */}
        <div className="mx-3 mt-3.5 mb-2 px-3 py-2 bg-slate-800/60 rounded-lg border border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className={`w-3.5 h-3.5 animate-pulse ${isTinyFishConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="text-xs font-medium text-slate-300">TinyFish Provider</span>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            isTinyFishConnected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            {isTinyFishConnected ? 'Connected' : 'Connecting'}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${
                    isActive ? 'bg-indigo-800/80 text-cyan-200' : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Version 2.0 (SaaS)</span>
          <span className="flex items-center gap-1 text-[11px] text-cyan-400">
            Protected <ShieldCheck className="w-3 h-3 text-emerald-400" />
          </span>
        </div>
      </div>
    </aside>
  );
};
