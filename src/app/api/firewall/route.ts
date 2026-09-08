import { NextResponse } from 'next/server';
import { dbAll, dbRun } from '@/lib/db';

export async function GET() {
  try {
    const rows = await dbAll<{ ip: string }>('SELECT ip FROM blocked_ips ORDER BY blockedAt DESC');
    const blockedIps = rows.map((r) => r.ip);
    return NextResponse.json({ blockedIps });
  } catch (error: any) {
    console.error('Error fetching blocked IPs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { ip, action, reason } = await request.json();

    if (!ip) {
      return NextResponse.json({ error: 'IP address is required' }, { status: 400 });
    }

    if (action === 'unblock') {
      await dbRun('DELETE FROM blocked_ips WHERE ip = ?', [ip]);
      return NextResponse.json({ success: true, action: 'unblocked', ip });
    } else {
      await dbRun(
        'INSERT OR REPLACE INTO blocked_ips (ip, blockedAt, reason) VALUES (?, ?, ?)',
        [ip, new Date().toISOString(), reason || 'Flagged by SOC Security Analyst']
      );
      return NextResponse.json({ success: true, action: 'blocked', ip });
    }
  } catch (error: any) {
    console.error('Error modifying blocked IPs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await dbRun('DELETE FROM blocked_ips');
    return NextResponse.json({ success: true, message: 'All IP blocks cleared' });
  } catch (error: any) {
    console.error('Error clearing blocked IPs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
