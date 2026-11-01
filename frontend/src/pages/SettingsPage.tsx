import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Key,
  Radio,
  Server,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';

export const SettingsPage: React.FC = () => {
  const [tinyfishStatus, setTinyfishStatus] = useState<any>(null);
  const [isPinging, setIsPinging] = useState(false);

  const checkStatus = async () => {
    setIsPinging(true);
    try {
      const res = await api.get('/tinyfish/status');
      setTinyfishStatus(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" /> System Settings & Integration Status
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Review external API connectivity, credential security guarantees, and SSRF protection policies.
        </p>
      </div>

      {/* TinyFish Integration Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">TinyFish Provider Integration</h4>
              <p className="text-xs text-slate-400">Primary provider for Search, Fetch, and Browser Automation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={checkStatus}
              disabled={isPinging}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Ping Status</span>
            </button>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              tinyfishStatus?.status === 'connected'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            }`}>
              {tinyfishStatus?.status === 'connected' ? 'Authenticated & Active' : 'Checking...'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-800 space-y-1">
            <div className="text-slate-400 font-semibold">Credential Storage</div>
            <div className="text-white font-mono flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Backend Environment (TINYFISH_API_KEY)</span>
            </div>
            <div className="text-[11px] text-slate-500">Key value is never transmitted to the browser client.</div>
          </div>

          <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-800 space-y-1">
            <div className="text-slate-400 font-semibold">Search API Endpoint</div>
            <div className="text-cyan-400 font-mono">{tinyfishStatus?.search_url || 'https://api.search.tinyfish.ai'}</div>
            <div className="text-[11px] text-slate-500">Used for competitor & intelligence discovery.</div>
          </div>

          <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-800 space-y-1">
            <div className="text-slate-400 font-semibold">Fetch API Endpoint</div>
            <div className="text-cyan-400 font-mono">{tinyfishStatus?.fetch_url || 'https://api.fetch.tinyfish.ai'}</div>
            <div className="text-[11px] text-slate-500">Used for clean page snapshots and pricing extraction.</div>
          </div>

          <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-800 space-y-1">
            <div className="text-slate-400 font-semibold">Agent Automation Endpoint</div>
            <div className="text-cyan-400 font-mono">{tinyfishStatus?.agent_url || 'https://agent.tinyfish.ai'}</div>
            <div className="text-[11px] text-slate-500">Goal-based browser automation fleet.</div>
          </div>
        </div>
      </div>

      {/* Security Policies Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Security & SSRF Guardrails</h4>
            <p className="text-xs text-slate-400">Strict network isolation and target verification</p>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Localhost & Loopback Isolation: Blocks requests directed to 127.0.0.1, ::1, or 0.0.0.0</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Private RFC1918 Address Filtering: Blocks 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Cloud Metadata Protection: Restricts AWS/GCP instance metadata endpoint access (169.254.169.254)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Safe Automation Guardrails: Functional agent enforces non-destructive transaction rules</span>
          </div>
        </div>
      </div>
    </div>
  );
};

