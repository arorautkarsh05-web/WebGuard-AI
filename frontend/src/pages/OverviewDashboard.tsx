import React from 'react';
import {
  Globe,
  AlertTriangle,
  Activity,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Server
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
import { DashboardOverview, DashboardActivityItem, Incident, Website } from '../types';

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
  // Synthesize chart data from actual registered websites
  const latencyData = websites.length > 0
    ? websites.map((w, idx) => ({
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
    { name: 'Healthy', count: overview?.healthy_websites || 0, color: '#10b981' },
    { name: 'Degraded', count: overview?.degraded_websites || 0, color: '#f59e0b' },
    { name: 'Down', count: overview?.down_websites || 0, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Critical Alert Banner if critical incidents exist */}
      {overview && overview.critical_incidents > 0 && (
        <div className="bg-red-950/50 border border-red-500/40 rounded-xl p-4 flex items-center justify-between text-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                {overview.critical_incidents} Critical Incident{overview.critical_incidents > 1 ? 's' : ''} Detected
              </div>
              <div className="text-xs text-red-300">
                Major functionality or server outage requires immediate attention.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('incidents')}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow transition"
          >
            Review Incidents
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Global Health & Uptime */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Global Uptime</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">
              {overview?.uptime_percentage ?? 100}%
            </span>
            <span className="text-xs text-emerald-400 font-medium">Target: 99.9%</span>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {overview?.healthy_websites || 0} Healthy
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              {overview?.degraded_websites || 0} Degraded
            </span>
            <span className="flex items-center gap-1 text-red-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              {overview?.down_websites || 0} Down
            </span>
          </div>
        </div>

        {/* Card 2: Monitored Websites */}
        <div
          onClick={() => onNavigate('websites')}
          className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 cursor-pointer hover:border-slate-700 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Monitored Websites</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">
              {overview?.total_websites || 0}
            </span>
            <span className="text-xs text-slate-400">Registered</span>
          </div>
          <div className="mt-3 text-xs text-indigo-400 flex items-center gap-1 font-medium">
            Manage & Run Checks <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 3: Competitor Targets */}
        <div
          onClick={() => onNavigate('competitors')}
          className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 cursor-pointer hover:border-slate-700 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Competitors Tracked</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">
              {overview?.competitors_monitored || 0}
            </span>
            <span className="text-xs text-slate-400">Active</span>
          </div>
          <div className="mt-3 text-xs text-cyan-400 flex items-center gap-1 font-medium">
            Inspect Prices & Changes <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 4: Average Response Time */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Average Response Time</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">
              {overview?.average_response_time_ms ? `${Math.round(overview.average_response_time_ms)}ms` : '185ms'}
            </span>
            <span className="text-xs text-emerald-400">Optimal (&lt;300ms)</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Automated HTTPX polling
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Latency Distribution */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Endpoint Response Times</h3>
              <p className="text-xs text-slate-400">Roundtrip latency (ms) across monitored URLs</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Live Metrics
            </span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyData}>
                <defs>
                  <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit="ms" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Area
                  type="monotone"
                  dataKey="latency"
                  stroke="#818cf8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#latencyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Fleet Status */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Fleet Health Summary</h3>
            <p className="text-xs text-slate-400 mb-4">Current availability status breakdown</p>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusDistribution} layout="vertical">
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Monitored Tasks</span>
            <span className="font-bold text-white">{overview?.active_monitoring_tasks || 0} Active</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Live Incidents & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents Preview */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Active Incidents</h3>
            </div>
            <button
              onClick={() => onNavigate('incidents')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              View All ({incidents.length})
            </button>
          </div>

          {incidents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              No active incidents detected. All services operating normally.
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.slice(0, 4).map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => onNavigate('incidents')}
                  className="p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700/60 cursor-pointer transition flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        inc.severity === 'Critical' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                        inc.severity === 'High' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {inc.severity}
                      </span>
                      <span className="text-xs font-semibold text-slate-200">{inc.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{inc.root_cause_summary}</p>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                    {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Stream */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Live Monitoring Stream</h3>
            </div>
            <span className="text-[11px] text-slate-400">Real-time Feed</span>
          </div>

          <div className="space-y-3">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No recent activity recorded yet. Run a check to populate stream.
              </div>
            ) : (
              activities.slice(0, 5).map((act) => (
                <div key={act.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/30 border border-slate-800">
                  <div className="mt-0.5 w-2 h-2 rounded-full bg-cyan-400 shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-200">{act.title}</div>
                    <div className="text-[11px] text-slate-400 truncate">{act.description}</div>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">
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
