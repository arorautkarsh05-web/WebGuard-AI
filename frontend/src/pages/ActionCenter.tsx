import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Clock,
  Check,
  X,
  FileText,
  UserCheck,
  History,
  Send,
  Zap,
  ChevronRight
} from 'lucide-react';
import { api } from '../api/client';
import type { AIAction } from '../types';

export const ActionCenter: React.FC = () => {
  const [actions, setActions] = useState<AIAction[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchActions = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/actions');
      setActions(res.data);
    } catch (err: any) {
      console.error('Failed to load AI actions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const handleApprove = async (actionId: string) => {
    setProcessingId(actionId);
    try {
      const res = await api.post(`/actions/${actionId}/approve`, { approved: true });
      setNotification(`Action approved and executed! Verification status: ${res.data?.verification_status || 'completed'}`);
      fetchActions();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to approve action.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (actionId: string) => {
    setProcessingId(actionId);
    try {
      await api.post(`/actions/${actionId}/approve`, { approved: false });
      setNotification('Action proposal rejected.');
      fetchActions();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reject action.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerify = async (actionId: string) => {
    setProcessingId(actionId);
    try {
      const res = await api.post(`/actions/${actionId}/verify`);
      setNotification(`Re-verification executed! Current status: ${res.data?.verification_status}`);
      fetchActions();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to verify action resolution.');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredActions = actions.filter((act) => {
    if (activeFilter === 'pending') return act.approval_status === 'pending_approval';
    if (activeFilter === 'verified') return act.verification_status === 'verified_resolved';
    return true;
  });

  const pendingCount = actions.filter((a) => a.approval_status === 'pending_approval').length;
  const verifiedCount = actions.filter((a) => a.verification_status === 'verified_resolved').length;
  const executedCount = actions.filter((a) => a.execution_status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#8B5CF6]/15 text-[#8B5CF6]">
                <ShieldCheck className="w-5 h-5 text-[#00E5FF]" />
              </div>
              <h3 className="text-base font-extrabold text-white">AI Action Center & Verification Stream</h3>
            </div>
            <p className="text-xs text-white/50 mt-1 max-w-2xl">
              Connects autonomous root-cause investigations with practical, safe remediation next steps.
              Enforces <span className="text-[#00E5FF] font-bold">Human-in-the-Loop Approval</span> before executing external or production operations, accompanied by autonomous post-action verification.
            </p>
          </div>

          <button
            onClick={fetchActions}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-[#0B0B0F]/70 hover:bg-[#8B5CF6]/20 text-[#00E5FF] text-xs font-bold border border-[#00E5FF]/30 transition flex items-center gap-2 self-start sm:self-auto"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Audit Log</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-4 bg-[#0B0B0F]/80 border border-[#00E5FF]/40 rounded-xl text-xs text-[#00E5FF] flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#00E5FF] shrink-0" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-white/40 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Total Proposed</span>
          <div className="text-3xl font-extrabold text-white mt-2">{actions.length}</div>
          <div className="text-xs text-white/40 mt-1">Autonomous proposals</div>
        </div>

        <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/30 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-semibold text-[#8B5CF6] uppercase tracking-wider">Pending Approval</span>
          <div className="text-3xl font-extrabold text-white mt-2 flex items-baseline gap-2">
            <span>{pendingCount}</span>
            <span className="text-xs text-[#8B5CF6] font-bold">Needs Review</span>
          </div>
          <div className="text-xs text-white/40 mt-1">Human sign-off gate</div>
        </div>

        <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#00E5FF]/30 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-semibold text-[#00E5FF] uppercase tracking-wider">Verified Resolved</span>
          <div className="text-3xl font-extrabold text-white mt-2 flex items-baseline gap-2">
            <span>{verifiedCount}</span>
            <span className="text-xs text-[#00E5FF] font-bold">Post-Check OK</span>
          </div>
          <div className="text-xs text-white/40 mt-1">Confirmed by probe</div>
        </div>

        <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Executed Actions</span>
          <div className="text-3xl font-extrabold text-white mt-2">{executedCount}</div>
          <div className="text-xs text-white/40 mt-1">Logged to audit trail</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            activeFilter === 'all'
              ? 'bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/25'
              : 'bg-[#0B0B0F]/60 text-white/60 hover:text-white border border-white/10'
          }`}
        >
          All Action Proposals ({actions.length})
        </button>
        <button
          onClick={() => setActiveFilter('pending')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            activeFilter === 'pending'
              ? 'bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/25'
              : 'bg-[#0B0B0F]/60 text-white/60 hover:text-white border border-white/10'
          }`}
        >
          Pending Human Approval ({pendingCount})
        </button>
        <button
          onClick={() => setActiveFilter('verified')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            activeFilter === 'verified'
              ? 'bg-[#00E5FF] text-[#0B0B0F] shadow-md shadow-[#00E5FF]/25'
              : 'bg-[#0B0B0F]/60 text-white/60 hover:text-white border border-white/10'
          }`}
        >
          Verified Resolutions ({verifiedCount})
        </button>
      </div>

      {/* Action Stream */}
      {filteredActions.length === 0 ? (
        <div className="p-14 text-center bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl text-white/40 text-xs shadow-xl">
          <CheckCircle2 className="w-10 h-10 text-[#00E5FF] mx-auto mb-2 opacity-80" />
          <h4 className="text-sm font-bold text-white">No Action Proposals in Selected View</h4>
          <p className="mt-1">When automated monitors or root-cause investigations flag anomalies, recommended actions will appear here for human authorization.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredActions.map((action) => (
            <div
              key={action.id}
              className="bg-[#0B0B0F]/75 backdrop-blur-md border border-[#8B5CF6]/25 hover:border-[#00E5FF]/40 rounded-2xl p-6 shadow-xl transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#8B5CF6]/20 text-[#00E5FF] border border-[#00E5FF]/30">
                      {action.action_type.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                      action.risk_level === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : action.risk_level === 'MEDIUM'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30'
                    }`}>
                      {action.risk_level || 'LOW'} RISK
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      action.approval_status === 'approved'
                        ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30'
                        : action.approval_status === 'rejected'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-[#8B5CF6] text-white shadow-sm'
                    }`}>
                      {action.approval_status.replace(/_/g, ' ')}
                    </span>
                    {action.verification_status !== 'pending' && (
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        action.verification_status === 'verified_resolved'
                          ? 'bg-[#00E5FF] text-[#0B0B0F] font-bold shadow-md shadow-[#00E5FF]/20'
                          : 'bg-[#8B5CF6]/30 text-white'
                      }`}>
                        {action.verification_status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-extrabold text-white">{action.title}</h4>
                  <p className="text-xs text-white/70 leading-relaxed">{action.description}</p>

                  {/* Validated Parameters Drawer */}
                  {action.parameters && Object.keys(action.parameters).length > 0 && (
                    <div className="mt-2 p-2.5 bg-[#0B0B0F]/90 rounded-xl border border-white/5 font-mono text-[11px] text-white/50">
                      <span className="text-[#8B5CF6] font-bold">Parameters: </span>
                      {JSON.stringify(action.parameters)}
                    </div>
                  )}

                  {/* Execution / Verification details if present */}
                  {action.verification_details && (
                    <div className="mt-3 p-3 bg-[#0B0B0F]/60 rounded-xl border border-white/5 text-[11px] text-white/60">
                      <strong className="text-[#00E5FF]">Verification Outcome: </strong>
                      {action.verification_details.message || JSON.stringify(action.verification_details)}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-[10px] font-mono text-white/40 pt-2">
                    <span>Proposed: {new Date(action.created_at).toLocaleString()}</span>
                    {action.approved_at && (
                      <span>Approved: {new Date(action.approved_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>

                {/* Human Approval & Verification Action Controls */}
                <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                  {action.approval_status === 'pending_approval' && (
                    <>
                      <button
                        onClick={() => handleApprove(action.id)}
                        disabled={processingId === action.id}
                        className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#8B5CF6]/25 transition disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{processingId === action.id ? 'Executing...' : 'Approve & Execute'}</span>
                      </button>
                      <button
                        onClick={() => handleReject(action.id)}
                        disabled={processingId === action.id}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-red-950/40 text-white/50 hover:text-red-400 text-xs font-bold border border-white/10 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {action.approval_status === 'approved' && (
                    <button
                      onClick={() => handleVerify(action.id)}
                      disabled={processingId === action.id}
                      className="px-3.5 py-2 rounded-xl bg-[#0B0B0F]/70 hover:bg-[#8B5CF6]/20 text-[#00E5FF] text-xs font-bold flex items-center gap-1.5 border border-[#00E5FF]/30 transition disabled:opacity-50"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${processingId === action.id ? 'animate-spin' : ''}`} />
                      <span>{processingId === action.id ? 'Verifying...' : 'Re-verify Resolution'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionCenter;

