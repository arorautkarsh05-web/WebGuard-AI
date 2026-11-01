import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Radio,
  Lock,
  CheckCircle2,
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
      <div className="bg-[#0B0B0F] border border-[#8B5CF6]/15 rounded-2xl p-6">
        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#8B5CF6]" /> System Settings & Integration Status
        </h3>
        <p className="text-xs text-white/50 mt-1">
          Review external API connectivity, credential security guarantees, and SSRF protection policies.
        </p>
      </div>

      {/* TinyFish Integration Card */}
      <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#00E5FF]/10 text-[#00E5FF]">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">TinyFish Provider Integration</h4>
              <p className="text-xs text-white/50">Primary engine for Search, Fetch, and Browser Automation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={checkStatus}
              disabled={isPinging}
              className="px-3 py-1.5 rounded-xl bg-[#0B0B0F]/70 hover:bg-[#8B5CF6]/20 text-[#00E5FF] text-xs font-bold flex items-center gap-1.5 border border-[#00E5FF]/30 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
              <span>Ping Status</span>
            </button>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              tinyfishStatus?.status === 'connected'
                ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30'
                : 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30'
            }`}>
              {tinyfishStatus?.status === 'connected' ? 'Authenticated & Active' : 'Checking...'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-[#0B0B0F]/60 rounded-xl border border-white/10 space-y-1">
            <div className="text-white/40 font-bold uppercase tracking-wider text-[10px]">Credential Storage</div>
            <div className="text-white font-mono flex items-center gap-2 font-semibold">
              <Lock className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>Backend Environment (TINYFISH_API_KEY)</span>
            </div>
            <div className="text-[11px] text-white/40">Credential value is never transmitted to the browser client.</div>
          </div>

          <div className="p-4 bg-[#0B0B0F]/60 rounded-xl border border-white/10 space-y-1">
            <div className="text-white/40 font-bold uppercase tracking-wider text-[10px]">Search API Endpoint</div>
            <div className="text-[#00E5FF] font-mono font-semibold">{tinyfishStatus?.search_url || 'https://api.search.tinyfish.ai'}</div>
            <div className="text-[11px] text-white/40">Used for competitor & intelligence discovery.</div>
          </div>

          <div className="p-4 bg-[#0B0B0F]/60 rounded-xl border border-white/10 space-y-1">
            <div className="text-white/40 font-bold uppercase tracking-wider text-[10px]">Fetch API Endpoint</div>
            <div className="text-[#00E5FF] font-mono font-semibold">{tinyfishStatus?.fetch_url || 'https://api.fetch.tinyfish.ai'}</div>
            <div className="text-[11px] text-white/40">Used for clean page snapshots and pricing extraction.</div>
          </div>

          <div className="p-4 bg-[#0B0B0F]/60 rounded-xl border border-white/10 space-y-1">
            <div className="text-white/40 font-bold uppercase tracking-wider text-[10px]">Agent Automation Endpoint</div>
            <div className="text-[#00E5FF] font-mono font-semibold">{tinyfishStatus?.agent_url || 'https://agent.tinyfish.ai'}</div>
            <div className="text-[11px] text-white/40">Goal-based browser automation fleet.</div>
          </div>
        </div>
      </div>

      {/* Security Policies Card */}
      <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="p-2.5 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6]">
            <ShieldCheck className="w-5 h-5 text-[#00E5FF]" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white">Security & SSRF Guardrails</h4>
            <p className="text-xs text-white/50">Strict network isolation and target verification</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center gap-2.5 text-white/80">
            <CheckCircle2 className="w-4 h-4 text-[#00E5FF] shrink-0" />
            <span>Localhost & Loopback Isolation: Blocks requests directed to 127.0.0.1, ::1, or 0.0.0.0</span>
          </div>
          <div className="flex items-center gap-2.5 text-white/80">
            <CheckCircle2 className="w-4 h-4 text-[#00E5FF] shrink-0" />
            <span>Private RFC1918 Address Filtering: Blocks 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16</span>
          </div>
          <div className="flex items-center gap-2.5 text-white/80">
            <CheckCircle2 className="w-4 h-4 text-[#00E5FF] shrink-0" />
            <span>Cloud Metadata Protection: Restricts AWS/GCP instance metadata endpoint access (169.254.169.254)</span>
          </div>
          <div className="flex items-center gap-2.5 text-white/80">
            <CheckCircle2 className="w-4 h-4 text-[#00E5FF] shrink-0" />
            <span>Safe Automation Guardrails: Functional agent enforces non-destructive transaction rules</span>
          </div>
        </div>
      </div>
    </div>
  );
};
