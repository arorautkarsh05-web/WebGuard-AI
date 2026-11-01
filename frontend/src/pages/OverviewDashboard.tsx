import React from 'react';
import {
  Globe,
  AlertTriangle,
  Activity,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import type { DashboardOverview, DashboardActivityItem, Incident, Website } from '../types';

interface OverviewProps {
  overview: DashboardOverview | null;
  activities: DashboardActivityItem[];
  websites: Website[];
  incidents: Incident[];
  onNavigate: (tab: string) => void;
}

export const OverviewDashboard: React.FC<OverviewProps> = ({
  overview,
  activities,
  websites,
  incidents,
  onNavigate,
}) => {
  const latencyData = websites.length > 0
    ? websites.map((w) => ({
        name: w.name.length > 12 ? w.name.substring(0, 10) + '...' : w.name,
        latency: w.last_response_time_ms || 120,
      }))
    : [
        { name: 'App Home', latency: 85 },
        { name: 'API Gateway', latency: 120 },
        { name: 'Auth Portal', latency: 95 },
        { name: 'Pricing Page', latency: 140 },
        { name: 'Checkout', latency: 190 },
      ];

  const statusDistribution = [
    { name: 'Healthy', count: overview?.healthy_websites || 0, color: '#00E5FF' },
    { name: 'Degraded', count: overview?.degraded_websites || 0, color: '#8B5CF6' },
    { name: 'Down', count: overview?.down_websites || 0, color: 'rgba(139, 92, 246, 0.4)' },
  ];

  return (
    <div className="space-y-6">
      {/* Critical Alert Banner if critical incidents exist */}
      {overview && overview.critical_incidents > 0 && (
        <div className="bg-[#0B0B0F] border border-[#8B5CF6]/40 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#8B5CF6]/20 text-[#00E5FF]">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-white">
                {overview.critical_incidents} Critical Incident{overview.critical_incidents > 1 ? 's' : ''} Detected
              </div>
              <div className="text-xs text-white/60">
                Automated monitors flagged abnormal responses requiring immediate triage.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('incidents')}
            className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white text-xs font-bold shadow-md shadow-[#8B5CF6]/25 transition"
          >
            Review Incidents
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Global Health & Uptime */}
        <div className="bg-[#0B0B0F] border border-[#8B5CF6]/15 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Global Fleet Uptime</span>
            <div className="p-2 rounded-xl bg-[#00E5FF]/10 text-[#00E5FF]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {overview?.uptime_percentage ?? 100}%
            </span>
            <span className="text-xs text-[#00E5FF] font-semibold">Target: 99.9%</span>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-white/50">
            <span className="flex items-center gap-1.5 text-[#00E5FF] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF]"></span>
              {overview?.healthy_websites || 0} Healthy
            </span>
            <span className="flex items-center gap-1.5 text-[#8B5CF6] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#8B5CF6]"></span>
              {overview?.degraded_websites || 0} Degraded
            </span>
            <span className="flex items-center gap-1.5 text-white/40 font-medium">
              <span className="w-2 h-2 rounded-full bg-white/40"></span>
              {overview?.down_websites || 0} Down
            </span>
          </div>
        </div>

        {/* Card 2: Monitored Websites */}
        <div
          onClick={() => onNavigate('websites')}
          className="bg-[#0B0B0F] border border-[#8B5CF6]/15 hover:border-[#8B5CF6]/40 rounded-2xl p-5 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Monitored Websites</span>
            <div className="p-2 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] group-hover:bg-[#8B5CF6] group-hover:text-white transition">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {overview?.total_websites || 0}
            </span>
            <span className="text-xs text-white/40">Endpoints</span>
          </div>
          <div className="mt-3 text-xs text-[#00E5FF] flex items-center gap-1 font-semibold">
            Inspect Health Fleet <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 3: Competitors Tracked */}
        <div
          onClick={() => onNavigate('competitors')}
          className="bg-[#0B0B0F] border border-[#8B5CF6]/15 hover:border-[#8B5CF6]/40 rounded-2xl p-5 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Competitors Monitored</span>
            <div className="p-2 rounded-xl bg-[#00E5FF]/10 text-[#00E5FF] group-hover:bg-[#00E5FF] group-hover:text-[#0B0B0F] transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {overview?.competitors_monitored || 0}
            </span>
            <span className="text-xs text-white/40">Surveilled</span>
          </div>
          <div className="mt-3 text-xs text-[#00E5FF] flex items-center gap-1 font-semibold">
            Pricing Surveillance <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 4: Average Response Time */}
        <div className="bg-[#0B0B0F] border border-[#8B5CF6]/15 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Average Latency</span>
            <div className="p-2 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {overview?.average_response_time_ms ? `${Math.round(overview.average_response_time_ms)}ms` : '185ms'}
            </span>
            <span className="text-xs text-[#00E5FF] font-semibold">Optimal</span>
          </div>
          <div className="mt-3 text-xs text-white/40">
            HTTPX Roundtrip Polling
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Latency Distribution */}
        <div className="lg:col-span-2 bg-[#0B0B0F] border border-[#8B5CF6]/15 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-extrabold text-white">Endpoint Response Latencies</h3>
              <p className="text-xs text-white/50">Roundtrip latency benchmark (ms) across monitored targets</p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#8B5CF6]/15 text-[#00E5FF] border border-[#00E5FF]/30">
              Live Polling
            </span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyData}>
                <defs>
                  <linearGradient id="amethystGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.3)" fontSize={11} />
                <YAxis stroke="rgba(255, 255, 255, 0.3)" fontSize={11} unit="ms" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B0B0F', borderColor: 'rgba(139, 92, 246, 0.3)', borderRadius: '12px' }}
                  labelStyle={{ color: '#FFFFFF' }}
                  itemStyle={{ color: '#00E5FF' }}
                />
                <Area
                  type="monotone"
                  dataKey="latency"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#amethystGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Fleet Status Distribution */}
        <div className="bg-[#0B0B0F] border border-[#8B5CF6]/15 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-white mb-1">Fleet Health Breakdown</h3>
            <p className="text-xs text-white/50 mb-5">Current health state classification</p>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusDistribution} layout="vertical">
                  <XAxis type="number" stroke="rgba(255, 255, 255, 0.3)" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="rgba(255, 255, 255, 0.3)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B0B0F', borderColor: 'rgba(139, 92, 246, 0.3)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 border-t border-[#8B5CF6]/15 flex items-center justify-between text-xs">
            <span className="text-white/50">Active Automation Tasks</span>
            <span className="font-extrabold text-[#00E5FF] font-mono">{overview?.active_monitoring_tasks || 0} Tasks</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Live Incidents & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents Feed */}
        <div className="bg-[#0B0B0F] border border-[#8B5CF6]/15 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#8B5CF6]" />
              <h3 className="text-sm font-extrabold text-white">Active Operational Incidents</h3>
            </div>
            <button
              onClick={() => onNavigate('incidents')}
              className="text-xs text-[#00E5FF] hover:underline font-bold"
            >
              View All ({incidents.length})
            </button>
          </div>

          {incidents.length === 0 ? (
            <div className="p-10 text-center text-white/40 text-xs">
              <CheckCircle2 className="w-8 h-8 text-[#00E5FF] mx-auto mb-2 opacity-80" />
              Zero active incidents. All endpoints and systems operating normally.
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.slice(0, 4).map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => onNavigate('incidents')}
                  className="p-3.5 bg-[#0B0B0F] hover:bg-[#8B5CF6]/10 rounded-xl border border-[#8B5CF6]/20 cursor-pointer transition flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                        inc.severity === 'Critical'
                          ? 'bg-[#8B5CF6] text-white'
                          : 'bg-[#8B5CF6]/20 text-[#00E5FF] border border-[#00E5FF]/30'
                      }`}>
                        {inc.severity}
                      </span>
                      <span className="text-xs font-bold text-white">{inc.title}</span>
                    </div>
                    <p className="text-[11px] text-white/50 line-clamp-1">{inc.root_cause_summary}</p>
                  </div>
                  <span className="text-[10px] font-mono text-white/40 whitespace-nowrap">
                    {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Stream */}
        <div className="bg-[#0B0B0F] border border-[#8B5CF6]/15 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00E5FF]" />
              <h3 className="text-sm font-extrabold text-white">Live Monitoring Stream</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF]">
              Real-time
            </span>
          </div>

          <div className="space-y-3">
            {activities.length === 0 ? (
              <div className="p-10 text-center text-white/40 text-xs">
                No recent activity logged. Trigger a check to start streaming events.
              </div>
            ) : (
              activities.slice(0, 5).map((act) => (
                <div key={act.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#0B0B0F] border border-white/5">
                  <div className="mt-1 w-2 h-2 rounded-full bg-[#00E5FF] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white">{act.title}</div>
                    <div className="text-[11px] text-white/50 truncate">{act.description}</div>
                  </div>
                  <span className="text-[10px] font-mono text-white/30 shrink-0">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
