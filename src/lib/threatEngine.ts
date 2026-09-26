import {
  getGeminiClient,
  isAIEnabled,
  getActiveModel,
  THREAT_ANALYSIS_SCHEMA,
  THREAT_SYSTEM_INSTRUCTION,
} from './gemini';

export interface SecurityLog {
  id: string;
  timestamp: string;
  sourceIp: string;
  targetEndpoint: string;
  requestMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: string;
  headers?: Record<string, string>;
  responseCode: number;
  threatType:
    | 'SQL Injection'
    | 'Cross-Site Scripting (XSS)'
    | 'Brute Force Attempt'
    | 'DoS / Rate Spike'
    | 'Directory Traversal'
    | 'Command Injection'
    | 'SSRF'
    | 'Authentication Bypass'
    | 'Normal Traffic';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  riskScore: number;
  xaiReasoning: string[];
  status: 'Active' | 'Investigating' | 'Resolved' | 'Blocked';
  // AI-powered fields
  confidence?: number;
  recommendedAction?: string;
  cveReferences?: string[];
  analysisMode?: 'ai' | 'fallback';
}

export interface SecurityStats {
  totalRequests: number;
  threatsDetected: number;
  blockedIpsCount: number;
  criticalAlertsCount: number;
}

// ──────────────────────────────────────────────
// PRIMARY: Gemini AI-powered analysis
// ──────────────────────────────────────────────

async function analyzeWithGemini(
  sourceIp: string,
  targetEndpoint: string,
  requestMethod: string,
  payload: string,
  recentLogsFromIp: SecurityLog[]
): Promise<Omit<SecurityLog, 'id' | 'timestamp' | 'status'> | null> {
  const client = getGeminiClient();
  if (!client) return null;

  const recentContext = recentLogsFromIp.slice(0, 10).map((l) => ({
    timestamp: l.timestamp,
    endpoint: l.targetEndpoint,
    method: l.requestMethod,
    threatType: l.threatType,
    riskScore: l.riskScore,
    responseCode: l.responseCode,
  }));

  const userPrompt = `Analyze this HTTP request for security threats:

**Request Details:**
- Source IP: ${sourceIp}
- Target Endpoint: ${targetEndpoint}
- HTTP Method: ${requestMethod}
- Payload/Body: ${payload || '(empty)'}

**Behavioral Context — Recent activity from this IP (last ${recentContext.length} requests):**
${
  recentContext.length > 0
    ? JSON.stringify(recentContext, null, 2)
    : 'No prior activity from this IP recorded in the SOC.'
}

Classify this request, assess risk severity, generate exact explainable AI reasoning, cite CVE/OWASP references, and provide remediation.`;

  try {
    const activeModel = getActiveModel();
    const response = await client.models.generateContent({
      model: activeModel,
      contents: userPrompt,
      config: {
        systemInstruction: THREAT_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: THREAT_ANALYSIS_SCHEMA,
        temperature: 0.15,
      },
    });

    const text = response.text;
    if (!text) return null;

    // Clean any markdown formatting if present
    const cleanJson = text.replace(/```(?:json)?\n?/gi, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJson);

    const validThreatTypes: SecurityLog['threatType'][] = [
      'SQL Injection',
      'Cross-Site Scripting (XSS)',
      'Brute Force Attempt',
      'DoS / Rate Spike',
      'Directory Traversal',
      'Command Injection',
      'SSRF',
      'Authentication Bypass',
      'Normal Traffic',
    ];

    const threatType: SecurityLog['threatType'] = validThreatTypes.includes(result.threatType)
      ? result.threatType
      : 'Normal Traffic';

    const validSeverities: SecurityLog['severity'][] = ['Low', 'Medium', 'High', 'Critical'];
    const severity: SecurityLog['severity'] = validSeverities.includes(result.severity)
      ? result.severity
      : 'Low';

    const responseCode =
      threatType === 'Normal Traffic'
        ? 200
        : threatType === 'Brute Force Attempt'
        ? 401
        : 403;

    return {
      sourceIp,
      targetEndpoint,
      requestMethod: requestMethod as SecurityLog['requestMethod'],
      payload,
      responseCode,
      threatType,
      severity,
      riskScore: Math.min(100, Math.max(0, Math.round(Number(result.riskScore) || 10))),
      xaiReasoning: Array.isArray(result.xaiReasoning) && result.xaiReasoning.length > 0
        ? result.xaiReasoning
        : ['AI analyzed request payload and behavioral context.'],
      confidence: typeof result.confidence === 'number' ? Math.min(1, Math.max(0, result.confidence)) : 0.95,
      recommendedAction: result.recommendedAction || 'Monitor traffic from this source IP.',
      cveReferences: Array.isArray(result.cveReferences) ? result.cveReferences : [],
      analysisMode: 'ai',
    };
  } catch (error) {
    console.error('Gemini AI analysis failed or timed out, gracefully falling back to rules:', error);
    return null;
  }
}

// ──────────────────────────────────────────────
// FALLBACK: Rule-based analysis (Graceful Degradation)
// ──────────────────────────────────────────────

function analyzeWithRules(
  sourceIp: string,
  targetEndpoint: string,
  requestMethod: string,
  payload: string,
  recentLogsFromIp: SecurityLog[]
): Omit<SecurityLog, 'id' | 'timestamp' | 'status'> {
  let riskScore = 5;
  let threatType: SecurityLog['threatType'] = 'Normal Traffic';
  const xaiReasoning: string[] = [];
  const cveReferences: string[] = [];
  let recommendedAction = 'Traffic appears benign. Continue standard monitoring.';

  const lowerPayload = payload.toLowerCase();
  const lowerEndpoint = targetEndpoint.toLowerCase();

  // 1. SQL Injection Detection
  const sqlPatterns = ["' or '1'='1", "union select", "; drop table", "--", "admin'--", "' or 1=1", "select * from"];
  if (sqlPatterns.some((p) => lowerPayload.includes(p) || lowerEndpoint.includes(encodeURIComponent(p)))) {
    threatType = 'SQL Injection';
    riskScore += 80;
    xaiReasoning.push('[Fallback Rule] Detected SQL injection syntax pattern in query/body.');
    xaiReasoning.push('[Fallback Rule] Payload attempts tautology boolean bypass (e.g. 1=1 or comment delimiter).');
    cveReferences.push('CWE-89: SQL Injection', 'OWASP Top 10 A03:2021-Injection');
    recommendedAction = 'Deploy parameterized prepared statements immediately and inspect database query logs.';
  }

  // 2. XSS Detection
  const xssPatterns = ['<script>', 'javascript:', 'onerror=', 'onload=', 'eval(', 'alert('];
  if (xssPatterns.some((p) => lowerPayload.includes(p) || lowerEndpoint.includes(p)) && threatType === 'Normal Traffic') {
    threatType = 'Cross-Site Scripting (XSS)';
    riskScore += 75;
    xaiReasoning.push('[Fallback Rule] Detected HTML/JavaScript injection vector in request.');
    xaiReasoning.push('[Fallback Rule] Execution payload poses high risk of DOM-based session cookie theft.');
    cveReferences.push('CWE-79: Cross-Site Scripting', 'OWASP Top 10 A03:2021-Injection');
    recommendedAction = 'Sanitize HTML output encoding and enforce strict Content Security Policy (CSP).';
  }

  // 3. Path Traversal
  const traversalPatterns = ['../', '..\\', '/etc/passwd', 'c:\\windows\\system32', 'win.ini'];
  if (traversalPatterns.some((p) => lowerPayload.includes(p) || lowerEndpoint.includes(p)) && threatType === 'Normal Traffic') {
    threatType = 'Directory Traversal';
    riskScore += 70;
    xaiReasoning.push('[Fallback Rule] Detected directory traversal sequence (../) targeting sensitive file paths.');
    cveReferences.push('CWE-22: Path Traversal', 'OWASP Top 10 A01:2021-Broken Access Control');
    recommendedAction = 'Restrict file access paths to a strict whitelist and validate canonical paths.';
  }

  // 4. Behavioral Frequency Analysis
  const nowMs = Date.now();
  const oneMinuteAgo = nowMs - 60 * 1000;
  const fiveSecsAgo = nowMs - 5 * 1000;

  const recentIpLogs = recentLogsFromIp.filter((l) => new Date(l.timestamp).getTime() > oneMinuteAgo);
  const ultraRecentIpLogs = recentLogsFromIp.filter((l) => new Date(l.timestamp).getTime() > fiveSecsAgo);

  if (ultraRecentIpLogs.length >= 6) {
    threatType = 'DoS / Rate Spike';
    riskScore = Math.max(riskScore, 85);
    xaiReasoning.push(`[Fallback Rule] Volumetric rate spike: ${ultraRecentIpLogs.length} requests in 5 seconds.`);
    cveReferences.push('CWE-400: Uncontrolled Resource Consumption');
    recommendedAction = 'Enable rate-limiting at reverse proxy / WAF level and temporarily throttle client IP.';
  } else if (targetEndpoint.includes('/login') || targetEndpoint.includes('/auth')) {
    const failedLogins = recentIpLogs.filter((l) => l.responseCode === 401 || l.responseCode === 403);
    if (failedLogins.length >= 3) {
      threatType = 'Brute Force Attempt';
      riskScore = Math.max(riskScore, 80);
      xaiReasoning.push(`[Fallback Rule] Repeated authentication failure threshold exceeded (${failedLogins.length} attempts within 60s).`);
      cveReferences.push('CWE-307: Improper Restriction of Excessive Authentication Attempts');
      recommendedAction = 'Trigger account lockout policy or require CAPTCHA challenge on login endpoint.';
    }
  }

  riskScore = Math.min(100, Math.max(5, riskScore));

  let severity: SecurityLog['severity'] = 'Low';
  if (riskScore >= 80) severity = 'Critical';
  else if (riskScore >= 60) severity = 'High';
  else if (riskScore >= 35) severity = 'Medium';

  if (xaiReasoning.length === 0) {
    xaiReasoning.push('[Fallback Rule] Standard HTTP traffic matching benign baseline behavior.');
  }

  const responseCode = threatType === 'Normal Traffic' ? 200 : threatType === 'Brute Force Attempt' ? 401 : 403;

  return {
    sourceIp,
    targetEndpoint,
    requestMethod: requestMethod as SecurityLog['requestMethod'],
    payload,
    responseCode,
    threatType,
    severity,
    riskScore,
    xaiReasoning,
    confidence: 0.85,
    recommendedAction,
    cveReferences,
    analysisMode: 'fallback',
  };
}

// ──────────────────────────────────────────────
// PUBLIC API: Tries AI first, falls back to rules
// ──────────────────────────────────────────────

export async function analyzeSecurityLog(
  sourceIp: string,
  targetEndpoint: string,
  requestMethod: 'GET' | 'POST' | 'PUT' | 'DELETE',
  payload: string = '',
  recentLogsFromIp: SecurityLog[] = []
): Promise<Omit<SecurityLog, 'id' | 'timestamp' | 'status'>> {
  if (isAIEnabled()) {
    try {
      const aiResult = await analyzeWithGemini(sourceIp, targetEndpoint, requestMethod, payload, recentLogsFromIp);
      if (aiResult) return aiResult;
    } catch (err) {
      console.warn('Gemini analysis failed, falling back to rules:', err);
    }
  }

  // Graceful degradation fallback
  return analyzeWithRules(sourceIp, targetEndpoint, requestMethod, payload, recentLogsFromIp);
}

export { isAIEnabled, getActiveModel };
