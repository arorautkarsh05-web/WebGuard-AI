import React, { useState } from 'react';
import {
  Bot,
  Play,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Layers
} from 'lucide-react';
import { api } from '../api/client';

export const FunctionalTesting: React.FC = () => {
  const [targetUrl, setTargetUrl] = useState('https://example.com');
  const [goal, setGoal] = useState('Verify that homepage loads, main headings are visible, and navigation links respond.');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const presetWorkflows = [
    {
      title: 'Homepage & Hero Smoke Test',
      goal: 'Verify homepage loads cleanly, hero headline is rendered, and primary call-to-action button is visible and clickable.',
    },
    {
      title: 'Navigation & Submenu Audit',
      goal: 'Inspect header navbar, click into main navigation links, and verify that subpages respond with 200 OK without 404 errors.',
    },
    {
      title: 'Lead / Signup Form Validation',
      goal: 'Locate contact or signup form, test form field validation with empty submission, and check for appropriate client-side validation errors.',
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
              Powered by <span className="text-[#00E5FF] font-bold">TinyFish Agent API</span>. Uses headless browser automation to test dynamic user workflows, navigation funnels, and interactive forms with embedded transaction guardrails.
            </p>
          </div>

          <div className="px-4 py-2 bg-[#0B0B0F]/60 backdrop-blur-md border border-[#00E5FF]/30 rounded-xl text-[#00E5FF] text-xs flex items-center gap-2 self-start sm:self-auto shadow-md">
            <ShieldCheck className="w-4 h-4 text-[#00E5FF] shrink-0" />
            <div>
              <div className="font-extrabold text-[11px] text-white">Safety Policy Active</div>
              <div className="text-[10px] text-[#00E5FF]">Stops prior to financial transactions</div>
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
          <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#8B5CF6]" /> Automation Parameters
          </h4>

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
                placeholder="Describe what the browser agent should test and verify..."
                className="w-full px-3.5 py-2.5 bg-[#0B0B0F]/70 border border-[#8B5CF6]/25 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00E5FF] transition"
              />
              <p className="text-[10px] text-white/40 mt-1">
                TinyFish Agent interprets this goal, spawns cloud browser sessions, and executes steps.
              </p>
            </div>

            <button
              type="submit"
              disabled={isRunning}
              className="w-full py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#8B5CF6]/25 transition disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-white" />
                  <span>Agent Executing Workflow...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Launch Functional Test Agent</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Results & Step Log */}
        <div className="lg:col-span-2 bg-[#0B0B0F]/70 backdrop-blur-md border border-[#8B5CF6]/20 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h4 className="text-sm font-extrabold text-white">
                Agent Execution Evidence & Telemetry
              </h4>
              {result && (
                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                  result.success
                    ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30'
                    : 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40'
                }`}>
                  {result.success ? 'Workflow Succeeded' : 'Execution Notice'}
                </span>
              )}
            </div>

            {isRunning && (
              <div className="py-16 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-xs font-bold text-white">TinyFish Cloud Browser Session Running</div>
                <div className="text-[11px] text-white/40 max-w-sm mx-auto">
                  Navigating to endpoint, evaluating DOM tree, executing actions, and verifying response states.
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
              <div className="py-20 text-center text-white/30 text-xs">
                <Bot className="w-12 h-12 text-[#8B5CF6]/30 mx-auto mb-2" />
                Select a workflow preset or configure your goal and launch the agent.
              </div>
            )}

            {result && !isRunning && (
              <div className="space-y-4">
                <div className="p-3.5 bg-[#0B0B0F] rounded-xl border border-white/10 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-white/50">Execution Latency: </span>
                    <span className="font-mono font-bold text-[#00E5FF]">{Math.round(result.latency_ms || 0)}ms</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-white/50">Endpoint: </span>
                    <span className="font-mono text-white">{targetUrl}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-white/40">Evaluation Summary</h5>
                  <div className="p-4 bg-[#0B0B0F] rounded-xl border border-white/10 font-mono text-xs text-white/80 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                    {typeof result.result === 'object'
                      ? JSON.stringify(result.result, null, 2)
                      : result.result || JSON.stringify(result, null, 2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/40">
            <span>Powered by TinyFish Automation Fleet</span>
            <span>Recorded in audit executions</span>
          </div>
        </div>
      </div>
    </div>
  );
};
