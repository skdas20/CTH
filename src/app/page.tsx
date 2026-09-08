'use client';

import React, { useState, useEffect } from 'react';
import { HoneySite } from '@/components/HoneySite';
import { AdminDashboard } from '@/components/AdminDashboard';
import { SecurityLog } from '@/lib/threatEngine';
import { Shield, LayoutDashboard, Globe, AlertOctagon, Database, RefreshCw } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'honeysite' | 'admin'>('admin');
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [blockedIps, setBlockedIps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Fetch initial logs and blocked IPs from SQLite database API
  const fetchData = async () => {
    setIsSyncing(true);
    try {
      const [logsRes, ipRes] = await Promise.all([
        fetch('/api/logs'),
        fetch('/api/firewall'),
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
      }

      if (ipRes.ok) {
        const data = await ipRes.json();
        setBlockedIps(data.blockedIps || []);
      }
    } catch (err) {
      console.error('Error fetching SQLite data:', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleActivityDetected = async (
    sourceIp: string,
    targetEndpoint: string,
    requestMethod: 'GET' | 'POST' | 'PUT' | 'DELETE',
    payload: string
  ) => {
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceIp,
          targetEndpoint,
          requestMethod,
          payload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.log) {
          setLogs((prev) => [data.log, ...prev]);
        }
      }
    } catch (err) {
      console.error('Failed to persist security telemetry to database:', err);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: SecurityLog['status']) => {
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
    try {
      await fetch('/api/logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update status in DB:', err);
    }
  };

  const handleToggleBlockIp = async (ip: string) => {
    const isCurrentlyBlocked = blockedIps.includes(ip);
    setBlockedIps((prev) =>
      isCurrentlyBlocked ? prev.filter((i) => i !== ip) : [...prev, ip]
    );

    try {
      await fetch('/api/firewall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip,
          action: isCurrentlyBlocked ? 'unblock' : 'block',
          reason: 'Manual action from SOC Admin Console',
        }),
      });
    } catch (err) {
      console.error('Failed to update firewall rule in DB:', err);
    }
  };

  const handleClearAllBlocks = async () => {
    setBlockedIps([]);
    try {
      await fetch('/api/firewall', { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to clear firewall blocks:', err);
    }
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
                AegisSOC
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                  v1.2 SQLite-Persistent
                </span>
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                AI Threat Detection Platform
                <span className="text-slate-600">•</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                  <Database className="w-3 h-3" /> SQLite Active
                </span>
              </p>
            </div>
          </div>

          {/* Right Navigation & Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={isSyncing}
              title="Refresh and sync data from SQLite"
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

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
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {blockedIps.length > 0 && (
          <div className="mb-6 p-3 bg-purple-950/40 border border-purple-800/80 rounded-lg text-purple-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                Active Firewall Rules (Persisted in SQLite):{' '}
                <strong>{blockedIps.length} IP(s) currently blocked</strong>
              </span>
            </div>
            <button
              onClick={handleClearAllBlocks}
              className="text-[11px] underline hover:text-purple-300 font-medium"
            >
              Clear All IP Blocks
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-xs font-mono">Connecting to SQLite Database & Loading Telemetry...</p>
          </div>
        ) : activeTab === 'admin' ? (
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
