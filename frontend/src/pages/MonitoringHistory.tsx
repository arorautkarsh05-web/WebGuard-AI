import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Download,
  Globe,
  Clock,
  Zap,
  ArrowUpDown,
  Code2,
  Layers,
  Activity,
  AlertCircle
} from 'lucide-react';
import type { TinyFishExecution } from '../types';
import { api } from '../api/client';

export const MonitoringHistory: React.FC = () => {
  const [executions, setExecutions] = useState<TinyFishExecution[]>([]);
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'latency_desc' | 'latency_asc'>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  const fetchExecutions = async () => {
    setIsLoading(true);
    try {
      const url = serviceFilter === 'ALL'
        ? '/tinyfish/executions'
        : `/tinyfish/executions?service_type=${serviceFilter.toLowerCase()}`;
      const res = await api.get(url);
      setExecutions(res.data);
    } catch (err) {
      console.error('Failed to fetch executions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
    setCurrentPage(1);
  }, [serviceFilter]);

  // Derived filtered & searched execution set
  const filteredExecutions = useMemo(() => {
    return executions.filter((exec) => {
      // Status filter
      if (statusFilter === 'SUCCESS' && exec.status !== 'success') return false;
      if (statusFilter === 'FAILED' && exec.status === 'success') return false;

      // Text search query across target URL, endpoint, query, title, or ID
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const targetUrl = (
          exec.request_params?.urls?.[0] ||
          exec.request_params?.url ||
          exec.request_params?.query ||
          ''
        ).toLowerCase();
        const endpoint = (exec.endpoint || '').toLowerCase();
        const title = (exec.response_summary?.title || '').toLowerCase();
        const id = (exec.id || '').toLowerCase();
        const error = (exec.response_summary?.error || exec.response_summary?.exception || '').toLowerCase();

        return (
          targetUrl.includes(q) ||
          endpoint.includes(q) ||
          title.includes(q) ||
          id.includes(q) ||
          error.includes(q)
        );
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'latency_desc') {
        return (b.execution_time_ms || 0) - (a.execution_time_ms || 0);
      }
      if (sortBy === 'latency_asc') {
        return (a.execution_time_ms || 0) - (b.execution_time_ms || 0);
      }
      return 0;
    });
  }, [executions, statusFilter, searchQuery, sortBy]);

  // Pagination slice
  const totalPages = Math.ceil(filteredExecutions.length / pageSize) || 1;
  const paginatedExecutions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExecutions.slice(start, start + pageSize);
  }, [filteredExecutions, currentPage]);

  // Telemetry Aggregates for Top Stat Cards
  const stats = useMemo(() => {
    const total = executions.length;
    const successes = executions.filter(e => e.status === 'success').length;
    const rate = total > 0 ? Math.round((successes / total) * 100) : 100;
    const totalLatency = executions.reduce((acc, curr) => acc + (curr.execution_time_ms || 0), 0);
    const avgLatency = total > 0 ? Math.round(totalLatency / total) : 0;

    return { total, successes, rate, avgLatency };
  }, [executions]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const exportAsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredExecutions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `webguard_audit_log_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getTargetInfo = (exec: TinyFishExecution) => {
    const p = exec.request_params || {};
    const url = p.urls?.[0] || p.url;
    if (url) {
      return { type: 'url', value: url, extra: p.goal || p.format || null };
    }
    if (p.query) {
      return { type: 'query', value: p.query, extra: p.location || null };
    }
    return { type: 'endpoint', value: exec.endpoint, extra: null };
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Context Description */}
      <div className="bg-[#0B0B0F]/80 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-40 bg-[#8B5CF6]/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#00E5FF] shadow-inner">
                <History className="w-5 h-5 text-[#00E5FF]" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Execution Audit Log & API History
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30">
                    Live Telemetry
                  </span>
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Chronological tamper-evident audit trail of all TinyFish API probes, synthetic agent runs, and background scans.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={exportAsJSON}
              disabled={filteredExecutions.length === 0}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white/80 hover:text-white flex items-center gap-1.5 transition disabled:opacity-40"
              title="Export current filtered view as JSON"
            >
              <Download className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>Export Audit</span>
            </button>
            <button
              onClick={fetchExecutions}
              disabled={isLoading}
              className="px-3.5 py-2 bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/30 border border-[#8B5CF6]/40 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition shadow-lg shadow-[#8B5CF6]/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#00E5FF] ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Syncing...' : 'Sync Logs'}</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/5">
          <div className="p-3 bg-[#0B0B0F]/90 rounded-xl border border-white/10">
            <div className="text-[11px] font-semibold text-white/50 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#8B5CF6]" /> Total Executions
            </div>
            <div className="text-lg font-black text-white mt-1 font-mono">{stats.total}</div>
          </div>

          <div className="p-3 bg-[#0B0B0F]/90 rounded-xl border border-white/10">
            <div className="text-[11px] font-semibold text-white/50 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" /> Success Rate
            </div>
            <div className="text-lg font-black text-emerald-400 mt-1 font-mono">
              {stats.rate}%
              <span className="text-[10px] text-white/40 font-normal ml-1.5">({stats.successes}/{stats.total})</span>
            </div>
          </div>

          <div className="p-3 bg-[#0B0B0F]/90 rounded-xl border border-white/10">
            <div className="text-[11px] font-semibold text-white/50 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#00E5FF]" /> Avg Roundtrip Latency
            </div>
            <div className="text-lg font-black text-[#00E5FF] mt-1 font-mono">
              {stats.avgLatency}ms
            </div>
          </div>

          <div className="p-3 bg-[#0B0B0F]/90 rounded-xl border border-white/10">
            <div className="text-[11px] font-semibold text-white/50 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-400" /> Active Filter Matches
            </div>
            <div className="text-lg font-black text-white mt-1 font-mono">
              {filteredExecutions.length}
              <span className="text-[10px] text-white/40 font-normal ml-1.5">records</span>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Multi-Facet Filter Toolbar */}
      <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-4 shadow-xl space-y-3">
        {/* Row 1: Service Category Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-white/50 mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#00E5FF]" /> Service:
            </span>
            {[
              { id: 'ALL', label: 'All Services' },
              { id: 'FETCH', label: 'Fetch API' },
              { id: 'AGENT', label: 'Agent (Deep)' },
              { id: 'AGENT_TURBO', label: 'Turbo Fast-Scan' },
              { id: 'SEARCH', label: 'Search API' }
            ].map((tab) => {
              const active = serviceFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setServiceFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    active
                      ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/20 font-extrabold'
                      : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
                  }`}
                >
                  {tab.id === 'AGENT_TURBO' && <Zap className="w-3 h-3 fill-current" />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Status Filter Toggle */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
            {[
              { id: 'ALL', label: 'All Status' },
              { id: 'SUCCESS', label: 'Success Only' },
              { id: 'FAILED', label: 'Failed Only' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  statusFilter === st.id
                    ? 'bg-[#8B5CF6] text-white shadow'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Live Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by target URL, keyword, title, or error..."
              className="w-full pl-9 pr-8 py-2 bg-[#0B0B0F]/90 border border-[#8B5CF6]/25 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00E5FF] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-[11px] text-white/50 font-medium flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-white/40" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-[#0B0B0F]/90 border border-white/10 rounded-xl text-xs text-white/80 focus:outline-none focus:border-[#00E5FF] transition"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="latency_desc">Highest Latency</option>
              <option value="latency_asc">Fastest (Lowest Latency)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Execution Table */}
      <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl overflow-hidden shadow-2xl">
        {filteredExecutions.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-[#8B5CF6]/40 mx-auto" />
            <div className="text-sm font-bold text-white">No Matching Execution Records Found</div>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              {searchQuery || serviceFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try broadening your search term or clearing the active filters above.'
                : 'Trigger functional tests, competitor scans, or change detections to populate this audit trail.'}
            </p>
            {(searchQuery || serviceFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setServiceFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="px-3.5 py-1.5 bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/30 border border-[#8B5CF6]/40 rounded-xl text-xs font-bold text-white transition"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0B0B0F]/95 border-b border-[#8B5CF6]/20 text-white/40 uppercase text-[10px] tracking-wider font-extrabold">
                  <tr>
                    <th className="px-5 py-3.5 w-48">Timestamp & Speed</th>
                    <th className="px-5 py-3.5 w-36">Service & Status</th>
                    <th className="px-5 py-3.5 min-w-[240px]">Target Operation</th>
                    <th className="px-5 py-3.5 min-w-[280px]">Telemetry & Discovered Insight</th>
                    <th className="px-5 py-3.5 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80">
                  {paginatedExecutions.map((exec) => {
                    const isExpanded = expandedId === exec.id;
                    const target = getTargetInfo(exec);
                    const summary = exec.response_summary || {};
                    const isSuccess = exec.status === 'success';

                    return (
                      <React.Fragment key={exec.id}>
                        <tr
                          onClick={() => setExpandedId(isExpanded ? null : exec.id)}
                          className={`hover:bg-[#8B5CF6]/10 transition cursor-pointer ${
                            isExpanded ? 'bg-[#8B5CF6]/10' : ''
                          }`}
                        >
                          {/* Column 1: Timestamp & Latency */}
                          <td className="px-5 py-4 align-top">
                            <div className="font-mono text-white text-[11px] font-medium">
                              {new Date(exec.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <div className="text-[10px] text-white/40 font-mono mt-0.5">
                              {new Date(exec.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10">
                              <Clock className="w-2.5 h-2.5 text-[#00E5FF]" />
                              <span className={
                                (exec.execution_time_ms || 0) < 1000
                                  ? 'text-emerald-400'
                                  : (exec.execution_time_ms || 0) < 4000
                                  ? 'text-[#00E5FF]'
                                  : 'text-amber-400'
                              }>
                                {Math.round(exec.execution_time_ms || 0)}ms
                              </span>
                            </div>
                          </td>

                          {/* Column 2: Service & Status */}
                          <td className="px-5 py-4 align-top space-y-1.5">
                            <div>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border ${
                                exec.service_type.includes('turbo')
                                  ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30'
                                  : exec.service_type === 'agent'
                                  ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30'
                                  : exec.service_type === 'search'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                              }`}>
                                {exec.service_type.includes('turbo') && <Zap className="w-2.5 h-2.5 fill-current" />}
                                {exec.service_type.replace('_', ' ')}
                              </span>
                            </div>

                            <div>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                isSuccess
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : 'text-red-400 bg-red-500/10'
                              }`}>
                                {isSuccess ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                                {isSuccess ? 'SUCCESS (200)' : 'FAILED'}
                              </span>
                            </div>
                          </td>

                          {/* Column 3: Target & Operation */}
                          <td className="px-5 py-4 align-top">
                            {target.type === 'url' ? (
                              <div className="space-y-1">
                                <a
                                  href={target.value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs font-bold text-white hover:text-[#00E5FF] flex items-center gap-1.5 group max-w-md break-all"
                                >
                                  <Globe className="w-3.5 h-3.5 text-[#00E5FF] flex-shrink-0" />
                                  <span className="truncate">{target.value}</span>
                                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition flex-shrink-0" />
                                </a>
                                {target.extra && (
                                  <p className="text-[11px] text-white/50 line-clamp-1 italic">
                                    "{target.extra}"
                                  </p>
                                )}
                                <div className="text-[10px] font-mono text-white/30 truncate">
                                  {exec.endpoint}
                                </div>
                              </div>
                            ) : target.type === 'query' ? (
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                  <Search className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                  <span className="font-semibold text-white/90">"{target.value}"</span>
                                </div>
                                <div className="text-[10px] font-mono text-white/30 truncate">
                                  {exec.endpoint}
                                </div>
                              </div>
                            ) : (
                              <div className="font-mono text-xs text-white/80 truncate max-w-sm">
                                {exec.endpoint}
                              </div>
                            )}
                          </td>

                          {/* Column 4: Telemetry & Discovered Insight */}
                          <td className="px-5 py-4 align-top">
                            <div className="space-y-1.5">
                              {/* Page Title if present */}
                              {summary.title && (
                                <div className="text-xs font-bold text-white flex items-center gap-1.5 line-clamp-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] flex-shrink-0" />
                                  <span className="truncate">{summary.title}</span>
                                </div>
                              )}

                              {/* Summary text / execution preview */}
                              {summary.summary_preview && (
                                <p className="text-[11px] text-white/60 line-clamp-2">
                                  {summary.summary_preview}
                                </p>
                              )}

                              {/* Structured Insight Tags */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {summary.content_length !== undefined && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/70">
                                    Size: {Math.round(summary.content_length / 1024 * 10) / 10} KB
                                  </span>
                                )}

                                {summary.format && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#00E5FF]">
                                    {summary.format.toUpperCase()}
                                  </span>
                                )}

                                {summary.steps_count !== undefined && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-white">
                                    {summary.steps_count} browser steps
                                  </span>
                                )}

                                {summary.assertions_count !== undefined && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                                    {summary.assertions_count} assertions {summary.all_passed ? 'passed' : 'evaluated'}
                                  </span>
                                )}

                                {summary.error && (
                                  <span className="text-[10px] text-red-300 bg-red-950/60 border border-red-500/30 px-2 py-0.5 rounded line-clamp-1">
                                    {summary.error}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Column 5: Expand / Collapse CTA */}
                          <td className="px-5 py-4 align-top text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId(isExpanded ? null : exec.id);
                              }}
                              className={`p-1.5 rounded-lg border transition ${
                                isExpanded
                                  ? 'bg-[#00E5FF] text-black border-[#00E5FF]'
                                  : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-white/10'
                              }`}
                              title={isExpanded ? 'Collapse Payload' : 'Inspect Full Telemetry'}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>

                        {/* Collapsible Inspection Panel */}
                        {isExpanded && (
                          <tr className="bg-black/60 border-y border-[#8B5CF6]/30">
                            <td colSpan={5} className="p-6 space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                                <div className="flex items-center gap-3 text-xs">
                                  <span className="font-extrabold text-white flex items-center gap-1.5">
                                    <Code2 className="w-4 h-4 text-[#00E5FF]" /> Execution Telemetry Inspector
                                  </span>
                                  <span className="font-mono text-white/40 text-[10px]">ID: {exec.id}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleCopy(JSON.stringify(exec, null, 2), `all-${exec.id}`)}
                                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[11px] font-semibold text-white/80 flex items-center gap-1 transition"
                                  >
                                    {copiedField === `all-${exec.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#00E5FF]" />}
                                    <span>{copiedField === `all-${exec.id}` ? 'Copied Full Audit!' : 'Copy Complete JSON'}</span>
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                                {/* Left Sub-box: Request Parameters */}
                                <div className="bg-[#0B0B0F] p-4 rounded-xl border border-white/10 space-y-2">
                                  <div className="flex items-center justify-between text-white/60 text-[11px] font-bold">
                                    <span>Request Parameters</span>
                                    <button
                                      onClick={() => handleCopy(JSON.stringify(exec.request_params || {}, null, 2), `req-${exec.id}`)}
                                      className="text-[10px] text-[#00E5FF] hover:underline flex items-center gap-1"
                                    >
                                      {copiedField === `req-${exec.id}` ? 'Copied!' : 'Copy'}
                                    </button>
                                  </div>
                                  <pre className="p-3 bg-black/50 rounded-lg text-[11px] text-white/80 overflow-x-auto max-h-56 leading-relaxed">
                                    {JSON.stringify(exec.request_params || {}, null, 2)}
                                  </pre>
                                </div>

                                {/* Right Sub-box: Response Summary */}
                                <div className="bg-[#0B0B0F] p-4 rounded-xl border border-white/10 space-y-2">
                                  <div className="flex items-center justify-between text-white/60 text-[11px] font-bold">
                                    <span>Parsed Telemetry Response</span>
                                    <button
                                      onClick={() => handleCopy(JSON.stringify(exec.response_summary || {}, null, 2), `res-${exec.id}`)}
                                      className="text-[10px] text-[#00E5FF] hover:underline flex items-center gap-1"
                                    >
                                      {copiedField === `res-${exec.id}` ? 'Copied!' : 'Copy'}
                                    </button>
                                  </div>
                                  <pre className="p-3 bg-black/50 rounded-lg text-[11px] text-emerald-300 overflow-x-auto max-h-56 leading-relaxed">
                                    {JSON.stringify(exec.response_summary || {}, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination & Footer Controls */}
            <div className="p-4 bg-[#0B0B0F]/90 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-white/50 text-[11px] font-mono">
                Showing <strong className="text-white">{Math.min(filteredExecutions.length, (currentPage - 1) * pageSize + 1)}</strong> to{' '}
                <strong className="text-white">{Math.min(filteredExecutions.length, currentPage * pageSize)}</strong> of{' '}
                <strong className="text-white">{filteredExecutions.length}</strong> executions
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white/70 hover:text-white disabled:opacity-30 transition"
                  >
                    Previous
                  </button>

                  <div className="px-3 py-1 bg-black/40 border border-white/10 rounded-xl font-mono text-[11px] text-[#00E5FF]">
                    {currentPage} / {totalPages}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white/70 hover:text-white disabled:opacity-30 transition"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};