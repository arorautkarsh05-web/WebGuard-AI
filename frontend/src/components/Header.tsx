import React from 'react';
import { RefreshCw, User as UserIcon, Shield, LogOut } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onQuickAction?: () => void;
  quickActionLabel?: string;
  user?: any;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  isRefreshing = false,
  onQuickAction,
  quickActionLabel,
  user,
  onLogout,
}) => {
  return (
    <header className="h-16 border-b border-[#8B5CF6]/20 bg-[#0B0B0F]/75 backdrop-blur-xl sticky top-0 z-20 px-8 flex items-center justify-between select-none">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#8B5CF6]/30 shadow-md shadow-[#8B5CF6]/20 bg-[#0B0B0F]/80 md:hidden">
          <img src="/webguard-logo.png" alt="WebGuard AI" className="w-full h-full object-cover" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
            {title}
          </h2>
          <p className="text-xs text-white/50">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Project Brand Search / Quick Filter Bar */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B0B0F]/60 border border-[#8B5CF6]/25 focus-within:border-[#00E5FF] transition w-80 shadow-inner">
          <div className="w-5 h-5 rounded-md overflow-hidden shrink-0 border border-[#8B5CF6]/40">
            <img src="/webguard-logo.png" alt="WebGuard AI Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-[11px] font-extrabold text-white tracking-tight shrink-0">
            WebGuard <span className="text-[#00E5FF]">AI</span>
          </span>
          <span className="text-white/20">|</span>
          <input
            type="text"
            placeholder="Quick search endpoints, incidents..."
            className="bg-transparent text-xs text-white placeholder-white/30 focus:outline-none w-full"
          />
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl bg-[#0B0B0F] hover:bg-[#8B5CF6]/10 text-white/80 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold border border-white/10 disabled:opacity-50"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00E5FF] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        )}

        {onQuickAction && quickActionLabel && (
          <button
            onClick={onQuickAction}
            className="px-4 py-1.5 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white text-xs font-bold shadow-md shadow-[#8B5CF6]/25 transition"
          >
            + {quickActionLabel}
          </button>
        )}

        <div className="h-5 w-[1px] bg-white/10 mx-1"></div>

        {/* User Profile Pill */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6]">
            <UserIcon className="w-4 h-4 text-[#00E5FF]" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-white leading-tight">
              {user?.full_name || 'Security Admin'}
            </div>
            <div className="text-[10px] text-white/40 leading-tight font-mono">
              {user?.email || 'admin@webguard.ai'}
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Logout"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
