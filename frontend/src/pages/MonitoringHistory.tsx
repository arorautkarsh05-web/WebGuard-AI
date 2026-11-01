import React, { useState, useEffect } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Code,
  Search,
  Filter
} from 'lucide-react';
import { TinyFishExecution } from '../types';
import { api } from '../api/client';

export const MonitoringHistory: React.FC = () => {
  const [executions, setExecutions] = useState<TinyFishExecution[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  const fetchExecutions = async () => {
    setIsLoading(true);
    try {
      const url = filterType === 'ALL' ? '/tinyfish/executions' : `/tinyfish/executions?service_type=${filterType.toLowerCase()}`;
      const res = await api.get(url);
      setExecutions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, [filterType]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Execution Audit Log & API History</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Detailed chronological record of all TinyFish API executions (Search, Fetch, Agent, Monitor) and automated background checks.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Services</option>
            <option value="SEARCH">Search API</option>
            <option value="FETCH">Fetch API</option>
            <option value="AGENT">Agent API</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        {executions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            {isLoading ? 'Loading execution logs...' : 'No executions recorded yet. Trigger tasks to generate logs.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Service</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Endpoint</th>
                  <th className="px-5 py-3">Execution Time</th>
                  <th className="px-5 py-3">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {executions.map((exec) => (
                  <tr key={exec.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(exec.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 font-bold uppercase tracking-wider text-[11px] text-cyan-400">
                      {exec.service_type}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        exec.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        {exec.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {exec.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-300 truncate max-w-xs">
                      {exec.endpoint}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      {Math.round(exec.execution_time_ms || 0)}ms
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400 truncate max-w-md">
                      {JSON.stringify(exec.response_summary || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
