'use client';

import React from 'react';
import { SecurityLog } from '@/lib/threatEngine';
import { Shield, AlertTriangle, Cpu, Activity, UserX, XCircle, CheckCircle, Info, ShieldAlert } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface AdminDashboardProps {
  logs: SecurityLog[];
  blockedIps: string[];
  onUpdateStatus: (id: string, newStatus: SecurityLog['status']) => void;
  onToggleBlockIp: (ip: string) => void;
}

export function AdminDashboard({ logs, blockedIps, onUpdateStatus, onToggleBlockIp }: AdminDashboardProps) {
  const [selectedLog, setSelectedLog] = React.useState<SecurityLog | null>(null);

  // Statistics calculation
  const totalRequests = logs.length;
  const threatLogs = logs.filter((l) => l.threatType !== 'Normal Traffic');
  const criticalThreats = logs.filter((l) => l.severity === 'Critical');
  const avgRiskScore = totalRequests > 0 ? Math.round(logs.reduce((acc, curr) => acc + curr.riskScore, 0) / totalRequests) : 0;

  // Chart data formatting
  const threatTypeCounts = logs.reduce((acc: Record<string, number>, log) => {
    acc[log.threatType] = (acc[log.threatType] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.keys(threatTypeCounts).map((key) => ({
    name: key,
    value: threatTypeCounts[key],
  }));

  const COLORS = ['#10B981', '#EF4444', '#F97316', '#A855F7', '#EC4899', '#EAB308'];

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

  const getSeverityBadge = (severity: SecurityLog['severity']) => {
    switch (severity) {
      case 'Critical':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-950 text-red-400 border border-red-800">Critical</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-950 text-orange-400 border border-orange-800">High</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-400 border border-amber-800">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">Low</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Captured Telemetry</p>
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
            <p className="text-xs text-slate-400 font-medium">Blocked IP Addresses</p>
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
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            Vulnerability Severity Spectrum
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="severity" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#38BDF8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Threat Logs Table & XAI Detail Modal */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200">Real-Time Cybersecurity Threat Stream & Incident Log</h3>
          <span className="text-xs text-slate-400">{logs.length} logged incidents</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Source IP</th>
                <th className="p-3">Target Endpoint</th>
                <th className="p-3">Threat Type</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Risk Score</th>
                <th className="p-3">Action / Explainable AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    No threat logs generated yet. Use the simulated portal above to interact or trigger attacks.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isBlocked = blockedIps.includes(log.sourceIp);
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono text-[11px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="p-3 font-mono">
                        {log.sourceIp}
                        {isBlocked && <span className="ml-1.5 text-[9px] font-bold text-red-400 bg-red-950/80 px-1 py-0.5 rounded">BLOCKED</span>}
                      </td>
                      <td className="p-3 font-mono text-slate-300">{log.targetEndpoint}</td>
                      <td className="p-3 font-semibold text-cyan-400">{log.threatType}</td>
                      <td className="p-3">{getSeverityBadge(log.severity)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                log.riskScore > 75 ? 'bg-red-500' : log.riskScore > 50 ? 'bg-orange-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${log.riskScore}%` }}
                            ></div>
                          </div>
                          <span className="font-mono text-[11px] font-bold">{log.riskScore}</span>
                        </div>
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
                              ? 'bg-slate-800 text-slate-300 border-slate-700'
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

      {/* Explainable AI (XAI) Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                Explainable AI (XAI) Threat Breakdown
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-200 text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded border border-slate-800">
                <div>
                  <span className="text-slate-400">Incident Type:</span>
                  <p className="font-bold text-cyan-400">{selectedLog.threatType}</p>
                </div>
                <div>
                  <span className="text-slate-400">Calculated Risk Score:</span>
                  <p className="font-bold text-red-400">{selectedLog.riskScore} / 100</p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-300 mb-1">Captured Payload / Query:</p>
                <div className="p-2.5 bg-slate-950 rounded font-mono text-[11px] text-slate-300 border border-slate-800 overflow-x-auto">
                  {selectedLog.payload || '(No explicit body payload)'}
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-300 mb-2">Model Decision Explanations:</p>
                <ul className="space-y-1.5">
                  {selectedLog.xaiReasoning.map((reason, idx) => (
                    <li key={idx} className="p-2 bg-slate-950 rounded border border-slate-800/80 text-slate-300 flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded text-xs transition"
            >
              Close Explanation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
