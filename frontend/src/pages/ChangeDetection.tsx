import React, { useState } from 'react';
import {
  FileDiff,
  Plus,
  Zap,
  History,
  ArrowRight
} from 'lucide-react';
import type { MonitoringTask } from '../types';
import { api } from '../api/client';

interface ChangeDetectionProps {
  tasks: MonitoringTask[];
  onRefresh: () => void;
}

export const ChangeDetection: React.FC<ChangeDetectionProps> = ({
  tasks,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [frequency, setFrequency] = useState('*/15 * * * *');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<any>(null);

  const changeTasks = tasks.filter((t) => t.task_type === 'change_detection');

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/monitoring/tasks', {
        name,
        target_url: targetUrl,
        task_type: 'change_detection',
        schedule_cron: frequency,
      });
      setName('');
      setTargetUrl('');
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create change detection task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunTask = async (taskId: string) => {
    setRunningTaskId(taskId);
    setDiffResult(null);
    try {
      const res = await api.post(`/monitoring/tasks/${taskId}/run`);
      setDiffResult(res.data);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Execution failed.');
    } finally {
      setRunningTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#8B5CF6]/15 text-[#8B5CF6]">
              <FileDiff className="w-5 h-5 text-[#00E5FF]" />
            </div>
            <h3 className="text-base font-extrabold text-white">Website Change Detection Engine</h3>
          </div>
          <p className="text-xs text-white/50 mt-1 max-w-xl">
            Continuously snapshots critical webpages using <span className="text-[#00E5FF] font-bold">TinyFish Fetch</span>. Detects unintended pricing changes, broken elements, missing CTAs, and layout modifications.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#8B5CF6]/25 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Detection Task
        </button>
      </div>

      {/* Diff Result Inspector if executed */}
      {diffResult && (
        <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-[#00E5FF]" /> Snapshot Comparison Telemetry
            </h4>
            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
              diffResult.has_changed
                ? 'bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/30'
                : 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30'
            }`}>
              {diffResult.has_changed ? 'Modifications Detected' : 'Baseline Created / No Changes'}
            </span>
          </div>

          <div className="p-3.5 bg-[#0B0B0F] rounded-xl border border-white/10 text-xs">
            <div className="text-white/40 mb-1 font-bold uppercase text-[10px] tracking-wider">Classification</div>
            <div className="text-white font-semibold">{diffResult.change_type}</div>
            {diffResult.change_summary?.length > 0 && (
              <div className="mt-2 text-white/80 space-y-1">
                {diffResult.change_summary.map((s: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs text-[#00E5FF]">
                    <ArrowRight className="w-3 h-3" /> {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {diffResult.diff ? (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                Unified Content Diff
              </div>
              <div className="p-4 bg-[#0B0B0F] rounded-xl border border-white/10 font-mono text-xs overflow-x-auto max-h-72">
                {diffResult.diff.split('\n').map((line: string, idx: number) => {
                  let colorClass = 'text-white/70';
                  if (line.startsWith('+')) colorClass = 'text-[#00E5FF] bg-[#00E5FF]/10';
                  if (line.startsWith('-')) colorClass = 'text-[#8B5CF6] bg-[#8B5CF6]/15';
                  if (line.startsWith('@@')) colorClass = 'text-white font-bold';
                  return (
                    <div key={idx} className={`py-0.5 px-1.5 rounded ${colorClass}`}>
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-xs text-white/40 italic">
              Baseline content snapshot stored. Any future runs will generate visual diffs against this baseline.
            </div>
          )}
        </div>
      )}

      {/* Tasks Table */}
      <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-[#8B5CF6]/20 flex items-center justify-between">
          <h4 className="text-sm font-extrabold text-white">Active Change Detection Tasks ({changeTasks.length})</h4>
        </div>

        {changeTasks.length === 0 ? (
          <div className="p-12 text-center text-xs text-white/40">
            No change detection tasks currently configured. Create a task for your pricing or landing page.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0B0F]/80 border-b border-[#8B5CF6]/20 text-white/40 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Task Name</th>
                  <th className="px-6 py-4">Target Webpage</th>
                  <th className="px-6 py-4">Schedule</th>
                  <th className="px-6 py-4">Last Checked</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8B5CF6]/10 text-white/80">
                {changeTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-[#8B5CF6]/5 transition">
                    <td className="px-6 py-4 font-bold text-white text-xs">{task.name}</td>
                    <td className="px-6 py-4 text-[#00E5FF] font-mono text-[11px] truncate max-w-xs">
                      {task.target_url}
                    </td>
                    <td className="px-6 py-4 text-white/40 font-mono text-[11px]">{task.schedule_cron}</td>
                    <td className="px-6 py-4 text-white/40 text-[11px] font-mono">
                      {task.last_run_at ? new Date(task.last_run_at).toLocaleTimeString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRunTask(task.id)}
                        disabled={runningTaskId === task.id}
                        className="px-3 py-1.5 rounded-xl bg-[#0B0B0F] hover:bg-[#8B5CF6]/20 text-[#00E5FF] border border-[#00E5FF]/30 text-xs font-bold flex items-center gap-1.5 ml-auto transition"
                      >
                        <Zap className={`w-3.5 h-3.5 ${runningTaskId === task.id ? 'animate-spin' : ''}`} />
                        <span>{runningTaskId === task.id ? 'Comparing...' : 'Run Diff Now'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0B0B0F] border border-[#8B5CF6]/30 rounded-2xl w-full max-w-md p-7 shadow-2xl">
            <h3 className="text-base font-extrabold text-white mb-1">Create Webpage Change Task</h3>
            <p className="text-xs text-white/50 mb-5">
              Specify page to snapshot and monitor for textual, pricing, or structural changes.
            </p>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Task Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SaaS Pricing Page Monitor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Target Webpage URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/pricing"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Snapshot Interval</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="*/15 * * * *">Every 15 Minutes</option>
                  <option value="0 * * * *">Every 1 Hour</option>
                  <option value="0 0 * * *">Daily at Midnight</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create & Initialise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
