'use client';

import React, { useState } from 'react';
import { HoneySite } from '@/components/HoneySite';
import { AdminDashboard } from '@/components/AdminDashboard';
import { SecurityLog, analyzeSecurityLog } from '@/lib/threatEngine';
import { Shield, LayoutDashboard, Globe, AlertOctagon, Terminal } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'honeysite' | 'admin'>('admin');
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [blockedIps, setBlockedIps] = useState<string[]>([]);

  const handleActivityDetected = (
    sourceIp: string,
    targetEndpoint: string,
    requestMethod: 'GET' | 'POST' | 'PUT' | 'DELETE',
    payload: string
  ) => {
    // Analyze activity via the ML engine
    const analysis = analyzeSecurityLog(sourceIp, targetEndpoint, requestMethod, payload, logs);

    const newLog: SecurityLog = {
      ...analysis,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      status: 'Active',
    };

    setLogs((prev) => [newLog, ...prev]);
  };

  const handleUpdateStatus = (id: string, newStatus: SecurityLog['status']) => {
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
  };

  const handleToggleBlockIp = (ip: string) => {
    setBlockedIps((prev) => (prev.includes(ip) ? prev.filter((i) => i !== ip) : [...prev, ip]));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                AegisSOC <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">v1.0 ML-Engine</span>
              </h1>
              <p className="text-xs text-slate-400">AI Cybersecurity Threat Detection & Incident Response Platform</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-2 transition ${
                activeTab === 'admin'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              SOC Admin Console
            </button>
            <button
              onClick={() => setActiveTab('honeysite')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-2 transition ${
                activeTab === 'honeysite'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Simulated Client App
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {blockedIps.length > 0 && (
          <div className="mb-6 p-3 bg-purple-950/40 border border-purple-800/80 rounded-lg text-purple-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Active Firewall Rules: <strong>{blockedIps.length} IP(s) currently blocked</strong></span>
            </div>
            <button
              onClick={() => setBlockedIps([])}
              className="text-[11px] underline hover:text-purple-300 font-medium"
            >
              Clear All IP Blocks
            </button>
          </div>
        )}

        {activeTab === 'admin' ? (
          <AdminDashboard
            logs={logs}
            blockedIps={blockedIps}
            onUpdateStatus={handleUpdateStatus}
            onToggleBlockIp={handleToggleBlockIp}
          />
        ) : (
          <div className="max-w-4xl mx-auto">
            <HoneySite onActivityDetected={handleActivityDetected} />
          </div>
        )}
      </main>
    </div>
  );
}
