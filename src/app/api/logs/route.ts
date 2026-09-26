import { NextResponse } from 'next/server';
import { dbAll, dbRun } from '@/lib/db';
import { analyzeSecurityLog, SecurityLog } from '@/lib/threatEngine';

export async function GET() {
  try {
    const rawLogs = await dbAll<any>(
      'SELECT * FROM security_logs ORDER BY timestamp DESC LIMIT 200'
    );

    const logs: SecurityLog[] = rawLogs.map((row) => ({
      ...row,
      xaiReasoning: (() => {
        try {
          return JSON.parse(row.xaiReasoning || '[]');
        } catch {
          return [row.xaiReasoning || ''];
        }
      })(),
      cveReferences: (() => {
        try {
          return row.cveReferences ? JSON.parse(row.cveReferences) : [];
        } catch {
          return [];
        }
      })(),
    }));

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceIp, targetEndpoint, requestMethod, payload } = body;

    if (!sourceIp || !targetEndpoint || !requestMethod) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceIp, targetEndpoint, requestMethod' },
        { status: 400 }
      );
    }

    // Retrieve recent logs for behavioral / volumetric analysis
    const rawRecent = await dbAll<any>(
      'SELECT * FROM security_logs WHERE sourceIp = ? ORDER BY timestamp DESC LIMIT 20',
      [sourceIp]
    );

    const recentLogs: SecurityLog[] = rawRecent.map((row) => ({
      ...row,
      xaiReasoning: (() => {
        try { return JSON.parse(row.xaiReasoning || '[]'); } catch { return []; }
      })(),
      cveReferences: (() => {
        try { return row.cveReferences ? JSON.parse(row.cveReferences) : []; } catch { return []; }
      })(),
    }));

    // Run AI Threat Analysis (properly awaited)
    const analysis = await analyzeSecurityLog(
      sourceIp,
      targetEndpoint,
      requestMethod,
      payload || '',
      recentLogs
    );

    const newLog: SecurityLog = {
      ...analysis,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      status: 'Active',
    };

    // Insert all fields into SQLite database
    await dbRun(
      `INSERT INTO security_logs (
        id, timestamp, sourceIp, targetEndpoint, requestMethod, payload,
        responseCode, threatType, severity, riskScore, xaiReasoning, status,
        confidence, recommendedAction, cveReferences, analysisMode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newLog.id,
        newLog.timestamp,
        newLog.sourceIp,
        newLog.targetEndpoint,
        newLog.requestMethod,
        newLog.payload || '',
        newLog.responseCode,
        newLog.threatType,
        newLog.severity,
        newLog.riskScore,
        JSON.stringify(newLog.xaiReasoning),
        newLog.status,
        newLog.confidence ?? null,
        newLog.recommendedAction ?? null,
        JSON.stringify(newLog.cveReferences ?? []),
        newLog.analysisMode ?? 'fallback',
      ]
    );

    return NextResponse.json({ log: newLog }, { status: 201 });
  } catch (error: any) {
    console.error('Error recording security log:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    await dbRun('UPDATE security_logs SET status = ? WHERE id = ?', [status, id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating log status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
