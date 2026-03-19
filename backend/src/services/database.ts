import Database from 'better-sqlite3';
import path from 'path';
import { encrypt, decrypt } from './encryption';

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'cryptotaxhub.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS exchange_keys (
        exchange_id  TEXT PRIMARY KEY,
        api_key_enc  TEXT NOT NULL,
        api_secret_enc TEXT NOT NULL,
        connected    INTEGER DEFAULT 1,
        last_sync    TEXT,
        created_at   TEXT DEFAULT (datetime('now')),
        updated_at   TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS trade_cache (
        id           TEXT PRIMARY KEY,
        exchange_id  TEXT NOT NULL,
        data_json    TEXT NOT NULL,
        fetched_at   TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS balance_cache (
        exchange_id  TEXT NOT NULL,
        symbol       TEXT NOT NULL,
        free         REAL NOT NULL,
        used         REAL NOT NULL DEFAULT 0,
        total        REAL NOT NULL,
        fetched_at   TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (exchange_id, symbol)
      );
    `);
  }
  return db;
}

// ─── Exchange Keys ────────────────────────────────────────────────────────────

export interface StoredExchangeKey {
  exchangeId: string;
  apiKey: string;     // decrypted
  apiSecret: string;  // decrypted
  connected: boolean;
  lastSync: string | null;
}

export function saveExchangeKeys(exchangeId: string, apiKey: string, apiSecret: string): void {
  const d = getDb();
  d.prepare(`
    INSERT INTO exchange_keys (exchange_id, api_key_enc, api_secret_enc, connected, last_sync, updated_at)
    VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))
    ON CONFLICT(exchange_id) DO UPDATE SET
      api_key_enc = excluded.api_key_enc,
      api_secret_enc = excluded.api_secret_enc,
      connected = 1,
      updated_at = datetime('now')
  `).run(exchangeId, encrypt(apiKey), encrypt(apiSecret));
}

export function getExchangeKeys(exchangeId: string): StoredExchangeKey | null {
  const d = getDb();
  const row = d.prepare('SELECT * FROM exchange_keys WHERE exchange_id = ? AND connected = 1').get(exchangeId) as any;
  if (!row) return null;
  return {
    exchangeId: row.exchange_id,
    apiKey: decrypt(row.api_key_enc),
    apiSecret: decrypt(row.api_secret_enc),
    connected: !!row.connected,
    lastSync: row.last_sync,
  };
}

export function getAllConnectedExchanges(): StoredExchangeKey[] {
  const d = getDb();
  const rows = d.prepare('SELECT * FROM exchange_keys WHERE connected = 1').all() as any[];
  return rows.map(row => ({
    exchangeId: row.exchange_id,
    apiKey: decrypt(row.api_key_enc),
    apiSecret: decrypt(row.api_secret_enc),
    connected: true,
    lastSync: row.last_sync,
  }));
}

export function disconnectExchange(exchangeId: string): void {
  const d = getDb();
  d.prepare('UPDATE exchange_keys SET connected = 0, updated_at = datetime(\'now\') WHERE exchange_id = ?').run(exchangeId);
}

export function updateLastSync(exchangeId: string): void {
  const d = getDb();
  d.prepare('UPDATE exchange_keys SET last_sync = datetime(\'now\'), updated_at = datetime(\'now\') WHERE exchange_id = ?').run(exchangeId);
}

export function isExchangeConnected(exchangeId: string): boolean {
  const d = getDb();
  const row = d.prepare('SELECT connected FROM exchange_keys WHERE exchange_id = ?').get(exchangeId) as any;
  return row ? !!row.connected : false;
}

// ─── Balance Cache ────────────────────────────────────────────────────────────

export interface CachedBalance {
  exchangeId: string;
  symbol: string;
  free: number;
  used: number;
  total: number;
  fetchedAt: string;
}

export function cacheBalances(exchangeId: string, balances: { symbol: string; free: number; used: number; total: number }[]): void {
  const d = getDb();
  const stmt = d.prepare(`
    INSERT INTO balance_cache (exchange_id, symbol, free, used, total, fetched_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(exchange_id, symbol) DO UPDATE SET
      free = excluded.free,
      used = excluded.used,
      total = excluded.total,
      fetched_at = datetime('now')
  `);
  const txn = d.transaction(() => {
    // Clear old balances for this exchange
    d.prepare('DELETE FROM balance_cache WHERE exchange_id = ?').run(exchangeId);
    for (const b of balances) {
      stmt.run(exchangeId, b.symbol, b.free, b.used, b.total);
    }
  });
  txn();
}

export function getCachedBalances(exchangeId?: string): CachedBalance[] {
  const d = getDb();
  if (exchangeId) {
    return (d.prepare('SELECT * FROM balance_cache WHERE exchange_id = ?').all(exchangeId) as any[]).map(r => ({
      exchangeId: r.exchange_id,
      symbol: r.symbol,
      free: r.free,
      used: r.used,
      total: r.total,
      fetchedAt: r.fetched_at,
    }));
  }
  return (d.prepare('SELECT * FROM balance_cache').all() as any[]).map(r => ({
    exchangeId: r.exchange_id,
    symbol: r.symbol,
    free: r.free,
    used: r.used,
    total: r.total,
    fetchedAt: r.fetched_at,
  }));
}
