# AegisSOC — AI-Powered Cybersecurity Threat Detection & Incident Response Platform

An enterprise-grade, full-stack cybersecurity platform built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Google Gemini 3 Family (3.8 / 3.6 / 3.5 Flash)**, and an integrated **SQLite database** for full data persistence.

---

## 🎯 What Does This Project Do?

This system simulates a modern **Security Operations Center (SOC)** alongside a live user-facing web portal ("Honey-Site"):

1. **Simulated Victim Portal ("Honey-Site"):**
   - E-commerce/user portal with interactive login, search, and catalog endpoints.
   - Built-in 1-click attack vector simulations (SQL Injection, Cross-Site Scripting, Brute Force, Volumetric DoS, and Directory Traversal).
   - Dynamic client IP randomization to simulate realistic attacker subnets.

2. **🧠 Genuine Gemini 3.8 / 3.6 / 3.5 Flash AI Threat Engine:**
   - Evaluates incoming HTTP payloads with multimodal LLM intent reasoning and structured JSON output.
   - Supports selecting between **Gemini 3.8 Flash** (Latest Frontier), **Gemini 3.6 Flash** (High Efficiency), and **Gemini 3.5 Flash** (Agentic Standard).
   - Computes dynamic **Risk Scores (0–100)** and **Severity Ratings (Low, Medium, High, Critical)**.
   - Generates unique, payload-specific **Explainable AI (XAI)** reasoning.
   - Maps threats to **CWE**, **CVE**, and **OWASP Top 10** standards with actionable **Remediation Playbooks**.
   - Includes automatic **graceful degradation** to rule heuristics when offline or if an API key is not yet configured.

3. **🤖 Interactive AegisAI Security Analyst Chat:**
   - Embedded Tier-3 SOC analyst assistant with direct real-time context of SQLite telemetry and active firewall rules.
   - Ask complex security questions, correlate attack patterns across IPs, or generate defensive WAF rules and code patches.

4. **🔍 Natural Language Threat Investigation:**
   - Query logs in plain English (e.g., *"Show critical SQL injections"* or *"Find brute force attacks on /login"*).
   - AI correlates logs, identifies affected endpoints, and provides an executive incident assessment.

5. **Persistent SQLite Database:**
   - Telemetry logs, threat scores, confidence metrics, and firewall IP blocks persist in `data/cybersecurity.db`.

---

## 🚀 Quick Setup & Run Guide

### 1. Prerequisites
- **Node.js**: v18 or later (v20+ recommended)
- **npm** (included with Node.js)

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Gemini AI (Optional but Recommended)
Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey) (free tier: 15 req/min, 1,500 req/day at $0 cost).

Copy `.env.example` to `.env.local` and add your key:
```env
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-3.8-flash
```
*(Alternatively, you can click the AI status badge in the top navbar inside the dashboard and activate your key directly through the UI!)*

### 4. Start Development Server
```bash
npm run dev
```

### 5. Open in Browser
Visit:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Testing the AI Features

1. **Trigger Attacks:** Switch to the **"Simulated Client App"** tab and click any attack simulator (e.g., SQL Injection, XSS, Brute Force).
2. **Review Telemetry:** Switch back to **"SOC Admin Console"** to see real-time captured incidents, charts, and severity breakdowns.
3. **Inspect Explainable AI (XAI):** Click **"XAI Reason"** on any incident to see the AI decision breakdown, confidence score, and remediation playbook.
4. **Natural Language Investigation:** In the query box above the table, type *"Show critical SQL injections"* and click **Investigate**.
5. **Chat with AegisAI:** Click **"Open AI Analyst Chat"** or use the quick query pills to analyze live telemetry.
