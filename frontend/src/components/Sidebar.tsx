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
  LogOut
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isTinyFishConnected: boolean;
  onLogout: () => void;
  user: any;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isTinyFishConnected,
  onLogout,
  user,
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'websites', label: 'Website Health Fleet', icon: Globe },
    { id: 'testing', label: 'Functional Testing', icon: Bot, badge: 'Agent' },
    { id: 'competitors', label: 'Competitor Intel', icon: TrendingUp, badge: 'Search' },
    { id: 'changes', label: 'Change Detection', icon: FileDiff, badge: 'Fetch' },
    { id: 'incidents', label: 'Incident Intel', icon: AlertTriangle },
    { id: 'actions', label: 'AI Action Center', icon: ShieldCheck, badge: 'Gate' },
    { id: 'history', label: 'Audit & Executions', icon: History },
    { id: 'settings', label: 'Settings & Security', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0B0B0F]/85 backdrop-blur-xl border-r border-[#8B5CF6]/20 flex flex-col justify-between h-screen fixed left-0 top-0 select-none z-30">
      <div>
        {/* Brand Header */}
        <div className="p-5 flex items-center gap-3 border-b border-[#8B5CF6]/15">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#8B5CF6]/40 flex items-center justify-center shadow-lg shadow-[#8B5CF6]/20 bg-[#0B0B0F]/80">
            <img src="/webguard-logo.png" alt="WebGuard AI Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-wide flex items-center gap-1.5">
              WebGuard <span className="text-[#00E5FF]">AI</span>
            </h1>
            <p className="text-[10px] text-white/50 tracking-wider uppercase font-semibold">Autonomous Web Intel</p>
          </div>
        </div>

        {/* Live Provider Status */}
        <div className="mx-3 mt-3.5 mb-2 px-3 py-2 bg-[#0B0B0F] rounded-xl border border-[#00E5FF]/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className={`w-3.5 h-3.5 animate-pulse ${isTinyFishConnected ? 'text-[#00E5FF]' : 'text-white/40'}`} />
            <span className="text-xs font-semibold text-white/80">TinyFish Fleet</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isTinyFishConnected
              ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30'
              : 'bg-white/5 text-white/50 border border-white/10'
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
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/25'
                    : 'text-white/60 hover:text-white hover:bg-[#8B5CF6]/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/40'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-extrabold ${
                    isActive
                      ? 'bg-black/30 text-[#00E5FF]'
                      : 'bg-[#0B0B0F] text-[#00E5FF] border border-[#00E5FF]/20'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Session & Logout Footer */}
      <div className="p-4 border-t border-[#8B5CF6]/15 bg-transparent">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">{user?.full_name || 'Enterprise Admin'}</div>
            <div className="text-[10px] text-white/50 truncate font-mono">{user?.email || 'admin@webguard.ai'}</div>
          </div>
          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-950/40 text-white/60 hover:text-red-400 border border-white/10 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/40 pt-2 border-t border-white/5">
          <span>Enterprise v2.0</span>
          <span className="text-[#00E5FF] flex items-center gap-1 font-semibold">
            Secured <ShieldCheck className="w-3 h-3 text-[#00E5FF]" />
          </span>
        </div>
      </div>
    </aside>
  );
};
