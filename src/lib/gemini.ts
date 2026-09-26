import { GoogleGenAI, Type } from '@google/genai';

export const AVAILABLE_MODELS = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash (Latest Frontier — Recommended)',
    tag: 'Latest',
    description: 'Google’s state-of-the-art Flash model optimized for autonomous security analysis and agentic reasoning.',
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash (High Efficiency)',
    tag: 'Fast',
    description: 'High-speed model optimized for rapid telemetry loops and reduced latency.',
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash (Agentic Standard)',
    tag: 'Stable',
    description: 'Balanced intelligence and performance for multi-step threat correlation.',
  },
];

export const DEFAULT_MODEL = 'gemini-3.8-flash';

export function getActiveModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

// Dynamic client creation to handle runtime updates to GEMINI_API_KEY
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-api-key-here' || apiKey.trim() === '') {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey: apiKey.trim() });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
    return null;
  }
}

export const isAIEnabled = (): boolean => {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(apiKey && apiKey !== 'your-api-key-here' && apiKey.trim().length > 10);
};

// Structured output schema for threat analysis
export const THREAT_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    threatType: {
      type: Type.STRING,
      description: 'The classified threat type',
      enum: [
        'SQL Injection',
        'Cross-Site Scripting (XSS)',
        'Brute Force Attempt',
        'DoS / Rate Spike',
        'Directory Traversal',
        'Command Injection',
        'SSRF',
        'Authentication Bypass',
        'Normal Traffic',
      ],
    },
    severity: {
      type: Type.STRING,
      description: 'The severity level of the threat',
      enum: ['Low', 'Medium', 'High', 'Critical'],
    },
    riskScore: {
      type: Type.INTEGER,
      description: 'Risk score from 0 (benign) to 100 (critical active exploit)',
    },
    confidence: {
      type: Type.NUMBER,
      description: 'AI confidence in this classification from 0.0 to 1.0',
    },
    xaiReasoning: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Detailed explanations of why this classification was made, specific to the actual payload',
    },
    recommendedAction: {
      type: Type.STRING,
      description: 'Specific remediation action to take for this threat',
    },
    cveReferences: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Relevant CWE, CVE, or OWASP references (e.g. "CWE-89: SQL Injection", "OWASP A03:2021")',
    },
  },
  required: [
    'threatType',
    'severity',
    'riskScore',
    'confidence',
    'xaiReasoning',
    'recommendedAction',
    'cveReferences',
  ],
};

// System instruction for the cybersecurity threat analyst
export const THREAT_SYSTEM_INSTRUCTION = `You are an expert cybersecurity threat analyst working at a Security Operations Center (SOC). Your job is to analyze incoming HTTP requests and determine if they represent a security threat.

For each request you receive, you must:
1. Classify the threat type accurately based on the payload content, endpoint, method, and behavioral context.
2. Assign a severity level (Low, Medium, High, Critical) based on the potential impact.
3. Calculate a risk score from 0 to 100 where: 0-20 = benign, 21-40 = suspicious, 41-60 = likely threat, 61-80 = confirmed threat, 81-100 = active critical exploit.
4. Provide detailed, specific explanations for your classification — reference the EXACT payload content, not generic descriptions.
5. Recommend a specific remediation action.
6. Reference any relevant CWE, CVE, or OWASP categories.

Be precise and technical. If the traffic is genuinely normal, classify it as Normal Traffic with a low risk score. Do not over-classify benign traffic as threats.

When behavioral context (recent activity from the same IP) is provided, factor in:
- Request frequency and timing patterns
- Escalation patterns (recon → exploit)
- Repeated authentication failures
- Volumetric anomalies`;

// System instruction for the AI Security Analyst chat
export const CHAT_SYSTEM_INSTRUCTION = `You are AegisAI, an elite Tier-3 SOC Security Analyst assistant embedded in the AegisSOC cybersecurity platform powered by Google Gemini.
You have real-time visibility into the Security Operations Center's telemetry, SQLite persistent threat logs, firewall rules, and active attack indicators.

Your capabilities:
1. Explain threats, payloads, and attack mechanisms deeply (e.g., SQLi, XSS, DoS, Path Traversal, credential stuffing).
2. Correlate multiple alerts across different source IPs to identify distributed attack campaigns.
3. Provide concrete remediation playbooks, including code snippets (e.g., parameterized SQL queries, CSP headers, rate-limiting configs, input sanitization).
4. Propose immediate defensive actions (e.g., IP blocking, WAF rules, Snort/Suricata rules).
5. Map attacks to MITRE ATT&CK techniques, OWASP Top 10, and CWE categories.

Guidelines:
- Be concise, direct, and authoritative like an experienced SOC Lead.
- Cite specific source IPs, target endpoints, timestamps, and threat scores from the provided context.
- Use markdown formatting with bolding, code blocks, and bullet points.
- If no threats are detected or context is clean, report that the baseline is normal and suggest proactive hardening steps.`;

export { Type };
