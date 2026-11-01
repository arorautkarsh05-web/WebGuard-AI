import React, { useState } from 'react';
import {
  TrendingUp,
  Search,
  Plus,
  Zap,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { Competitor } from '../types';
import { api } from '../api/client';

interface CompetitorIntelProps {
  competitors: Competitor[];
  onRefresh: () => void;
}

export const CompetitorIntelligence: React.FC<CompetitorIntelProps> = ({
  competitors,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);

  // Discovery state (TinyFish Search)
  const [discoveryQuery, setDiscoveryQuery] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState<any[]>([]);

  const handleRegisterCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/competitors', {
        name,
        website_url: websiteUrl,
        description,
      });
      setName('');
      setWebsiteUrl('');
      setDescription('');
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to register competitor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScanCompetitor = async (competitorId: string) => {
    setScanningId(competitorId);
    try {
      await api.post(`/competitors/${competitorId}/scan`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to scan competitor.');
    } finally {
      setScanningId(null);
    }
  };

  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discoveryQuery.trim()) return;
    setIsDiscovering(true);
    try {
      const res = await api.post(`/competitors/discover?query=${encodeURIComponent(discoveryQuery)}`);
      setDiscoveryResults(res.data?.results || []);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Discovery search failed.');
    } finally {
      setIsDiscovering(false);
    }
  };

  const priceTrendData = [
    { date: 'Oct 1', yourPrice: 99, competitorA: 119, competitorB: 89 },
    { date: 'Oct 8', yourPrice: 99, competitorA: 119, competitorB: 89 },
    { date: 'Oct 15', yourPrice: 99, competitorA: 99, competitorB: 89 },
    { date: 'Oct 22', yourPrice: 99, competitorA: 99, competitorB: 79 },
    { date: 'Oct 29', yourPrice: 99, competitorA: 89, competitorB: 79 },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#8B5CF6]/15 text-[#8B5CF6]">
              <TrendingUp className="w-5 h-5 text-[#00E5FF]" />
            </div>
            <h3 className="text-base font-extrabold text-white">Competitor & Market Intelligence</h3>
          </div>
          <p className="text-xs text-white/50 mt-1 max-w-xl">
            Surveils competitor pricing tiers, extracts promotional discounts, and alerts on market price reductions using <span className="text-[#00E5FF] font-bold">TinyFish Search & Fetch APIs</span>.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#8B5CF6]/25 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Competitor Target
        </button>
      </div>

      {/* TinyFish Competitor Search / Discovery Tool */}
      <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#00E5FF]" />
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-white/70">
            AI Competitor Discovery (TinyFish Search API)
          </h4>
        </div>
        <form onSubmit={handleDiscover} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-white/30 absolute left-3.5 top-3" />
            <input
              type="text"
              value={discoveryQuery}
              onChange={(e) => setDiscoveryQuery(e.target.value)}
              placeholder="Search industry or product (e.g. 'SaaS uptime monitoring', 'cloud database')..."
              className="w-full pl-10 pr-3 py-2.5 bg-[#0B0B0F]/70 border border-[#8B5CF6]/25 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00E5FF] transition"
            />
          </div>
          <button
            type="submit"
            disabled={isDiscovering}
            className="px-5 py-2.5 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
          >
            {isDiscovering ? 'Searching...' : 'Discover'}
          </button>
        </form>

        {discoveryResults.length > 0 && (
          <div className="mt-5 space-y-2.5 border-t border-white/10 pt-4">
            <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Discovered Market Alternatives:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto">
              {discoveryResults.slice(0, 6).map((res, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#0B0B0F] rounded-xl border border-white/10 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{res.title}</div>
                    <div className="text-[10px] text-[#00E5FF] truncate font-mono">{res.url}</div>
                  </div>
                  <button
                    onClick={() => {
                      setName(res.title?.substring(0, 25) || 'Discovered Competitor');
                      setWebsiteUrl(res.url);
                      setShowAddModal(true);
                    }}
                    className="px-2.5 py-1 bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/40 text-[#00E5FF] border border-[#00E5FF]/30 rounded-lg text-[10px] font-bold shrink-0 transition"
                  >
                    + Track
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Historical Price Comparison Chart */}
      <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-extrabold text-white">Market Price Benchmark & Fluctuations</h4>
            <p className="text-xs text-white/50">Historical tier comparison against competitors ($ USD)</p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30">
            Weekly Trend
          </span>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceTrendData}>
              <XAxis dataKey="date" stroke="rgba(255, 255, 255, 0.4)" fontSize={11} />
              <YAxis stroke="rgba(255, 255, 255, 0.4)" fontSize={11} unit="$" />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(11, 11, 15, 0.9)', borderColor: 'rgba(139, 92, 246, 0.4)', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
              />
              <Line type="monotone" dataKey="yourPrice" name="Your Price" stroke="#8B5CF6" strokeWidth={2.5} />
              <Line type="monotone" dataKey="competitorA" name="Competitor Alpha" stroke="#00E5FF" strokeWidth={2} strokeDasharray="3 3" />
              <Line type="monotone" dataKey="competitorB" name="Competitor Beta" stroke="rgba(255, 255, 255, 0.5)" strokeWidth={2} strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monitored Competitors Grid */}
      <div className="space-y-4">
        <h4 className="text-sm font-extrabold text-white">Monitored Competitors ({competitors.length})</h4>

        {competitors.length === 0 ? (
          <div className="p-12 text-center bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl text-white/40 text-xs shadow-xl">
            No competitors currently registered. Add a competitor to track their prices automatically.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitors.map((comp) => (
              <div key={comp.id} className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 hover:border-[#00E5FF]/40 rounded-2xl p-6 space-y-4 shadow-xl transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="text-sm font-extrabold text-white">{comp.name}</h5>
                    <a
                      href={comp.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#00E5FF] hover:underline flex items-center gap-1 mt-0.5"
                    >
                      {comp.website_url} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <button
                    onClick={() => handleScanCompetitor(comp.id)}
                    disabled={scanningId === comp.id}
                    className="px-3 py-1.5 rounded-xl bg-[#0B0B0F] hover:bg-[#8B5CF6]/20 text-[#00E5FF] text-xs font-bold flex items-center gap-1.5 border border-[#00E5FF]/30 transition"
                  >
                    <Zap className={`w-3.5 h-3.5 ${scanningId === comp.id ? 'animate-spin' : ''}`} />
                    <span>{scanningId === comp.id ? 'Scanning...' : 'Scan Now'}</span>
                  </button>
                </div>

                {/* Tracked Products */}
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Tracked Tiers & Pricing
                  </div>
                  {comp.products && comp.products.length > 0 ? (
                    <div className="space-y-1.5">
                      {comp.products.map((prod) => (
                        <div
                          key={prod.id}
                          className="p-2.5 bg-[#0B0B0F] rounded-xl border border-white/5 flex items-center justify-between text-xs"
                        >
                          <div className="font-semibold text-white/90">{prod.name}</div>
                          <div className="flex items-center gap-2 font-mono font-bold text-white">
                            <span>${prod.current_price || 'N/A'}</span>
                            <span className="text-[10px] font-bold text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 rounded-full border border-[#00E5FF]/20">
                              {prod.availability_status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-white/40 italic">
                      Click 'Scan Now' to automatically extract pricing points using TinyFish Fetch.
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-white/30 pt-3 border-t border-white/5 flex justify-between font-mono">
                  <span>Domain: {comp.domain}</span>
                  <span>
                    Last Scanned: {comp.last_monitored_at ? new Date(comp.last_monitored_at).toLocaleTimeString() : 'Never'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0B0B0F] border border-[#8B5CF6]/30 rounded-2xl w-full max-w-md p-7 shadow-2xl">
            <h3 className="text-base font-extrabold text-white mb-1">Add Competitor Target</h3>
            <p className="text-xs text-white/50 mb-5">
              Register competitor domain for automated price tracking and product surveillance.
            </p>

            <form onSubmit={handleRegisterCompetitor} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Competitor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Website or Pricing URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://competitor.com/pricing"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Primary direct alternative in enterprise tier"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                />
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
                  {isSubmitting ? 'Registering...' : 'Register & Scan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
