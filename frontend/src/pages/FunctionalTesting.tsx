import React, { useState } from 'react';
import {
  Bot,
  Play,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
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
      title: 'Homepage & Hero Inspection',
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                Autonomous Functional Testing Agent
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Powered by the <span className="text-cyan-400 font-semibold">TinyFish Agent API</span>. Uses headless browser automation to test dynamic user workflows, navigation funnels, and interactive forms with embedded transaction guardrails.
            </p>
          </div>

          <div className="px-3.5 py-2 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs flex items-center gap-2 self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-[11px] text-white">Safety Policy Active</div>
              <div className="text-[10px] text-emerald-400/80">Stops prior to irreversible transactions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Workflow Templates */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Quick Workflow Presets
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {presetWorkflows.map((preset, idx) => (
            <div
              key={idx}
              onClick={() => setGoal(preset.goal)}
              className="p-3.5 bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-xl cursor-pointer transition group"
            >
              <div className="text-xs font-bold text-white group-hover:text-indigo-300 flex items-center justify-between">
                <span>{preset.title}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{preset.goal}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Execution Setup & Live Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Setup */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" /> Automation Task Parameters
          </h4>

          <form onSubmit={handleRunAgent} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Application URL</label>
              <input
                type="url"
                required
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Automation Goal / Instruction
              </label>
              <textarea
                required
                rows={4}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe what the browser agent should test and verify..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                TinyFish Agent interprets this goal, spawns cloud browser sessions, and executes steps.
              </p>
            </div>

            <button
              type="submit"
              disabled={isRunning}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
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
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Agent Execution Output & Evidence</span>
              </h4>
              {result && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  result.success ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {result.success ? 'Workflow Succeeded' : 'Execution Notice'}
                </span>
              )}
            </div>

            {isRunning && (
              <div className="py-16 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="text-xs font-bold text-slate-200">TinyFish Agent is Running Automated Browser Session</div>
                <div className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Navigating to target URL, evaluating DOM tree, executing actions, and inspecting workflow responses.
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-lg text-xs text-red-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-300">
                  <AlertTriangle className="w-4 h-4 text-red-400" /> Execution Error
                </div>
                <p className="text-slate-300">{error}</p>
              </div>
            )}

            {!isRunning && !result && !error && (
              <div className="py-20 text-center text-slate-500 text-xs">
                <Bot className="w-12 h-12 text-slate-700 mx-auto mb-2 opacity-50" />
                Select a workflow preset or configure your goal and launch the agent.
              </div>
            )}

            {result && !isRunning && (
              <div className="space-y-4">
                <div className="p-3.5 bg-slate-800/60 rounded-lg border border-slate-700/60 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-400">Execution Latency: </span>
                    <span className="font-bold text-slate-200">{Math.round(result.latency_ms || 0)}ms</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-400">Endpoint: </span>
                    <span className="font-mono text-cyan-400">{targetUrl}</span>
                  </div>
                </div>

                {/* Raw or Parsed Result Details */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Evaluation Summary</h5>
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                    {typeof result.result === 'object'
                      ? JSON.stringify(result.result, null, 2)
                      : result.result || JSON.stringify(result, null, 2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Powered by TinyFish Automation Fleet</span>
            <span>Recorded in audit executions</span>
          </div>
        </div>
      </div>
    </div>
  );
};
