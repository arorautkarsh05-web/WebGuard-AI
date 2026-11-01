import React, { useState, useEffect } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  Filter
} from 'lucide-react';
import type { TinyFishExecution } from '../types';
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
      <div className="bg-[#0B0B0F] border border-[#8B5CF6]/15 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6]">
              <History className="w-5 h-5 text-[#00E5FF]" />
            </div>
            <h3 className="text-base font-extrabold text-white">Execution Audit Log & API History</h3>
          </div>
          <p className="text-xs text-white/50 mt-1 max-w-xl">
            Detailed chronological record of all TinyFish API executions (Search, Fetch, Agent, Monitor) and automated background checks.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-4 h-4 text-white/40" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3.5 py-2 bg-[#0B0B0F] border border-white/10 rounded-xl text-white/80 focus:outline-none focus:border-[#8B5CF6]"
          >
            <option value="ALL">All Services</option>
            <option value="SEARCH">Search API</option>
            <option value="FETCH">Fetch API</option>
            <option value="AGENT">Agent API</option>
          </select>
        </div>
      </div>

      <div className="bg-[#0B0B0F] border border-[#8B5CF6]/15 rounded-2xl overflow-hidden shadow-2xl">
        {executions.length === 0 ? (
          <div className="p-14 text-center text-xs text-white/40">
            {isLoading ? 'Loading execution logs...' : 'No executions recorded yet. Trigger tasks to generate logs.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0B0F] border-b border-[#8B5CF6]/15 text-white/40 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Service</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Endpoint</th>
                  <th className="px-6 py-4">Latency</th>
                  <th className="px-6 py-4">Telemetry Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8B5CF6]/10 text-white/80">
                {executions.map((exec) => (
                  <tr key={exec.id} className="hover:bg-[#8B5CF6]/5 transition">
                    <td className="px-6 py-4 text-white/50 text-[11px] font-mono whitespace-nowrap">
                      {new Date(exec.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold uppercase tracking-wider text-[11px] text-[#00E5FF]">
                      {exec.service_type}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        exec.status === 'success'
                          ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30'
                          : 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40'
                      }`}>
                        {exec.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {exec.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-white/70 truncate max-w-xs">
                      {exec.endpoint}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-white">
                      {Math.round(exec.execution_time_ms || 0)}ms
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-white/40 truncate max-w-md">
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
