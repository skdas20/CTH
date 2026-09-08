import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'cybersecurity.db');

// Initialize database instance
export const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to open SQLite database:', err.message);
  } else {
    initDbSchema();
  }
});

function initDbSchema() {
  db.serialize(() => {
    // Security Logs Table
    db.run(`
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
        status TEXT NOT NULL
      )
    `);

    // Blocked IPs Table
    db.run(`
      CREATE TABLE IF NOT EXISTS blocked_ips (
        ip TEXT PRIMARY KEY,
        blockedAt TEXT NOT NULL,
        reason TEXT
      )
    `);
  });
}

// Database helper promises
export function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}
