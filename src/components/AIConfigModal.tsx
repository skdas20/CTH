'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Key,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  X,
  Cpu,
  Layers,
  Zap,
} from 'lucide-react';

interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAIActive: boolean;
  activeModel?: string;
  onAIActivated?: () => void;
}

const MODEL_OPTIONS = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    tag: 'Latest Frontier (Recommended)',
    tagColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    description: 'Flagship model for deep autonomous threat detection, complex reasoning, and XAI.',
    badge: '3.8',
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    tag: 'High Efficiency',
    tagColor: 'bg-cyan-950 text-cyan-300 border-cyan-800',
    description: 'Optimized for high-throughput telemetry streams, low latency, and rapid agentic loops.',
    badge: '3.6',
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    tag: 'Agentic Standard',
    tagColor: 'bg-purple-950 text-purple-300 border-purple-800',
    description: 'Proven multi-step workflow model with balanced speed and intelligence.',
    badge: '3.5',
  },
];

export function AIConfigModal({
  isOpen,
  onClose,
  isAIActive,
  activeModel = 'gemini-3.8-flash',
  onAIActivated,
}: AIConfigModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(activeModel);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    if (activeModel) {
      setSelectedModel(activeModel);
    }
  }, [activeModel, isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    if (!apiKey.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your Gemini API key.' });
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/ai-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          model: selectedModel,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: `✅ Verified! Google ${selectedModel} is now actively protecting your SOC.`,
        });
        setApiKey('');
        if (onAIActivated) onAIActivated();
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Failed to verify key with Google Gemini API.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Network error verifying key: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const selectedModelMeta = MODEL_OPTIONS.find((m) => m.id === selectedModel) || MODEL_OPTIONS[0];

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl text-white shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Gemini 3.x AI Engine Configuration
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                  Gemini 3 Family
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Connect your Google AI Studio key to activate real AI threat analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Status Pill */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            isAIActive
              ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-200'
              : 'bg-amber-950/50 border-amber-800/80 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isAIActive ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div>
              <p className="font-bold">
                {isAIActive
                  ? `AI Engine Connected: ${activeModel}`
                  : 'Running in Fallback Mode (Rule Heuristics)'}
              </p>
              <p className="text-[11px] opacity-80">
                {isAIActive
                  ? 'All HTTP payloads evaluated via live Gemini reasoning and structured JSON output.'
                  : 'Pattern matching rules active. Connect a key below to unlock genuine LLM intelligence.'}
              </p>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase shrink-0 ${
              isAIActive ? 'bg-emerald-900/80 text-emerald-300' : 'bg-amber-900/80 text-amber-300'
            }`}
          >
            {isAIActive ? 'Active' : 'Fallback'}
          </span>
        </div>

        {/* Model Selection in the Form */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Select Gemini Model Version:
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Active: {selectedModelMeta.name}
            </span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {MODEL_OPTIONS.map((m) => {
              const isSelected = selectedModel === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedModel(m.id)}
                  className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-slate-200">{m.name}</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-900 text-cyan-400 border border-slate-700">
                        {m.badge}
                      </span>
                    </div>
                    <span className={`inline-block text-[9px] font-medium px-1.5 py-0.5 rounded border mb-1.5 ${m.tagColor}`}>
                      {m.tag}
                    </span>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {m.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* API Key Input Section */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              Gemini API Key
            </span>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px] hover:underline"
            >
              Get Free Key from Google AI Studio <ExternalLink className="w-3 h-3" />
            </a>
          </label>

          <div className="relative">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your Gemini API key (e.g. AIzaSy...)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition"
            />
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <p className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Zap className="w-3 h-3 text-cyan-400" />
              Free Tier Compatibility:
            </p>
            <p className="leading-relaxed">
              Google AI Studio provides a free tier with <strong>15 requests/minute</strong> and <strong>1,500 requests/day</strong> at <strong>$0 cost</strong>. The key is securely saved to your local environment file (<code className="text-cyan-400">.env.local</code>) and verified live.
            </p>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                : 'bg-red-950/60 border-red-800 text-red-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleTestAndSave}
            disabled={isTesting || !apiKey.trim()}
            className="flex-1 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-600/30"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Testing Connection with {selectedModelMeta.name}...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Activate with {selectedModelMeta.name}
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
