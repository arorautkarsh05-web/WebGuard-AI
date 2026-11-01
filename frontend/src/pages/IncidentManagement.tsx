import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Filter,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Check,
  Search
} from 'lucide-react';
import { Incident } from '../types';
import { api } from '../api/client';

interface IncidentManagementProps {
  incidents: Incident[];
  onRefresh: () => void;
}

export const IncidentManagement: React.FC<IncidentManagementProps> = ({
  incidents,
  onRefresh,
}) => {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    incidents.length > 0 ? incidents[0] : null
  );
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredIncidents = incidents.filter((inc) => {
    if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
    return true;
  });

  const handleUpdateStatus = async (incidentId: string, newStatus: string) => {
    setUpdatingId(incidentId);
    try {
      const res = await api.patch(`/incidents/${incidentId}/status`, { status: newStatus });
      if (selectedIncident && selectedIncident.id === incidentId) {
        setSelectedIncident(res.data);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'High':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'Medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Low':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">AI Incident Intelligence & Triage</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Automated anomaly correlation, severity scoring, and root-cause analysis. Distinguishes confirmed observations from potential explanations and recommends actionable remediation.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Investigating">Investigating</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400 text-xs">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2 opacity-80" />
          <h4 className="text-sm font-bold text-slate-300">Clean Incident Log</h4>
          <p className="mt-1">No operational anomalies or website failures detected.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Incidents Feed (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Incidents ({filteredIncidents.length})
            </div>

            {filteredIncidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-slate-850 border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${getSeverityBadge(inc.severity)}`}>
                      {inc.severity}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h5 className="text-xs font-bold text-white mb-1">{inc.title}</h5>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{inc.root_cause_summary}</p>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className={`font-semibold ${
                      inc.status === 'Resolved' ? 'text-emerald-400' :
                      inc.status === 'Investigating' ? 'text-cyan-400' : 'text-amber-400'
                    }`}>
                      • {inc.status}
                    </span>
                    <span className="text-indigo-400 flex items-center gap-1 font-medium">
                      Inspect Details <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Incident Detail & AI Intelligence Analysis (7 cols) */}
          <div className="lg:col-span-7">
            {selectedIncident ? (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-5 sticky top-20">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${getSeverityBadge(selectedIncident.severity)}`}>
                        {selectedIncident.severity} Severity
                      </span>
                      <span className="text-xs text-slate-400">
                        Incident ID: {selectedIncident.id.substring(0, 8)}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{selectedIncident.title}</h4>
                  </div>

                  {/* Status Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleUpdateStatus(selectedIncident.id, 'Investigating')}
                      disabled={updatingId === selectedIncident.id || selectedIncident.status === 'Investigating'}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 disabled:opacity-50 transition"
                    >
                      Investigate
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedIncident.id, 'Resolved')}
                      disabled={updatingId === selectedIncident.id || selectedIncident.status === 'Resolved'}
                      className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-xs font-semibold border border-emerald-500/30 disabled:opacity-50 transition"
                    >
                      Resolve
                    </button>
                  </div>
                </div>

                {/* AI Root Cause Summary */}
                <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" /> AI Root Cause Analysis
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {selectedIncident.root_cause_summary}
                  </p>
                </div>

                {/* Recommended Actions */}
                {selectedIncident.recommended_actions && selectedIncident.recommended_actions.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Recommended Corrective Actions
                    </div>
                    <div className="space-y-2">
                      {selectedIncident.recommended_actions.map((action, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs text-slate-300">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence Extraction */}
                {selectedIncident.evidence && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Captured Observational Evidence
                    </div>
                    <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48">
                      <pre>{JSON.stringify(selectedIncident.evidence, null, 2)}</pre>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800 flex justify-between text-[11px] text-slate-500">
                  <span>Detected at: {new Date(selectedIncident.created_at).toLocaleString()}</span>
                  <span>
                    Status: <strong className="text-slate-300">{selectedIncident.status}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-500 bg-slate-900/50 border border-slate-800 rounded-xl">
                Select an incident from the feed to view full AI diagnosis and evidence.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

