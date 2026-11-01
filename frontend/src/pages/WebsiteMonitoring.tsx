import React, { useState } from 'react';
import {
  Globe,
  Plus,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap,
  ShieldCheck
} from 'lucide-react';
import type { Website } from '../types';
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
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
          </span>
        );
      case 'degraded':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30">
            <AlertCircle className="w-3.5 h-3.5" /> Degraded
          </span>
        );
      case 'down':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#8B5CF6]/30 text-white border border-[#8B5CF6]/50">
            <AlertCircle className="w-3.5 h-3.5 text-[#00E5FF]" /> Outage
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-white/40 border border-white/10">
            <HelpCircle className="w-3.5 h-3.5" /> Unknown
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B0B0F] border border-[#8B5CF6]/15 rounded-2xl p-6">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#00E5FF]" />
            Website Health Monitoring Fleet
          </h3>
          <p className="text-xs text-white/50 mt-1 max-w-xl">
            Continuous HTTP health checks, latency tracking, redirect validation, and SSRF-hardened monitoring.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#8B5CF6]/25 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Register New Website
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-[#0B0B0F] border border-[#00E5FF]/40 rounded-xl text-xs text-[#00E5FF] flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-[#00E5FF] shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Website Table */}
      {websites.length === 0 ? (
        <div className="p-14 text-center bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl shadow-xl">
          <Globe className="w-12 h-12 text-[#8B5CF6]/40 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white">No Monitored Websites Yet</h4>
          <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto">
            Register your target endpoint to initiate automated latency tracking, error classification, and uptime telemetry.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-5 px-5 py-2.5 rounded-xl bg-[#8B5CF6] text-white text-xs font-bold hover:bg-[#8B5CF6]/90 transition"
          >
            Register First Website
          </button>
        </div>
      ) : (
        <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0B0F]/80 border-b border-[#8B5CF6]/20 text-white/40 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Target Name & URL</th>
                  <th className="px-6 py-4">Health Status</th>
                  <th className="px-6 py-4">Latency</th>
                  <th className="px-6 py-4">HTTP Response</th>
                  <th className="px-6 py-4">Interval</th>
                  <th className="px-6 py-4">Last Checked</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8B5CF6]/10 text-white/80">
                {websites.map((site) => (
                  <tr key={site.id} className="hover:bg-[#8B5CF6]/5 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-xs">{site.name}</div>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#00E5FF] hover:underline flex items-center gap-1 mt-0.5"
                      >
                        {site.url}
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(site.health_status)}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold">
                      {site.last_response_time_ms ? (
                        <span className="text-white">
                          {Math.round(site.last_response_time_ms)}ms
                        </span>
                      ) : (
                        <span className="text-white/30">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {site.last_status_code ? (
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          site.last_status_code < 400
                            ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30'
                            : 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40'
                        }`}>
                          HTTP {site.last_status_code}
                        </span>
                      ) : (
                        <span className="text-white/30">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-white/50">
                      Every {site.check_frequency_minutes}m
                    </td>
                    <td className="px-6 py-4 text-white/40 text-[11px] font-mono">
                      {site.last_checked_at
                        ? new Date(site.last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : 'Pending'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRunCheck(site.id)}
                          disabled={checkingId === site.id}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0B0B0F] hover:bg-[#8B5CF6]/15 text-[#00E5FF] text-xs font-semibold flex items-center gap-1.5 border border-[#00E5FF]/30 transition"
                          title="Trigger Health Check"
                        >
                          <Zap className={`w-3.5 h-3.5 ${checkingId === site.id ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">Check Now</span>
                        </button>
                        <button
                          onClick={() => handleDelete(site.id, site.name)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white border border-white/10 transition"
                          title="Delete Target"
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

      {/* Register Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-[#0B0B0F]/90 backdrop-blur-xl border border-[#8B5CF6]/30 rounded-2xl w-full max-w-md p-7 shadow-2xl relative">
            <h3 className="text-base font-extrabold text-white mb-1">Register Monitored Website</h3>
            <p className="text-xs text-white/50 mb-5">
              Enter target details. SSRF filter will prevent loopback and private IP access.
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Website Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Application"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B0B0F]/70 border border-[#8B5CF6]/25 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00E5FF] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Target URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B0B0F]/70 border border-[#8B5CF6]/25 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00E5FF] transition"
                />
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#00E5FF]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span>SSRF protected (HTTP/HTTPS only; private networks restricted)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Check Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-[#0B0B0F]/70 border border-[#8B5CF6]/25 rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF] transition"
                >
                  <option value={1}>Every 1 Minute (High Precision)</option>
                  <option value={5}>Every 5 Minutes (Standard)</option>
                  <option value={15}>Every 15 Minutes</option>
                  <option value={60}>Every 1 Hour</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/70 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-xs font-bold text-white transition disabled:opacity-50"
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
