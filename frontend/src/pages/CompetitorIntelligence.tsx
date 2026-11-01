import React, { useState } from 'react';
import {
  TrendingUp,
  Search,
  Plus,
  Zap,
  ExternalLink,
  DollarSign,
  Tag,
  Clock,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Competitor } from '../types';
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

  // Sample or actual price trend data for visual display
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Competitor & Market Intelligence</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Monitors competitor pricing structures, extracts promotional discounts, and detects market price movements using <span className="text-cyan-400 font-semibold">TinyFish Search & Fetch APIs</span>.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Competitor Target
        </button>
      </div>

      {/* TinyFish Competitor Search / Discovery Tool */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            AI Competitor Discovery (TinyFish Search API)
          </h4>
        </div>
        <form onSubmit={handleDiscover} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={discoveryQuery}
              onChange={(e) => setDiscoveryQuery(e.target.value)}
              placeholder="Search industry or product (e.g. 'SaaS uptime monitoring', 'cloud database')..."
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            disabled={isDiscovering}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 text-xs font-bold rounded-lg transition disabled:opacity-50"
          >
            {isDiscovering ? 'Searching...' : 'Discover'}
          </button>
        </form>

        {discoveryResults.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-slate-800 pt-3">
            <div className="text-[11px] font-bold text-slate-400">Discovered Market Alternatives:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-52 overflow-y-auto">
              {discoveryResults.slice(0, 6).map((res, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 truncate">{res.title}</div>
                    <div className="text-[10px] text-cyan-400 truncate">{res.url}</div>
                  </div>
                  <button
                    onClick={() => {
                      setName(res.title?.substring(0, 25) || 'Discovered Competitor');
                      setWebsiteUrl(res.url);
                      setShowAddModal(true);
                    }}
                    className="px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 rounded text-[10px] font-bold shrink-0 transition"
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-white">Market Price Benchmark & Fluctuations</h4>
            <p className="text-xs text-slate-400">Historical tier comparison against competitors ($ USD)</p>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
            Weekly Trend
          </span>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceTrendData}>
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} unit="$" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
              />
              <Line type="monotone" dataKey="yourPrice" name="Your Price" stroke="#6366f1" strokeWidth={2.5} />
              <Line type="monotone" dataKey="competitorA" name="Competitor Alpha" stroke="#06b6d4" strokeWidth={2} strokeDasharray="3 3" />
              <Line type="monotone" dataKey="competitorB" name="Competitor Beta" stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monitored Competitors List */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-white">Monitored Competitors ({competitors.length})</h4>

        {competitors.length === 0 ? (
          <div className="p-10 text-center bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400 text-xs">
            No competitors currently registered. Add a competitor to track their prices automatically.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitors.map((comp) => (
              <div key={comp.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {comp.name}
                    </h5>
                    <a
                      href={comp.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-0.5"
                    >
                      {comp.website_url} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <button
                    onClick={() => handleScanCompetitor(comp.id)}
                    disabled={scanningId === comp.id}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                  >
                    <Zap className={`w-3.5 h-3.5 ${scanningId === comp.id ? 'animate-spin text-amber-400' : 'text-cyan-400'}`} />
                    <span>{scanningId === comp.id ? 'Scanning...' : 'Scan Now'}</span>
                  </button>
                </div>

                {/* Tracked Products / Tiers */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Tracked Tiers & Pricing
                  </div>
                  {comp.products && comp.products.length > 0 ? (
                    <div className="space-y-1.5">
                      {comp.products.map((prod) => (
                        <div
                          key={prod.id}
                          className="p-2.5 bg-slate-800/60 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div className="font-medium text-slate-200">{prod.name}</div>
                          <div className="flex items-center gap-2 font-mono font-bold text-white">
                            <span>${prod.current_price || 'N/A'}</span>
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              {prod.availability_status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">
                      Click 'Scan Now' to automatically extract pricing points using TinyFish Fetch.
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800 flex justify-between">
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

      {/* Add Competitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Add Competitor Target</h3>
            <p className="text-xs text-slate-400 mb-4">
              Register competitor domain for automated price tracking and product surveillance.
            </p>

            <form onSubmit={handleRegisterCompetitor} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Competitor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Website or Pricing URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://competitor.com/pricing"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Primary direct alternative in enterprise tier"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
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
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white transition disabled:opacity-50"
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

