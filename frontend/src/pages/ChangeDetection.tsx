import React, { useState } from 'react';
import {
  FileDiff,
  Plus,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  Layers,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { MonitoringTask } from '../types';
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <FileDiff className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Website Change Detection Engine</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Continuously snapshots important webpages using <span className="text-cyan-400 font-semibold">TinyFish Fetch</span>. Detects unintended pricing changes, broken elements, missing CTAs, and layout modifications.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Detection Task
        </button>
      </div>

      {/* Diff Result Inspector if just executed */}
      {diffResult && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" /> Snapshot Comparison Result
            </h4>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              diffResult.has_changed
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {diffResult.has_changed ? 'Modifications Detected' : 'No Changes / Baseline Created'}
            </span>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 text-xs">
            <div className="text-slate-400 mb-1 font-semibold uppercase text-[10px]">Classification</div>
            <div className="text-slate-200">{diffResult.change_type}</div>
            {diffResult.change_summary?.length > 0 && (
              <div className="mt-2 text-slate-300">
                {diffResult.change_summary.map((s: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs text-indigo-300">
                    <ArrowRight className="w-3 h-3" /> {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {diffResult.diff ? (
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Unified Content Diff
              </div>
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs overflow-x-auto max-h-72">
                {diffResult.diff.split('\n').map((line: string, idx: number) => {
                  let colorClass = 'text-slate-300';
                  if (line.startsWith('+')) colorClass = 'text-emerald-400 bg-emerald-950/30';
                  if (line.startsWith('-')) colorClass = 'text-red-400 bg-red-950/30';
                  if (line.startsWith('@@')) colorClass = 'text-cyan-400';
                  return (
                    <div key={idx} className={`py-0.5 px-1 rounded ${colorClass}`}>
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">
              Baseline content snapshot stored. Any future runs will generate visual diffs against this baseline.
            </div>
          )}
        </div>
      )}

      {/* Tasks Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-bold text-white">Active Change Detection Tasks ({changeTasks.length})</h4>
        </div>

        {changeTasks.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            No change detection tasks currently configured. Create a task for your pricing or landing page.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Task Name</th>
                  <th className="px-5 py-3">Target Webpage</th>
                  <th className="px-5 py-3">Schedule</th>
                  <th className="px-5 py-3">Last Checked</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {changeTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4 font-bold text-white text-xs">{task.name}</td>
                    <td className="px-5 py-4 text-cyan-400 font-mono text-[11px] truncate max-w-xs">
                      {task.target_url}
                    </td>
                    <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">{task.schedule_cron}</td>
                    <td className="px-5 py-4 text-slate-400 text-[11px]">
                      {task.last_run_at ? new Date(task.last_run_at).toLocaleTimeString() : 'Never'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleRunTask(task.id)}
                        disabled={runningTaskId === task.id}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 ml-auto transition"
                      >
                        <Zap className={`w-3.5 h-3.5 ${runningTaskId === task.id ? 'animate-spin text-amber-400' : 'text-indigo-400'}`} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Create Webpage Change Task</h3>
            <p className="text-xs text-slate-400 mb-4">
              Specify page to snapshot and monitor for textual, pricing, or structural changes.
            </p>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Task Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SaaS Pricing Page Monitor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Webpage URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/pricing"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Snapshot Interval</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="*/15 * * * *">Every 15 Minutes</option>
                  <option value="0 * * * *">Every 1 Hour</option>
                  <option value="0 0 * * *">Daily at Midnight</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition disabled:opacity-50"
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
