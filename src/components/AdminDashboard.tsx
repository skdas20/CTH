'use client';

import React, { useState, useMemo } from 'react';
import { SecurityLog } from '@/lib/threatEngine';
import {
  Shield,
  AlertTriangle,
  Cpu,
  Activity,
  UserX,
  XCircle,
  CheckCircle,
  Info,
  ShieldAlert,
  Gauge,
  Sparkles,
  Bot,
  Search,
  Key,
  ShieldCheck,
  ExternalLink,
  Code,
  FileText,
  RotateCcw,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { AIChatPanel } from './AIChatPanel';
import { AIConfigModal } from './AIConfigModal';

interface AdminDashboardProps {
  logs: SecurityLog[];
  blockedIps: string[];
  onUpdateStatus: (id: string, newStatus: SecurityLog['status']) => void;
  onToggleBlockIp: (ip: string) => void;
  isAIActive?: boolean;
  activeModel?: string;
  onRefreshAIStatus?: () => void;
}

const STATUS_OPTIONS: SecurityLog['status'][] = ['Active', 'Investigating', 'Resolved', 'Blocked'];

const STATUS_STYLES: Record<SecurityLog['status'], string> = {
  Active: 'bg-blue-950 text-blue-400 border-blue-800',
  Investigating: 'bg-amber-950 text-amber-400 border-amber-800',
  Resolved: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  Blocked: 'bg-red-950 text-red-400 border-red-800',
};

export function AdminDashboard({
  logs,
  blockedIps,
  onUpdateStatus,
  onToggleBlockIp,
  isAIActive = false,
  activeModel = 'gemini-3.8-flash',
  onRefreshAIStatus,
}: AdminDashboardProps) {
  const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'chat'>('overview');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string>('');

  // Natural Language AI Threat Query State
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzingQuery, setIsAnalyzingQuery] = useState(false);
  const [queryResult, setQueryResult] = useState<{
    summary: string;
    threatAssessment?: string;
    matchingLogIds: string[];
    mode?: string;
  } | null>(null);

  // Statistics calculation
  const totalRequests = logs.length;
  const threatLogs = logs.filter((l) => l.threatType !== 'Normal Traffic');
  const criticalThreats = logs.filter((l) => l.severity === 'Critical');
  const avgRiskScore =
    totalRequests > 0
      ? Math.round(logs.reduce((acc, curr) => acc + curr.riskScore, 0) / totalRequests)
      : 0;

  // Filtered logs based on AI natural language query or manual filter
  const displayedLogs = useMemo(() => {
    if (queryResult && queryResult.matchingLogIds.length > 0) {
      return logs.filter((l) => queryResult.matchingLogIds.includes(l.id));
    }
    return logs;
  }, [logs, queryResult]);

  // Chart data formatting
  const threatTypeCounts = logs.reduce((acc: Record<string, number>, log) => {
    acc[log.threatType] = (acc[log.threatType] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.keys(threatTypeCounts).map((key) => ({
    name: key,
    value: threatTypeCounts[key],
  }));

  const COLORS = ['#10B981', '#EF4444', '#F97316', '#A855F7', '#EC4899', '#EAB308', '#06B6D4'];

  const severityCounts = {
    Low: logs.filter((l) => l.severity === 'Low').length,
    Medium: logs.filter((l) => l.severity === 'Medium').length,
    High: logs.filter((l) => l.severity === 'High').length,
    Critical: logs.filter((l) => l.severity === 'Critical').length,
  };

  const barData = Object.keys(severityCounts).map((key) => ({
    severity: key,
    count: severityCounts[key as keyof typeof severityCounts],
  }));

  const SEVERITY_COLORS: Record<string, string> = {
    Low: '#10B981',
    Medium: '#EAB308',
    High: '#F97316',
    Critical: '#EF4444',
  };

  const getSeverityBadge = (severity: SecurityLog['severity']) => {
    switch (severity) {
      case 'Critical':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-950 text-red-400 border border-red-800">
            Critical
          </span>
        );
      case 'High':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-950 text-orange-400 border border-orange-800">
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
            Low
          </span>
        );
    }
  };

  const handleRunAiQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setQueryResult(null);
      return;
    }

    setIsAnalyzingQuery(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setQueryResult(data);
      }
    } catch (err) {
      console.error('Failed to execute AI investigation query:', err);
    } finally {
      setIsAnalyzingQuery(false);
    }
  };

  const handleAskAnalystAboutIncident = (log: SecurityLog) => {
    const prompt = `Investigate incident from IP ${log.sourceIp} on endpoint ${log.targetEndpoint}. Threat type: ${log.threatType} (Risk: ${log.riskScore}/100, Severity: ${log.severity}). Payload: "${log.payload || '(none)'}". Provide deep technical root cause and remediation.`;
    setChatInitialPrompt(prompt);
    setSelectedLog(null);
    setActiveView('chat');
  };

  return (
    <div className="space-y-6">
      {/* AI Engine Status Banner */}
      <div
        className={`p-3.5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs transition shadow-lg ${
          isAIActive
            ? 'bg-slate-900/90 border-cyan-500/40 text-slate-200'
            : 'bg-slate-900/90 border-amber-500/30 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              isAIActive
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 flex items-center gap-1.5">
                Threat Classification Mode:
                <span
                  className={`font-mono text-[11px] px-1.5 py-0.5 rounded border ${
                    isAIActive
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}
                >
                  {isAIActive ? `🟢 ${activeModel} Active` : '🟡 Fallback Rule-Based Engine'}
                </span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isAIActive
                ? 'Incoming HTTP payloads evaluated with multimodal LLM intent reasoning and structured JSON output.'
                : 'Running on pattern heuristics. Connect your free Gemini API key to activate real AI threat detection.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Key className="w-3.5 h-3.5 text-cyan-400" />
            {isAIActive ? 'AI Configured' : 'Configure Gemini API Key'}
          </button>

          <button
            onClick={() => setActiveView(activeView === 'overview' ? 'chat' : 'overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm ${
              activeView === 'chat'
                ? 'bg-cyan-600 text-white shadow-cyan-600/30'
                : 'bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            {activeView === 'chat' ? 'Return to Telemetry' : 'Open AI Analyst Chat'}
          </button>
        </div>
      </div>

      {/* View Switch: If Chat View is Active */}
      {activeView === 'chat' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-400" />
              Interactive SOC AI Security Analyst
            </h2>
            <button
              onClick={() => setActiveView('overview')}
              className="text-xs text-cyan-400 hover:text-cyan-300 underline"
            >
              ← Back to Metrics & Stream
            </button>
          </div>
          <AIChatPanel
            initialPrompt={chatInitialPrompt}
            onClose={() => setActiveView('overview')}
            isAIActive={isAIActive}
          />
        </div>
      ) : (
        <>
          {/* Top Metric Cards — 5 columns */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Captured Telemetry</p>
                <p className="text-2xl font-black text-slate-100 mt-1">{totalRequests}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                <Activity className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Threats Detected</p>
                <p className="text-2xl font-black text-red-400 mt-1">{threatLogs.length}</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Critical Incidents</p>
                <p className="text-2xl font-black text-amber-400 mt-1">{criticalThreats.length}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Avg Risk Score</p>
                <p
                  className={`text-2xl font-black mt-1 ${
                    avgRiskScore >= 60
                      ? 'text-red-400'
                      : avgRiskScore >= 35
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {avgRiskScore}
                  <span className="text-sm font-semibold text-slate-500">/100</span>
                </p>
              </div>
              <div className="p-3 bg-cyan-500/10 rounded-lg text-cyan-400">
                <Gauge className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Blocked IP Rules</p>
                <p className="text-2xl font-black text-purple-400 mt-1">{blockedIps.length}</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
                <UserX className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Threat Distribution Pie Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Attack Vector Classification Distribution
              </h3>
              <div className="h-56 w-full">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: string) => (
                          <span className="text-slate-300 text-[11px] ml-1">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                    No data to visualize yet
                  </div>
                )}
              </div>
            </div>

            {/* Severity Bar Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Vulnerability Severity Spectrum
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <XAxis dataKey="severity" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="square"
                      iconSize={8}
                      formatter={() => (
                        <span className="text-slate-300 text-[11px] ml-1">Incident Count</span>
                      )}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell
                          key={`bar-${index}`}
                          fill={SEVERITY_COLORS[entry.severity] || '#38BDF8'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AI-Powered Natural Language Threat Investigation Bar (Component 3) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  AI-Powered Threat Intelligence Query & Correlation
                </h3>
              </div>
              {queryResult && (
                <button
                  onClick={() => {
                    setQueryResult(null);
                    setSearchQuery('');
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Clear Filter ({displayedLogs.length} matching)
                </button>
              )}
            </div>

            <form onSubmit={handleRunAiQuery} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ask in natural language (e.g. 'Show critical SQL injections', 'Find brute force attacks on /login', 'Attacks from 192.168.1.104')..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition font-sans"
                />
              </div>
              <button
                type="submit"
                disabled={isAnalyzingQuery}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
              >
                {isAnalyzingQuery ? (
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Investigate
              </button>
            </form>

            {queryResult && (
              <div className="p-3 bg-slate-950 rounded-lg border border-cyan-800/60 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 flex items-center gap-1">
                    <Bot className="w-3.5 h-3.5" /> AI Investigation Assessment:
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    Filtered {queryResult.matchingLogIds.length} event(s)
                  </span>
                </div>
                <p className="text-slate-300">{queryResult.summary}</p>
                {queryResult.threatAssessment && (
                  <p className="text-[11px] text-amber-300/90 font-medium">
                    ⚡ {queryResult.threatAssessment}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Threat Logs Table & Real-Time Incident Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200">
                  Real-Time Threat Stream & Explainable Incident Telemetry
                </h3>
                <p className="text-[11px] text-slate-400">
                  Showing {displayedLogs.length} of {logs.length} logged incidents
                </p>
              </div>
              <button
                onClick={() => setActiveView('chat')}
                className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded text-xs flex items-center gap-1 transition"
              >
                <Bot className="w-3.5 h-3.5" /> Consult AI Analyst
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Source IP</th>
                    <th className="p-3">Target Endpoint</th>
                    <th className="p-3">Threat Vector</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Risk Score</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Explainable AI / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {displayedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        {queryResult
                          ? 'No incidents match this AI investigation query.'
                          : 'No threat logs generated yet. Use the Simulated Client App to trigger attack simulations.'}
                      </td>
                    </tr>
                  ) : (
                    displayedLogs.map((log) => {
                      const isBlocked = blockedIps.includes(log.sourceIp);
                      const isAiMode = log.analysisMode === 'ai';
                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 font-mono text-[11px] text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="p-3 font-mono">
                            {log.sourceIp}
                            {isBlocked && (
                              <span className="ml-1.5 text-[9px] font-bold text-red-400 bg-red-950/80 px-1 py-0.5 rounded border border-red-900">
                                BLOCKED
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-300">{log.targetEndpoint}</td>
                          <td className="p-3 font-semibold text-cyan-400">{log.threatType}</td>
                          <td className="p-3">{getSeverityBadge(log.severity)}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    log.riskScore > 75
                                      ? 'bg-red-500'
                                      : log.riskScore > 50
                                      ? 'bg-orange-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${log.riskScore}%` }}
                                ></div>
                              </div>
                              <span className="font-mono text-[11px] font-bold">
                                {log.riskScore}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono text-[9px] border ${
                                isAiMode
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {isAiMode ? '🤖 AI' : '⚙️ Rule'}
                            </span>
                          </td>
                          {/* Incident Status Dropdown */}
                          <td className="p-3">
                            <select
                              value={log.status}
                              onChange={(e) =>
                                onUpdateStatus(log.id, e.target.value as SecurityLog['status'])
                              }
                              className={`px-2 py-1 rounded text-[11px] font-bold border cursor-pointer appearance-none text-center transition focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                                STATUS_STYLES[log.status]
                              }`}
                              style={{ backgroundImage: 'none' }}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s} className="bg-slate-900 text-slate-200">
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3 flex items-center gap-2">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded text-[11px] flex items-center gap-1 transition"
                            >
                              <Info className="w-3 h-3" /> XAI Reason
                            </button>
                            <button
                              onClick={() => onToggleBlockIp(log.sourceIp)}
                              className={`px-2 py-1 rounded text-[11px] font-semibold border transition ${
                                isBlocked
                                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                  : 'bg-red-950 hover:bg-red-900 text-red-300 border-red-800'
                              }`}
                            >
                              {isBlocked ? 'Unblock IP' : 'Block IP'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Enhanced Explainable AI (XAI) Modal (Component 4) */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Explainable AI (XAI) Threat Breakdown
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${
                        selectedLog.analysisMode === 'ai'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}
                    >
                      {selectedLog.analysisMode === 'ai'
                        ? `🟢 ${activeModel} Deep Model`
                        : '🟡 Fallback Rule-Based Detection'}
                    </span>
                    {typeof selectedLog.confidence === 'number' && (
                      <span className="text-[11px] text-cyan-400 font-mono">
                        {Math.round(selectedLog.confidence * 100)}% Confidence
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-200 text-sm p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Metric Highlights */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 text-[11px]">Threat Vector:</span>
                  <p className="font-bold text-cyan-400">{selectedLog.threatType}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Assessed Risk Score:</span>
                  <p className="font-bold text-red-400">{selectedLog.riskScore} / 100</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Incident Status:</span>
                  <p
                    className={`font-bold ${
                      selectedLog.status === 'Resolved'
                        ? 'text-emerald-400'
                        : selectedLog.status === 'Blocked'
                        ? 'text-red-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {selectedLog.status}
                  </p>
                </div>
              </div>

              {/* Captured Payload / Query */}
              <div>
                <p className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-slate-400" />
                  Captured HTTP Body / Request Payload:
                </p>
                <div className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] text-cyan-300 border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                  {selectedLog.payload || '(No explicit request body payload)'}
                </div>
              </div>

              {/* Model Decision Explanations */}
              <div>
                <p className="font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Model Reasoning & Explainability:
                </p>
                <ul className="space-y-1.5">
                  {selectedLog.xaiReasoning.map((reason, idx) => (
                    <li
                      key={idx}
                      className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 text-slate-300 flex items-start gap-2"
                    >
                      <span className="text-cyan-400 font-bold shrink-0 mt-0.5">•</span>
                      <span className="leading-relaxed">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Remediation Playbook (Component 4) */}
              {selectedLog.recommendedAction && (
                <div className="p-3 bg-cyan-950/20 border border-cyan-800/70 rounded-xl space-y-1">
                  <p className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    AI Recommended Remediation Playbook:
                  </p>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {selectedLog.recommendedAction}
                  </p>
                </div>
              )}

              {/* CVE & Compliance References */}
              {selectedLog.cveReferences && selectedLog.cveReferences.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Vulnerability Mapping & Standards:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLog.cveReferences.map((ref, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 font-mono text-[10px]"
                      >
                        {ref}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => handleAskAnalystAboutIncident(selectedLog)}
                className="flex-1 py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-cyan-600/30"
              >
                <Bot className="w-3.5 h-3.5" />
                Ask AI Analyst About This Incident
              </button>
              <button
                onClick={() => setSelectedLog(null)}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Configuration Modal */}
      <AIConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        isAIActive={isAIActive}
        activeModel={activeModel}
        onAIActivated={() => {
          if (onRefreshAIStatus) onRefreshAIStatus();
          setIsConfigModalOpen(false);
        }}
      />
    </div>
  );
}
