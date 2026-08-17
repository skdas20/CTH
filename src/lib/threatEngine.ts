export interface SecurityLog {
  id: string;
  timestamp: string;
  sourceIp: string;
  targetEndpoint: string;
  requestMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: string;
  headers?: Record<string, string>;
  responseCode: number;
  threatType: 'SQL Injection' | 'Cross-Site Scripting (XSS)' | 'Brute Force Attempt' | 'DoS / Rate Spike' | 'Directory Traversal' | 'Normal Traffic';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  riskScore: number; // 0 to 100
  xaiReasoning: string[]; // Explainable AI factors
  status: 'Active' | 'Investigating' | 'Resolved' | 'Blocked';
}

export interface SecurityStats {
  totalRequests: number;
  threatsDetected: number;
  blockedIpsCount: number;
  criticalAlertsCount: number;
}

// Behavioral & Payload Machine Learning Rule Scorer
export function analyzeSecurityLog(
  sourceIp: string,
  targetEndpoint: string,
  requestMethod: 'GET' | 'POST' | 'PUT' | 'DELETE',
  payload: string = '',
  recentLogsFromIp: SecurityLog[] = []
): Omit<SecurityLog, 'id' | 'timestamp' | 'status'> {
  let riskScore = 5;
  let threatType: SecurityLog['threatType'] = 'Normal Traffic';
  const xaiReasoning: string[] = [];

  const lowerPayload = payload.toLowerCase();
  const lowerEndpoint = targetEndpoint.toLowerCase();

  // 1. SQL Injection Detection Pattern
  const sqlPatterns = ["' or '1'='1", "union select", "; drop table", "--", "admin'--", "' or 1=1"];
  const matchesSql = sqlPatterns.some((pattern) => lowerPayload.includes(pattern) || lowerEndpoint.includes(encodeURIComponent(pattern)));
  if (matchesSql) {
    threatType = 'SQL Injection';
    riskScore += 75;
    xaiReasoning.push('Detected SQL keyword patterns in input query string / body payload.');
    xaiReasoning.push('Input attempts to bypass database authentication logic.');
  }

  // 2. Cross-Site Scripting (XSS) Detection
  const xssPatterns = ['<script>', 'javascript:', 'onerror=', 'onload=', 'eval(', 'alert('];
  const matchesXss = xssPatterns.some((pattern) => lowerPayload.includes(pattern) || lowerEndpoint.includes(pattern));
  if (matchesXss && threatType === 'Normal Traffic') {
    threatType = 'Cross-Site Scripting (XSS)';
    riskScore += 70;
    xaiReasoning.push('Detected client-side script execution payload (<script> / onerror tags).');
    xaiReasoning.push('High probability of DOM-based session hijacking attempt.');
  }

  // 3. Path / Directory Traversal
  const traversalPatterns = ['../', '..\\', '/etc/passwd', 'c:\\windows\\system32'];
  const matchesTraversal = traversalPatterns.some((pattern) => lowerPayload.includes(pattern) || lowerEndpoint.includes(pattern));
  if (matchesTraversal && threatType === 'Normal Traffic') {
    threatType = 'Directory Traversal';
    riskScore += 65;
    xaiReasoning.push('Attempted unauthorized path traversal to access sensitive OS system files.');
  }

  // 4. Behavioral Frequency Analysis: Brute Force & DoS Detection
  const nowMs = Date.now();
  const oneMinuteAgo = nowMs - 60 * 1000;
  const fiveSecsAgo = nowMs - 5 * 1000;

  const recentIpLogs = recentLogsFromIp.filter((l) => new Date(l.timestamp).getTime() > oneMinuteAgo);
  const ultraRecentIpLogs = recentLogsFromIp.filter((l) => new Date(l.timestamp).getTime() > fiveSecsAgo);

  // Rate Burst (DoS)
  if (ultraRecentIpLogs.length >= 6) {
    threatType = 'DoS / Rate Spike';
    riskScore = Math.max(riskScore, 85);
    xaiReasoning.push(`High request rate anomaly: ${ultraRecentIpLogs.length} requests in 5 seconds from source IP.`);
    xaiReasoning.push('Triggers volumetric denial-of-service defense heuristic threshold.');
  } 
  // Brute Force on Auth endpoints
  else if (targetEndpoint.includes('/login') || targetEndpoint.includes('/auth')) {
    const failedLogins = recentIpLogs.filter((l) => l.responseCode === 401 || l.responseCode === 403);
    if (failedLogins.length >= 3) {
      threatType = 'Brute Force Attempt';
      riskScore = Math.max(riskScore, 80);
      xaiReasoning.push(`Repeated authentication failures (${failedLogins.length} within 60s).`);
      xaiReasoning.push('Pattern aligns with dictionary attack / credential stuffing bot signatures.');
    }
  }

  // Cap Score
  riskScore = Math.min(100, Math.max(5, riskScore));

  // Determine Severity level based on risk score
  let severity: SecurityLog['severity'] = 'Low';
  if (riskScore >= 80) severity = 'Critical';
  else if (riskScore >= 60) severity = 'High';
  else if (riskScore >= 35) severity = 'Medium';

  if (xaiReasoning.length === 0) {
    xaiReasoning.push('Standard HTTP GET/POST behavior matching clean baseline traffic distribution.');
  }

  const responseCode = threatType === 'Normal Traffic' ? 200 : threatType === 'Brute Force Attempt' ? 401 : 403;

  return {
    sourceIp,
    targetEndpoint,
    requestMethod,
    payload,
    responseCode,
    threatType,
    severity,
    riskScore,
    xaiReasoning,
  };
}
