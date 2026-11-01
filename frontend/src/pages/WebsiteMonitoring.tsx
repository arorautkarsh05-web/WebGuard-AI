import React, { useState } from 'react';
import {
  Globe,
  Plus,
  RefreshCw,
  ExternalLink,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { Website } from '../types';
import { api } from '../api/client';

interface WebsiteMonitoringProps {
  websites: Website[];
  onRefresh: () => void;
}

export const WebsiteMonitoring: React.FC<WebsiteMonitoringProps> = ({
  websites,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [frequency, setFrequency] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await api.post('/websites', {
        name,
        url,
        check_frequency_minutes: Number(frequency),
      });
      setName('');
      setUrl('');
      setShowAddModal(false);
      setSuccessMessage('Website registered successfully and initial health check executed.');
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to register website.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunCheck = async (websiteId: string) => {
    setCheckingId(websiteId);
    try {
      await api.post(`/websites/${websiteId}/check`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to trigger health check.');
    } finally {
      setCheckingId(null);
    }
  };

  const handleDelete = async (websiteId: string, siteName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${siteName}?`)) return;
    try {
      await api.delete(`/websites/${websiteId}`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete website.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
          </span>
        );
      case 'degraded':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3.5 h-3.5" /> Degraded
          </span>
        );
      case 'down':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
            <XCircle className="w-3.5 h-3.5" /> Outage / Down
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <HelpCircle className="w-3.5 h-3.5" /> Unknown
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            Website Health Monitoring Fleet
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous HTTP health checks, response time benchmarking, redirect validation, and SSRF-hardened monitoring.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Register New Website
        </button>
      </div>

      {successMessage && (
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Website Table / Cards */}
      {websites.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-xl">
          <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-300">No Monitored Websites Yet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Add your web application or public URL to begin automated latency tracking, error detection, and uptime monitoring.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition"
          >
            Register First Website
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Website Name & URL</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Response Time</th>
                  <th className="px-5 py-3.5">HTTP Status</th>
                  <th className="px-5 py-3.5">Check Interval</th>
                  <th className="px-5 py-3.5">Last Checked</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {websites.map((site) => (
                  <tr key={site.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        {site.name}
                      </div>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-0.5"
                      >
                        {site.url}
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(site.health_status)}
                    </td>
                    <td className="px-5 py-4 font-mono font-medium">
                      {site.last_response_time_ms ? (
                        <span className={site.last_response_time_ms > 2000 ? 'text-amber-400' : 'text-slate-200'}>
                          {Math.round(site.last_response_time_ms)}ms
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {site.last_status_code ? (
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          site.last_status_code < 400 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          HTTP {site.last_status_code}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      Every {site.check_frequency_minutes}m
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-[11px]">
                      {site.last_checked_at
                        ? new Date(site.last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : 'Pending'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRunCheck(site.id)}
                          disabled={checkingId === site.id}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 text-[11px] flex items-center gap-1"
                          title="Trigger Health Check Now"
                        >
                          <Zap className={`w-3.5 h-3.5 text-amber-400 ${checkingId === site.id ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">Check Now</span>
                        </button>
                        <button
                          onClick={() => handleDelete(site.id, site.name)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition border border-slate-700"
                          title="Delete Website"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register Website Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-1">Register Monitored Website</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter target details. SSRF filter will prevent loopback and private IP access.
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Website Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Application"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Website Target URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SSRF protected (HTTP/HTTPS only; private networks restricted)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Check Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={1}>Every 1 Minute (High Precision)</option>
                  <option value={5}>Every 5 Minutes (Standard)</option>
                  <option value={15}>Every 15 Minutes</option>
                  <option value={60}>Every 1 Hour</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register & Check'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
