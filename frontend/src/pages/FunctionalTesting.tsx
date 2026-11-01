import React, { useState, useEffect } from 'react';
import {
  Bot,
  Play,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Layers,
  Zap,
  CheckCircle2,
  Clock,
  ExternalLink,
  Code2,
  ListChecks
} from 'lucide-react';
import { api } from '../api/client';

export const FunctionalTesting: React.FC = () => {
  const [targetUrl, setTargetUrl] = useState('https://gulms.galgotiasuniversity.org/login/index.php');
  const [goal, setGoal] = useState('Verify that homepage loads, main headings are visible, and navigation links respond.');
  const [mode, setMode] = useState<'turbo' | 'deep'>('turbo');
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const tickerStepsTurbo = [
    'Enforcing socket-level SSRF safe transport & TLS handshake...',
    'Dispatching high-speed HTTP probe & measuring TTFB latency...',
    'Auditing DOM element tree (forms, inputs, headings, buttons)...',
    'Evaluating automated functional assertions against goal...'
  ];

  const tickerStepsDeep = [
    'Connecting to TinyFish cloud browser sandbox...',
    'Spawning isolated Chromium headless instance...',
    'Navigating to target endpoint and loading client scripts...',
    'Executing AI action reasoning loop and testing interactions...',
    'Capturing screenshot evidence and finalizing report...'
  ];

  useEffect(() => {
    let interval: any;
    if (isRunning) {
      setCurrentStepIndex(0);
      const steps = mode === 'turbo' ? tickerStepsTurbo : tickerStepsDeep;
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      }, mode === 'turbo' ? 350 : 3500);
    }
    return () => clearInterval(interval);
  }, [isRunning, mode]);

  const presetWorkflows = [
    {
      title: 'Homepage & Hero Smoke Test',
      goal: 'Verify homepage loads cleanly, hero headline is rendered, and primary call-to-action button is visible and clickable.',
    },
    {
      title: 'Login & Form Audit',
      goal: 'Audit login or authentication form, verify username/email and password fields are rendered, and check submission button.',
    },
    {
      title: 'Navigation & Submenu Audit',
      goal: 'Inspect header navbar, click into main navigation links, and verify that subpages respond with 200 OK without 404 errors.',
    },
    {
      title: 'Add-to-Cart Funnel Smoke Test',
      goal: 'Navigate to product catalog, click Add-to-Cart on a sample product, verify cart badge increments, and stop before payment.',
    },
  ];

  const handleRunAgent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsRunning(true);
    setResult(null);
    setError(null);

    try {
      const response = await api.post('/tinyfish/agent', {
        url: targetUrl,
        goal: goal,
        mode: mode
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Browser automation execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#8B5CF6]/15 text-[#8B5CF6]">
                <Bot className="w-5 h-5 text-[#00E5FF]" />
              </div>
              <h3 className="text-base font-extrabold text-white">
                Autonomous Functional Testing Agent
              </h3>
            </div>
            <p className="text-xs text-white/50 mt-1 max-w-2xl">
              Powered by <span className="text-[#00E5FF] font-bold">WebGuard AI & TinyFish Engine</span>. Choose <span className="text-[#00E5FF]">Turbo Mode</span> for sub-second synthetic audits or <span className="text-[#8B5CF6]">Deep Mode</span> for multi-step Chromium browser automation.
            </p>
          </div>

          <div className="px-4 py-2 bg-[#0B0B0F]/60 backdrop-blur-md border border-[#00E5FF]/30 rounded-xl text-[#00E5FF] text-xs flex items-center gap-2 self-start sm:self-auto shadow-md">
            <ShieldCheck className="w-4 h-4 text-[#00E5FF] shrink-0" />
            <div>
              <div className="font-extrabold text-[11px] text-white">Safety Policy Active</div>
              <div className="text-[10px] text-[#00E5FF]">Zero transaction hazard guardrails</div>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Workflow Templates */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" /> Quick Workflow Presets
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {presetWorkflows.map((preset, idx) => (
            <div
              key={idx}
              onClick={() => setGoal(preset.goal)}
              className="p-4 bg-[#0B0B0F]/70 backdrop-blur-md hover:bg-[#8B5CF6]/15 border border-[#8B5CF6]/20 hover:border-[#00E5FF]/40 rounded-2xl cursor-pointer transition shadow-lg group"
            >
              <div className="text-xs font-bold text-white group-hover:text-[#00E5FF] flex items-center justify-between">
                <span>{preset.title}</span>
                <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover:text-[#00E5FF] transition" />
              </div>
              <p className="text-[11px] text-white/50 mt-1.5 line-clamp-2">{preset.goal}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Execution Setup & Live Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Setup */}
        <div className="bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#8B5CF6]" /> Testing Parameters
            </h4>
          </div>

          {/* Engine Mode Toggle */}
          <div className="p-1 bg-[#0B0B0F] border border-white/10 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMode('turbo')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                mode === 'turbo'
                  ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/30'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Turbo Fast (~1s)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('deep')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                mode === 'deep'
                  ? 'bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/30'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Deep Agent (~20s)</span>
            </button>
          </div>
          <p className="text-[10px] text-white/40">
            {mode === 'turbo'
              ? '⚡ Turbo: Sub-second high-speed synthetic audit of forms, headings, buttons, and HTTP health.'
              : '🤖 Deep: Full Chromium cloud sandbox simulating multi-step clicks and form submissions.'}
          </p>

          <form onSubmit={handleRunAgent} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Target Webpage URL</label>
              <input
                type="url"
                required
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3.5 py-2.5 bg-[#0B0B0F]/70 border border-[#8B5CF6]/25 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00E5FF] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">
                Automation Goal / Instruction
              </label>
              <textarea
                required
                rows={4}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe what the testing agent should audit and verify..."
                className="w-full px-3.5 py-2.5 bg-[#0B0B0F]/70 border border-[#8B5CF6]/25 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00E5FF] transition"
              />
            </div>

            <button
              type="submit"
              disabled={isRunning}
              className={`w-full py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50 ${
                mode === 'turbo'
                  ? 'bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black shadow-[#00E5FF]/25'
                  : 'bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white shadow-[#8B5CF6]/25'
              }`}
            >
              {isRunning ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>{mode === 'turbo' ? 'Running Instant Turbo Audit...' : 'Agent Executing in Cloud...'}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Launch {mode === 'turbo' ? 'Turbo Fast Test (Instant)' : 'Deep Functional Agent'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Results & Live Telemetry */}
        <div className="lg:col-span-2 bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-6 flex flex-col justify-between shadow-xl min-h-[460px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-[#00E5FF]" /> Agent Execution Evidence & Telemetry
              </h4>
              {result && (
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                    result.success
                      ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}>
                    {result.success ? '✓ All Assertions Passed' : 'Review Required'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#00E5FF]">
                    {Math.round(result.latency_ms || 0)}ms
                  </span>
                </div>
              )}
            </div>

            {/* Running Step Ticker */}
            {isRunning && (
              <div className="py-14 text-center space-y-4">
                <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto ${
                  mode === 'turbo' ? 'border-[#00E5FF]' : 'border-[#8B5CF6]'
                }`} />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">
                    {mode === 'turbo' ? '⚡ High-Speed Synthetic DOM Audit' : '🤖 Cloud Chromium Session Active'}
                  </div>
                  <div className="text-[11px] text-[#00E5FF] font-mono animate-pulse">
                    {(mode === 'turbo' ? tickerStepsTurbo : tickerStepsDeep)[currentStepIndex]}
                  </div>
                </div>
                <div className="w-48 h-1.5 bg-white/10 rounded-full mx-auto overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${mode === 'turbo' ? 'bg-[#00E5FF]' : 'bg-[#8B5CF6]'}`}
                    style={{
                      width: `${((currentStepIndex + 1) / (mode === 'turbo' ? tickerStepsTurbo.length : tickerStepsDeep.length)) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-300">
                  <AlertTriangle className="w-4 h-4 text-red-400" /> Execution Error
                </div>
                <p className="text-white/80">{error}</p>
              </div>
            )}

            {!isRunning && !result && !error && (
              <div className="py-24 text-center text-white/30 text-xs">
                <Bot className="w-12 h-12 text-[#8B5CF6]/30 mx-auto mb-2" />
                Select a workflow preset or target URL, then click <strong className="text-white">Launch Turbo Fast Test</strong> for instant results.
              </div>
            )}

            {result && !isRunning && (
              <div className="space-y-4">
                {/* Latency & Page Metadata Banner */}
                <div className="p-3 bg-[#0B0B0F] rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-4 h-4 text-[#00E5FF]" />
                    <span className="text-white/50">Speed:</span>
                    <span className="font-mono font-bold text-[#00E5FF]">{Math.round(result.latency_ms || 0)}ms</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      ⚡ 95%+ Faster
                    </span>
                  </div>
                  {result.page_meta && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-white/50">Page Title:</span>
                      <span className="font-bold text-white max-w-xs truncate">{result.page_meta.title}</span>
                      <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
                        HTTP {result.page_meta.http_status}
                      </span>
                    </div>
                  )}
                  {result.streaming_url && (
                    <a
                      href={result.streaming_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#00E5FF] hover:underline flex items-center gap-1 bg-[#00E5FF]/10 px-2.5 py-1 rounded-lg border border-[#00E5FF]/30"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Watch Live Browser Stream
                    </a>
                  )}
                </div>

                {/* Automated Goal Assertions Checklist */}
                {result.assertions && result.assertions.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00E5FF]" /> Goal Assertions Evaluated
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {result.assertions.map((a: any, i: number) => (
                        <div
                          key={i}
                          className="p-3 bg-[#0B0B0F] rounded-xl border border-white/10 flex items-start gap-2.5"
                        >
                          <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${a.passed ? 'text-emerald-400' : 'text-amber-400'}`} />
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-white">{a.name}</div>
                            <div className="text-[11px] text-white/60 leading-tight">{a.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discovered Forms & Interactive Elements */}
                {result.forms && result.forms.length > 0 && (
                  <div className="p-3.5 bg-[#0B0B0F] rounded-xl border border-[#8B5CF6]/30 space-y-2">
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-[#8B5CF6]" /> Discovered Forms & Input Fields
                      </span>
                      <span className="text-[10px] text-white/50">{result.forms.length} Form(s) Detected</span>
                    </div>
                    <div className="space-y-1.5">
                      {result.forms.map((f: any, idx: number) => (
                        <div key={idx} className="p-2 bg-white/5 rounded-lg text-xs text-white/80 font-mono flex items-center justify-between">
                          <span>Form #{f.form_index} ({f.method})</span>
                          <span className="text-[#00E5FF] text-[11px]">Inputs: [{f.inputs.join(', ')}]</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discovered Headings */}
                {result.headings && result.headings.length > 0 && (
                  <div className="p-3 bg-[#0B0B0F] rounded-xl border border-white/10 space-y-1.5">
                    <div className="text-xs font-bold text-white/60">Discovered Document Headings</div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.headings.map((h: string, idx: number) => (
                        <span key={idx} className="text-[11px] px-2 py-0.5 bg-white/5 rounded border border-white/10 text-white/80 font-mono">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evaluation Summary Text */}
                <div className="space-y-1.5">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-white/40">Technical Execution Summary</h5>
                  <div className="p-3.5 bg-[#0B0B0F] rounded-xl border border-white/10 font-mono text-xs text-white/80 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                    {typeof result.result === 'object'
                      ? JSON.stringify(result.result, null, 2)
                      : result.result || JSON.stringify(result, null, 2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/40 mt-4">
            <span>WebGuard Dual-Engine Testing Fleet</span>
            <span>SSR Socket Protection Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
