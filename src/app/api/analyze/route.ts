import { NextResponse } from 'next/server';
import { getGeminiClient, isAIEnabled, getActiveModel, Type } from '@/lib/gemini';
import { dbAll } from '@/lib/db';
import { SecurityLog } from '@/lib/threatEngine';

const QUERY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'Concise executive summary of findings answering the analyst query',
    },
    matchingLogIds: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of log IDs from the provided dataset that match the query criteria',
    },
    threatAssessment: {
      type: Type.STRING,
      description: 'Assessment of risk severity and recommended containment steps',
    },
  },
  required: ['summary', 'matchingLogIds', 'threatAssessment'],
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Pull recent logs to investigate
    const rawLogs = await dbAll<any>(
      'SELECT id, timestamp, sourceIp, targetEndpoint, requestMethod, threatType, severity, riskScore, payload, status FROM security_logs ORDER BY timestamp DESC LIMIT 60'
    );

    if (isAIEnabled()) {
      const client = getGeminiClient();
      if (client) {
        try {
          const prompt = `You are an AI Threat Intelligence Analyst. An analyst is performing a natural language investigation over recent SOC security logs.

Analyst Query: "${query}"

Here is the candidate dataset of recent security logs (JSON):
${JSON.stringify(rawLogs, null, 2)}

Filter through the logs to identify all log entries that match the analyst's request.
Provide:
1. An executive summary answering the question directly.
2. An array of exact "matchingLogIds" that match the search criteria.
3. A threat assessment and containment recommendation.`;

          const activeModel = getActiveModel();
          const response = await client.models.generateContent({
            model: activeModel,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: QUERY_SCHEMA,
              temperature: 0.1,
            },
          });

          const text = response.text;
          if (text) {
            const clean = text.replace(/```(?:json)?\n?/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(clean);
            return NextResponse.json({
              query,
              summary: parsed.summary,
              matchingLogIds: parsed.matchingLogIds || [],
              threatAssessment: parsed.threatAssessment,
              totalChecked: rawLogs.length,
              mode: 'ai',
            });
          }
        } catch (aiErr) {
          console.warn('AI analysis query failed, using rule-based filter:', aiErr);
        }
      }
    }

    // Fallback: smart keyword/regex filter
    const lowerQuery = query.toLowerCase();
    const matched = rawLogs.filter((log) => {
      const ipMatch = log.sourceIp.toLowerCase().includes(lowerQuery);
      const threatMatch = log.threatType.toLowerCase().includes(lowerQuery);
      const endpointMatch = log.targetEndpoint.toLowerCase().includes(lowerQuery);
      const payloadMatch = (log.payload || '').toLowerCase().includes(lowerQuery);
      const severityMatch = log.severity.toLowerCase() === lowerQuery;
      
      // Keyword matching
      if (lowerQuery.includes('brute') && log.threatType === 'Brute Force Attempt') return true;
      if (lowerQuery.includes('sql') && log.threatType === 'SQL Injection') return true;
      if (lowerQuery.includes('xss') && log.threatType === 'Cross-Site Scripting (XSS)') return true;
      if (lowerQuery.includes('critical') && log.severity === 'Critical') return true;
      if (lowerQuery.includes('high') && (log.severity === 'High' || log.severity === 'Critical')) return true;
      if (lowerQuery.includes('traversal') && log.threatType === 'Directory Traversal') return true;

      return ipMatch || threatMatch || endpointMatch || payloadMatch || severityMatch;
    });

    const matchingLogIds = matched.map((m) => m.id);

    return NextResponse.json({
      query,
      summary: `Found ${matchingLogIds.length} incident(s) matching your investigation query "${query}".`,
      matchingLogIds,
      threatAssessment: matchingLogIds.length > 0
        ? `Review the ${matchingLogIds.length} flagged incident(s) below. Consider isolating affected endpoints or source IPs.`
        : 'No incidents directly matching this criteria in the latest telemetry window.',
      totalChecked: rawLogs.length,
      mode: 'fallback',
    });
  } catch (error: any) {
    console.error('Error in analyze endpoint:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
