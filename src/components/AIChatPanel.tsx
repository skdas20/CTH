'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, RefreshCw, ShieldAlert, Terminal, Check, Copy } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  mode?: 'ai' | 'fallback';
}

interface AIChatPanelProps {
  initialPrompt?: string;
  onClose?: () => void;
  isAIActive?: boolean;
  activeModel?: string;
}

const PRESET_PROMPTS = [
  '🚨 Summarize active threats in the last hour',
  '💉 Explain SQL injection mitigation playbook',
  '🔍 Correlate incidents and identify attack campaigns',
  '🔒 Propose firewall rules for repeat offending IPs',
];

export function AIChatPanel({ initialPrompt, onClose, isAIActive, activeModel = 'gemini-3.8-flash' }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `👋 Greetings, Analyst. I am **AegisAI**, your Tier-3 SOC Security Analyst assistant.

I have live context of incoming telemetry, SQLite threat logs, and active firewall blocks. Ask me to investigate threats, analyze payloads, correlate attack vectors, or generate remediation code.`,
      timestamp: new Date().toLocaleTimeString(),
      mode: isAIActive ? 'ai' : 'fallback',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      sendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendMessage = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      text: userText.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText.trim(),
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'model',
        text: data.response || 'No response returned from analyst engine.',
        timestamp: new Date().toLocaleTimeString(),
        mode: data.mode,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'model',
        text: `⚠️ **Analyst Query Error:** ${err.message || 'Unable to connect to AI analyst service.'}`,
        timestamp: new Date().toLocaleTimeString(),
        mode: 'fallback',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const renderFormattedText = (text: string) => {
    // Basic markdown parsing for code blocks and bolding
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const lang = lines[0].match(/^[a-z0-9_-]+/i) ? lines[0] : '';
        const code = (lang ? lines.slice(1) : lines).join('\n');

        return (
          <div key={index} className="my-2 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden font-mono text-[11px]">
            {lang && (
              <div className="bg-slate-900/90 px-3 py-1 text-[10px] text-cyan-400 font-bold border-b border-slate-800 flex justify-between items-center">
                <span>{lang}</span>
                <span className="text-slate-500 text-[9px]">SNIPPET</span>
              </div>
            )}
            <pre className="p-3 text-cyan-300 overflow-x-auto whitespace-pre-wrap">{code}</pre>
          </div>
        );
      }

      // Format bold, bullets, quotes
      const paragraphs = part.split('\n\n');
      return (
        <div key={index} className="space-y-2">
          {paragraphs.map((para, pIdx) => {
            if (para.startsWith('### ')) {
              return (
                <h4 key={pIdx} className="text-sm font-bold text-cyan-300 mt-2 mb-1 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  {para.replace('### ', '')}
                </h4>
              );
            }
            if (para.startsWith('> ')) {
              return (
                <blockquote key={pIdx} className="border-l-2 border-cyan-500/60 pl-3 py-1 bg-cyan-950/20 text-cyan-200 text-xs italic rounded-r">
                  {para.replace('> ', '')}
                </blockquote>
              );
            }

            const lines = para.split('\n');
            return (
              <div key={pIdx} className="space-y-1">
                {lines.map((line, lIdx) => {
                  const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
                  const formattedLine = line
                    .replace(/^[-*]\s+/, '')
                    .split(/(\*\*.*?\*\*|`.*?`)/g)
                    .map((segment, sIdx) => {
                      if (segment.startsWith('**') && segment.endsWith('**')) {
                        return <strong key={sIdx} className="text-slate-100 font-semibold">{segment.slice(2, -2)}</strong>;
                      }
                      if (segment.startsWith('`') && segment.endsWith('`')) {
                        return <code key={sIdx} className="bg-slate-950 text-cyan-300 px-1 py-0.5 rounded font-mono text-[10px] border border-slate-800">{segment.slice(1, -1)}</code>;
                      }
                      return segment;
                    });

                  return isBullet ? (
                    <div key={lIdx} className="flex items-start gap-2 ml-1 text-slate-300">
                      <span className="text-cyan-400 mt-1 shrink-0 text-xs">•</span>
                      <span>{formattedLine}</span>
                    </div>
                  ) : (
                    <p key={lIdx} className="text-slate-300 leading-relaxed">{formattedLine}</p>
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-[600px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-gradient-to-tr from-cyan-600 to-blue-500 rounded-lg text-white shadow-md shadow-cyan-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">AegisAI Security Analyst</h3>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${
                  isAIActive
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border-amber-800'
                }`}
              >
                {isAIActive ? activeModel : 'Fallback Engine'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Context-Aware Real-Time SOC Incident Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setMessages([
                {
                  id: 'welcome',
                  role: 'model',
                  text: 'Telemetry cache refreshed. How can I assist with your incident investigation?',
                  timestamp: new Date().toLocaleTimeString(),
                  mode: isAIActive ? 'ai' : 'fallback',
                },
              ])
            }
            title="Reset conversation"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Preset Prompts Pills */}
      <div className="px-3 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
        <span className="text-[10px] text-slate-400 uppercase font-semibold shrink-0">Quick Queries:</span>
        {PRESET_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(prompt)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 text-[11px] whitespace-nowrap transition hover:border-cyan-500/50 hover:text-cyan-300"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 text-xs ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl p-3 relative group transition ${
                  isUser
                    ? 'bg-cyan-600 text-white rounded-tr-none shadow-md shadow-cyan-600/20'
                    : 'bg-slate-950/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-lg'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-800/80 text-[10px] text-slate-400">
                    <span className="font-semibold text-cyan-400 flex items-center gap-1">
                      AegisAI Analyst
                      {msg.mode === 'ai' && (
                        <span className="text-[9px] px-1 py-0.2 bg-emerald-950 text-emerald-400 rounded border border-emerald-800">
                          AI
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span>{msg.timestamp}</span>
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        title="Copy message"
                        className="opacity-0 group-hover:opacity-100 transition p-0.5 hover:text-cyan-400"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="text-xs">
                  {isUser ? <p className="whitespace-pre-wrap">{msg.text}</p> : renderFormattedText(msg.text)}
                </div>

                {isUser && (
                  <div className="text-[9px] text-cyan-100/70 text-right mt-1">
                    {msg.timestamp}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 text-xs items-center text-slate-400">
            <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 rounded-tl-none flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span className="text-[11px] font-mono text-cyan-300">
                AegisAI is analyzing telemetry and evaluating threat models...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <div className="flex items-end gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2 focus-within:border-cyan-500/60 transition">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Ask AegisAI about threats, payloads, firewall rules, or code remediations... (Enter to send)"
            className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none font-sans"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md shadow-cyan-600/30 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5 text-center">
          Powered by Google Gemini 3 Flash family with structured telemetry injection. Press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-[9px] text-slate-400">Shift + Enter</kbd> for new line.
        </p>
      </div>
    </div>
  );
}
