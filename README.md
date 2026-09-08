# AegisSOC — AI-Powered Cybersecurity Threat Detection & Incident Response Platform

An industry-level, full-stack cybersecurity application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and an integrated **SQLite database** for full data persistence.

---

## 🎯 What Does This Project Do?

This system simulates a **Security Operations Center (SOC)** alongside a live user-facing web portal ("Honey-Site"):

1. **Simulated Victim Portal ("Honey-Site"):**
   * Acts as an e-commerce/user portal with interactive login, search, and catalog endpoints.
   * Users can interact normally or simulate attacks using built-in 1-click attack vectors (SQL Injection, Cross-Site Scripting, Brute Force, Volumetric DoS, and Directory Traversal).
   * User telemetry and conduct are captured in real-time.

2. **AI Threat Detection & Scoring Engine:**
   * Analyzes inbound requests, frequency bursts, and payloads.
   * Classifies vulnerabilities (SQLi, XSS, Brute Force, DoS, Path Traversal, Clean Traffic).
   * Assigns mathematical **Risk Scores (0–100)** and **Severity Ratings (Low, Medium, High, Critical)**.
   * Generates **Explainable AI (XAI)** reasoning detailing *why* the model made that decision.

3. **SOC Admin Dashboard:**
   * Visualizes real-time metrics, threat breakdown pie charts, and severity spectrum bar charts.
   * Interactive incident management: change status, view XAI reasoning, and block/unblock malicious IPs.

4. **Persistent SQLite Database:**
   * **All telemetry logs, threat scores, and firewall IP blocks are saved to a real local SQLite database (`data/cybersecurity.db`).**
   * Everything persists across page refreshes and server restarts!

---

## 🚀 Quick Setup & Run Guide

### 1. Prerequisites
- **Node.js**: v18 or later (v20+ recommended)
- **npm** (included with Node.js)

### 2. Install Dependencies
Open a terminal inside this project folder and run:
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Open in Browser
Visit:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 How to Test

1. In the top navigation bar, click **"Simulated Client App"**.
2. Scroll to the **"Quick Attack Vector Simulators"** section:
   - Click **SQL Injection Attack** (submits SQL bypass credentials).
   - Click **XSS Script Attack** (submits malicious JavaScript tags).
   - Click **Brute Force Auth** (sends 4 rapid failed logins).
   - Click **Volumetric DoS Burst** (triggers 8 rapid requests in 5s).
   - Click **Directory Traversal** (attempts accessing `/etc/passwd`).
3. Switch over to the **"SOC Admin Console"** tab:
   - Notice the telemetry table and charts update automatically.
   - Click **"XAI Reason"** next to any event to inspect the AI's explanation and payload breakdown.
   - Click **"Block IP"** to add an IP to the active firewall list.
   - Refresh your browser tab — **notice all logs and blocked IPs stay saved because of SQLite!**

---

## 📂 Project Architecture

```text
cybersecurity-soc/
├── data/
│   └── cybersecurity.db        <-- Persistent SQLite Database
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── logs/route.ts   <-- SQLite Log Ingestion & Status API
│   │   │   └── firewall/route.ts <-- SQLite IP Firewall Rules API
│   │   ├── page.tsx            <-- Main View & Navigation State
│   │   └── layout.tsx
│   ├── components/
│   │   ├── AdminDashboard.tsx  <-- Real-time SOC Panel & Analytics
│   │   └── HoneySite.tsx       <-- Interactive Client & Attack Simulator
│   └── lib/
│       ├── db.ts               <-- SQLite Connection & Schema
│       └── threatEngine.ts     <-- AI / Behavioral Anomaly Detection
├── package.json
└── README.md
```

---

## 🛡️ Key Technologies Used
- **Next.js 16 (App Router)** & **React 19**
- **TypeScript**
- **SQLite3** (Local embedded relational database)
- **Recharts** & **Lucide React** (Data visualization & icons)
- **Tailwind CSS** (Dark-mode responsive design)
