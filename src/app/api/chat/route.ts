import { NextResponse } from 'next/server';
import { getGeminiClient, isAIEnabled, getActiveModel, CHAT_SYSTEM_INSTRUCTION } from '@/lib/gemini';
import { dbAll } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Retrieve live SOC context from SQLite
    const [recentLogs, blockedIps, totalCountRow] = await Promise.all([
      dbAll<any>('SELECT timestamp, sourceIp, targetEndpoint, requestMethod, threatType, severity, riskScore, payload, status FROM security_logs ORDER BY timestamp DESC LIMIT 25'),
      dbAll<any>('SELECT ip, blockedAt, reason FROM blocked_ips'),
      dbAll<any>('SELECT COUNT(*) as total FROM security_logs'),
    ]);

    const totalLogs = totalCountRow[0]?.total || 0;
    const threatLogs = recentLogs.filter((l) => l.threatType !== 'Normal Traffic');
    const criticalLogs = recentLogs.filter((l) => l.severity === 'Critical');

    const topOffendingIps = recentLogs.reduce((acc: Record<string, number>, log) => {
      if (log.threatType !== 'Normal Traffic') {
        acc[log.sourceIp] = (acc[log.sourceIp] || 0) + 1;
      }
      return acc;
    }, {});

    const socContextSummary = `
Current SOC Telemetry Context:
- Total Logged Events in Database: ${totalLogs}
- Recent Logged Events Sampled: ${recentLogs.length}
- Active Threats in Recent Window: ${threatLogs.length}
- Critical Severity Alerts: ${criticalLogs.length}
- Currently Blocked IP Addresses (${blockedIps.length}): ${blockedIps.map((b) => b.ip).join(', ') || 'None'}
- Top Offending Source IPs: ${JSON.stringify(topOffendingIps)}

Recent Security Incidents:
${recentLogs.slice(0, 15).map((l) => `- [${l.timestamp}] IP:${l.sourceIp} | ${l.requestMethod} ${l.targetEndpoint} | Threat:${l.threatType} (${l.severity}, Score:${l.riskScore}) | Status:${l.status} | Payload:"${(l.payload || '').substring(0, 80)}"`).join('\n')}
`;

    // If Gemini AI is active
    if (isAIEnabled()) {
      const client = getGeminiClient();
      if (client) {
        try {
          const contents: any[] = [];

          // Include prior history if present
          if (Array.isArray(history) && history.length > 0) {
            for (const h of history.slice(-6)) {
              contents.push({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.text }],
              });
            }
          }

          // Append current message with context
          contents.push({
            role: 'user',
            parts: [
              {
                text: `${socContextSummary}\n\nUser Question:\n${message}`,
              },
            ],
          });

          const activeModel = getActiveModel();
          const geminiResponse = await client.models.generateContent({
            model: activeModel,
            contents,
            config: {
              systemInstruction: CHAT_SYSTEM_INSTRUCTION,
              temperature: 0.3,
            },
          });

          const text = geminiResponse.text;
          if (text) {
            return NextResponse.json({
              response: text,
              mode: 'ai',
              model: activeModel,
            });
          }
        } catch (aiErr: any) {
          console.warn('Gemini chat generation failed, switching to automated analyst response:', aiErr);
        }
      }
    }

    // Graceful degradation fallback response
    const lower = message.toLowerCase();
    let fallbackText = '';

    if (lower.includes('summar') || lower.includes('status') || lower.includes('posture') || lower.includes('overview')) {
      fallbackText = `### 🛡️ SOC Telemetry Summary (Fallback Analyst Mode)
- **Total Logged Events:** ${totalLogs}
- **Active Threats:** ${threatLogs.length} detected across recent activity
- **Critical Severity Alerts:** ${criticalLogs.length}
- **Firewall Status:** ${blockedIps.length} blocked IP(s) (${blockedIps.map(b => b.ip).join(', ') || 'No active blocks'})

${threatLogs.length > 0 ? `**Primary Threats Detected:**\n` + [...new Set(threatLogs.map(t => `- **${t.threatType}** from IP \`${t.sourceIp}\` on endpoint \`${t.targetEndpoint}\` (Risk: ${t.riskScore}/100)`))].slice(0, 5).join('\n') : 'No high-risk threats detected in recent telemetry.'}

> 💡 *To unlock dynamic deep-reasoning AI analysis with Gemini 2.5 Flash, activate your Gemini API key in the AI status bar.*`;
    } else if (lower.includes('block') || lower.includes('firewall') || lower.includes('ip')) {
      fallbackText = `### 🔒 Firewall & Blocked IP Analysis
- **Currently Blocked IPs:** ${blockedIps.length === 0 ? 'None' : blockedIps.map(b => `\`${b.ip}\``).join(', ')}
- **Top Suspicious Sources:** ${Object.entries(topOffendingIps).map(([ip, count]) => `\`${ip}\` (${count} alert${count > 1 ? 's' : ''})`).join(', ') || 'None'}

**Recommended Defensive Actions:**
1. Block any IP generating repeated critical alerts (e.g. repeated SQL Injection or rapid brute force).
2. Rate-limit endpoints with more than 5 requests per second.
3. Review audit logs for blocked IPs before releasing restrictions.`;
    } else if (lower.includes('sql') || lower.includes('sqli')) {
      fallbackText = `### 💉 SQL Injection Threat Analysis & Playbook
- **Attack Mechanism:** Attackers inject SQL control characters (e.g. \`' OR '1'='1\`, \`--\`, \`UNION SELECT\`) to bypass authentication or extract sensitive records.
- **MITRE ATT&CK:** T1190 (Exploit Public-Facing Application) / CWE-89
- **Remediation Code Fix:**
\`\`\`typescript
// Use parameterized queries or prepared statements:
const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ?');
const user = stmt.get(sanitizedUsername, hashedPassword);
\`\`\`
- **WAF Rule:** Block requests containing SQL keywords combined with boolean tautologies.`;
    } else if (lower.includes('xss')) {
      fallbackText = `### ⚡ Cross-Site Scripting (XSS) Analysis & Playbook
- **Attack Mechanism:** Script tags or DOM injection (e.g. \`<script>\`, \`onerror=alert(1)\`) intended to execute client-side JavaScript in a victim's session.
- **MITRE ATT&CK:** T1059.007 (JavaScript) / CWE-79
- **Remediation:**
  1. Enforce contextual output encoding (e.g. HTML entity encode).
  2. Implement a strict **Content Security Policy (CSP)**:
     \`\`\`http
     Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';
     \`\`\`
  3. Ensure cookies have \`HttpOnly\`, \`Secure\`, and \`SameSite=Strict\` attributes.`;
    } else {
      fallbackText = `### 🤖 AegisAI Security Analyst (Standby Mode)
I have processed your query regarding: **"${message}"**.

**Current Environment Snapshot:**
- **Monitored Telemetry:** ${totalLogs} events
- **Recent Threats:** ${threatLogs.length} events requiring review
- **Active Firewall Blocks:** ${blockedIps.length}

To ask specific questions about threats, you can ask me to:
- *"Summarize threats in the last hour"*
- *"Explain SQL injection mitigation playbook"*
- *"Analyze blocked IPs and recommend actions"*
- *"Explain XSS defense best practices"*

*(Activate a free Gemini API key to enable live contextual multi-turn conversational AI reasoning)*`;
    }

    return NextResponse.json({
      response: fallbackText,
      mode: 'fallback',
      model: 'rule-based-fallback',
    });
  } catch (error: any) {
    console.error('Error in AI chat endpoint:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
