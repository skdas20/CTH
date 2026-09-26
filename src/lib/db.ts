import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'cybersecurity.db');

// Singleton db instance in global scope to prevent multiple instances during Next.js hot reloads
const globalForDb = globalThis as unknown as {
  dbInstance: Database.Database | undefined;
};

export const db: Database.Database =
  globalForDb.dbInstance ??
  new Database(DB_PATH);

if (!globalForDb.dbInstance) {
  globalForDb.dbInstance = db;
}

// Always ensure schema and migrations are applied
initDbSchema();

function initDbSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      sourceIp TEXT NOT NULL,
      targetEndpoint TEXT NOT NULL,
      requestMethod TEXT NOT NULL,
      payload TEXT,
      responseCode INTEGER NOT NULL,
      threatType TEXT NOT NULL,
      severity TEXT NOT NULL,
      riskScore INTEGER NOT NULL,
      xaiReasoning TEXT NOT NULL,
      status TEXT NOT NULL,
      confidence REAL,
      recommendedAction TEXT,
      cveReferences TEXT,
      analysisMode TEXT DEFAULT 'fallback'
    );

    CREATE TABLE IF NOT EXISTS blocked_ips (
      ip TEXT PRIMARY KEY,
      blockedAt TEXT NOT NULL,
      reason TEXT
    );
  `);

  // Ensure all columns exist (safe alter table checks)
  const columns = db.pragma('table_info(security_logs)') as Array<{ name: string }>;
  const existingNames = new Set(columns.map((c) => c.name));

  if (!existingNames.has('confidence')) {
    try { db.exec('ALTER TABLE security_logs ADD COLUMN confidence REAL'); } catch {}
  }
  if (!existingNames.has('recommendedAction')) {
    try { db.exec('ALTER TABLE security_logs ADD COLUMN recommendedAction TEXT'); } catch {}
  }
  if (!existingNames.has('cveReferences')) {
    try { db.exec('ALTER TABLE security_logs ADD COLUMN cveReferences TEXT'); } catch {}
  }
  if (!existingNames.has('analysisMode')) {
    try { db.exec("ALTER TABLE security_logs ADD COLUMN analysisMode TEXT DEFAULT 'fallback'"); } catch {}
  }
}

// Database helper promises matching existing API signatures
export function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params) as T[];
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

export function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      const info = stmt.run(...params);
      resolve({ lastID: Number(info.lastInsertRowid), changes: info.changes });
    } catch (err) {
      reject(err);
    }
  });
}
