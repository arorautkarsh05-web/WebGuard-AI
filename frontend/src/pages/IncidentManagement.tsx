import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Check
} from 'lucide-react';
import type { Incident } from '../types';
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
  const [isInvestigating, setIsInvestigating] = useState<boolean>(false);

  const filteredIncidents = incidents.filter((inc) => {
    if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
    return true;
  });

  const handleRunInvestigation = async (incidentId: string) => {
    setIsInvestigating(true);
    try {
      const res = await api.post(`/incidents/${incidentId}/investigate`);
      if (selectedIncident && selectedIncident.id === incidentId) {
        setSelectedIncident({
          ...selectedIncident,
          status: 'Investigating',
          evidence: {
            ...selectedIncident.evidence,
            investigation_report: res.data.investigation_report
          }
        });
      }
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Investigation failed to run.');
    } finally {
      setIsInvestigating(false);
    }
  };

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
        return 'bg-[#8B5CF6] text-white';
      case 'High':
        return 'bg-[#8B5CF6]/20 text-[#00E5FF] border border-[#00E5FF]/40';
      case 'Medium':
        return 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20';
      default:
        return 'bg-white/5 text-white/50 border border-white/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#8B5CF6]/15 text-[#8B5CF6]">
                <AlertTriangle className="w-5 h-5 text-[#00E5FF]" />
              </div>
              <h3 className="text-base font-extrabold text-white">AI Incident Intelligence & Triage</h3>
            </div>
            <p className="text-xs text-white/50 mt-1 max-w-2xl">
              Automated anomaly correlation, severity scoring, and root-cause analysis. Distinguishes confirmed observations from potential explanations and recommends actionable remediation.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 bg-[#0B0B0F]/70 border border-[#8B5CF6]/25 rounded-xl text-white/80 focus:outline-none focus:border-[#00E5FF]"
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
              className="px-3 py-2 bg-[#0B0B0F]/70 border border-[#8B5CF6]/25 rounded-xl text-white/80 focus:outline-none focus:border-[#00E5FF]"
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
        <div className="p-14 text-center bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl text-white/40 text-xs shadow-xl">
          <CheckCircle2 className="w-12 h-12 text-[#00E5FF] mx-auto mb-2 opacity-80" />
          <h4 className="text-sm font-bold text-white">Clean Incident Log</h4>
          <p className="mt-1">No operational anomalies or website failures detected.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Incidents Feed (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">
              Incidents ({filteredIncidents.length})
            </div>

            {filteredIncidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#0B0B0F]/85 backdrop-blur-md border-[#8B5CF6] shadow-xl shadow-[#8B5CF6]/15'
                      : 'bg-[#0B0B0F]/65 backdrop-blur-md hover:bg-[#8B5CF6]/15 border-[#8B5CF6]/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${getSeverityBadge(inc.severity)}`}>
                      {inc.severity}
                    </span>
                    <span className="text-[10px] font-mono text-white/40">
                      {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h5 className="text-xs font-bold text-white mb-1">{inc.title}</h5>
                  <p className="text-[11px] text-white/50 line-clamp-2">{inc.root_cause_summary}</p>

                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <span className={`font-semibold ${
                      inc.status === 'Resolved' ? 'text-[#00E5FF]' :
                      inc.status === 'Investigating' ? 'text-[#8B5CF6]' : 'text-white/70'
                    }`}>
                      • {inc.status}
                    </span>
                    <span className="text-[#00E5FF] flex items-center gap-1 font-bold">
                      Inspect Details <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Incident Detail (7 cols) */}
          <div className="lg:col-span-7">
            {selectedIncident ? (
              <div className="bg-[#0B0B0F]/75 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-6 space-y-5 sticky top-20 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${getSeverityBadge(selectedIncident.severity)}`}>
                        {selectedIncident.severity} Severity
                      </span>
                      <span className="text-xs text-white/40 font-mono">
                        ID: {selectedIncident.id.substring(0, 8)}
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-white">{selectedIncident.title}</h4>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRunInvestigation(selectedIncident.id)}
                      disabled={isInvestigating}
                      className="px-3.5 py-1.5 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#8B5CF6]/20 disabled:opacity-50 transition"
                      title="Run Autonomous Multi-Module Investigation"
                    >
                      <Sparkles className={`w-3.5 h-3.5 text-[#00E5FF] ${isInvestigating ? 'animate-spin' : ''}`} />
                      <span>{isInvestigating ? 'Investigating...' : 'Auto-Investigate'}</span>
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedIncident.id, 'Resolved')}
                      disabled={updatingId === selectedIncident.id || selectedIncident.status === 'Resolved'}
                      className="px-3 py-1.5 rounded-xl bg-[#0B0B0F]/70 hover:bg-[#8B5CF6]/20 text-[#00E5FF] text-xs font-bold border border-[#00E5FF]/30 disabled:opacity-50 transition"
                    >
                      Resolve
                    </button>
                  </div>
                </div>

                {/* Flagship Autonomous Investigation Report Card */}
                {selectedIncident.evidence?.investigation_report ? (
                  <div className="p-5 bg-[#0B0B0F]/80 rounded-2xl border border-[#8B5CF6]/30 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                        <Sparkles className="w-4 h-4 text-[#00E5FF]" />
                        <span>Autonomous Investigation Synthesis</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30">
                        Confidence: {Math.round((selectedIncident.evidence.investigation_report.confidence || 0.85) * 100)}%
                      </span>
                    </div>

                    {/* Confirmed Failures */}
                    {selectedIncident.evidence.investigation_report.confirmed_failures?.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                          Confirmed Failures
                        </div>
                        {selectedIncident.evidence.investigation_report.confirmed_failures.map((f: string, i: number) => (
                          <div key={i} className="p-2.5 bg-red-950/30 border border-red-500/30 rounded-xl text-xs text-red-200 flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Confirmed Observations */}
                    {selectedIncident.evidence.investigation_report.observations?.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                          Verified Observations
                        </div>
                        <div className="space-y-1">
                          {selectedIncident.evidence.investigation_report.observations.map((obs: string, i: number) => (
                            <div key={i} className="text-xs text-white/80 flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#00E5FF] shrink-0 mt-0.5" />
                              <span>{obs}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Possible Explanations / Hypotheses */}
                    {selectedIncident.evidence.investigation_report.possible_causes?.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B5CF6]">
                          Possible Root Causes (Unverified Hypotheses)
                        </div>
                        <div className="space-y-1.5">
                          {selectedIncident.evidence.investigation_report.possible_causes.map((c: string, i: number) => (
                            <div key={i} className="p-2.5 bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-xl text-xs text-white/90">
                              {c}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-[#0B0B0F]/70 rounded-xl border border-[#8B5CF6]/30 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#00E5FF] uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" /> Root Cause Summary
                    </div>
                    <p className="text-xs text-white/90 leading-relaxed">
                      {selectedIncident.root_cause_summary}
                    </p>
                  </div>
                )}

                {/* Recommendations */}
                {selectedIncident.recommended_actions && selectedIncident.recommended_actions.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-white/40">
                      Recommended Remediation Plan
                    </div>
                    <div className="space-y-2">
                      {selectedIncident.recommended_actions.map((action, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0B0B0F]/60 border border-white/5 text-xs text-white/80">
                          <Check className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence */}
                {selectedIncident.evidence && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-white/40">
                      Captured Observational Evidence
                    </div>
                    <div className="p-4 bg-[#0B0B0F] rounded-xl border border-white/10 font-mono text-[11px] text-[#00E5FF] overflow-x-auto max-h-48">
                      <pre>{JSON.stringify(selectedIncident.evidence, null, 2)}</pre>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-white/10 flex justify-between text-[11px] text-white/40 font-mono">
                  <span>Detected: {new Date(selectedIncident.created_at).toLocaleString()}</span>
                  <span>
                    Status: <strong className="text-white">{selectedIncident.status}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-14 text-center text-xs text-white/30 bg-[#0B0B0F] border border-[#8B5CF6]/15 rounded-2xl">
                Select an incident from the feed to view full AI diagnosis and evidence.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
