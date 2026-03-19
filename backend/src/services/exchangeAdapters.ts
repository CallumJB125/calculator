/**
 * Unified exchange adapter using CCXT.
 * Supports: Coinbase, Binance, Kraken, Gemini, KuCoin
 *
 * Each adapter provides: fetch balances, fetch trades, fetch ticker.
 * CCXT normalises the API differences across exchanges.
 */

import ccxt, { Exchange, Trade, Ticker } from 'ccxt';
import { getExchangeKeys, getAllConnectedExchanges, cacheBalances, updateLastSync } from './database';

// Pass system proxy to CCXT so exchange API calls go through it
const PROXY_URL = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;

// Exchange class mapping
const EXCHANGE_CLASSES: Record<string, new (config: any) => Exchange> = {
  coinbase: ccxt.coinbase,
  binance: ccxt.binance,
  kraken: ccxt.kraken,
  gemini: ccxt.gemini,
  kucoin: ccxt.kucoin,
};

const EXCHANGE_NAMES: Record<string, string> = {
  coinbase: 'Coinbase',
  binance: 'Binance',
  kraken: 'Kraken',
  gemini: 'Gemini',
  kucoin: 'KuCoin',
};

// Cache live exchange instances to reuse connections
const instanceCache = new Map<string, Exchange>();

function getExchangeInstance(exchangeId: string, apiKey: string, apiSecret: string): Exchange {
  const cacheKey = `${exchangeId}:${apiKey.slice(0, 8)}`;
  if (instanceCache.has(cacheKey)) return instanceCache.get(cacheKey)!;

  const ExchangeClass = EXCHANGE_CLASSES[exchangeId];
  if (!ExchangeClass) throw new Error(`Unsupported exchange: ${exchangeId}`);

  const instance = new ExchangeClass({
    apiKey,
    secret: apiSecret,
    enableRateLimit: true,
    timeout: 15000,
    ...(PROXY_URL ? { httpsProxy: PROXY_URL } : {}),
    options: {
      defaultType: 'spot',
    },
  });

  instanceCache.set(cacheKey, instance);
  return instance;
}

export function clearExchangeInstance(exchangeId: string): void {
  for (const [key] of instanceCache) {
    if (key.startsWith(`${exchangeId}:`)) {
      instanceCache.delete(key);
    }
  }
}

// ─── Fetch Balances ───────────────────────────────────────────────────────────

export interface NormalizedBalance {
  symbol: string;
  free: number;
  used: number;
  total: number;
}

export async function fetchBalances(exchangeId: string): Promise<NormalizedBalance[]> {
  const keys = getExchangeKeys(exchangeId);
  if (!keys) throw new Error(`Exchange ${exchangeId} is not connected`);

  const exchange = getExchangeInstance(exchangeId, keys.apiKey, keys.apiSecret);
  const balance = await exchange.fetchBalance();

  const result: NormalizedBalance[] = [];
  const totals = (balance as any).total ?? {};
  const frees = (balance as any).free ?? {};
  const useds = (balance as any).used ?? {};
  for (const [symbol, rawTotal] of Object.entries(totals)) {
    const total = Number(rawTotal) || 0;
    if (total <= 0) continue;
    const free = Number(frees[symbol]) || total;
    const used = Number(useds[symbol]) || 0;
    result.push({ symbol, free, used, total });
  }

  // Cache in SQLite
  cacheBalances(exchangeId, result);
  updateLastSync(exchangeId);

  return result;
}

// ─── Fetch All Connected Balances ─────────────────────────────────────────────

export async function fetchAllBalances(): Promise<Map<string, NormalizedBalance[]>> {
  const connected = getAllConnectedExchanges();
  const results = new Map<string, NormalizedBalance[]>();

  await Promise.allSettled(
    connected.map(async (ex) => {
      try {
        const balances = await fetchBalances(ex.exchangeId);
        results.set(ex.exchangeId, balances);
      } catch (err: any) {
        console.warn(`[${ex.exchangeId}] Failed to fetch balances: ${err.message}`);
        results.set(ex.exchangeId, []);
      }
    })
  );

  return results;
}

// ─── Fetch Trades ─────────────────────────────────────────────────────────────

export interface NormalizedTrade {
  id: string;
  exchangeId: string;
  exchangeName: string;
  symbol: string; // e.g. 'BTC/USDT'
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  cost: number;
  fee: number;
  feeCurrency: string;
  timestamp: number;
  datetime: string;
}

export async function fetchTrades(exchangeId: string, symbol?: string, since?: number, limit?: number): Promise<NormalizedTrade[]> {
  const keys = getExchangeKeys(exchangeId);
  if (!keys) throw new Error(`Exchange ${exchangeId} is not connected`);

  const exchange = getExchangeInstance(exchangeId, keys.apiKey, keys.apiSecret);
  const pair = symbol ? `${symbol}/USDT` : undefined;

  try {
    const trades: Trade[] = pair
      ? await exchange.fetchMyTrades(pair, since, limit ?? 100)
      : await exchange.fetchMyTrades(undefined, since, limit ?? 100);

    return trades.map(t => ({
      id: String(t.id),
      exchangeId,
      exchangeName: EXCHANGE_NAMES[exchangeId] ?? exchangeId,
      symbol: String(t.symbol),
      side: t.side as 'buy' | 'sell',
      amount: Number(t.amount) || 0,
      price: t.price,
      cost: t.cost ?? (Number(t.amount) || 0) * t.price,
      fee: t.fee?.cost ?? 0,
      feeCurrency: t.fee?.currency ?? 'USDT',
      timestamp: t.timestamp ?? 0,
      datetime: t.datetime ?? new Date(t.timestamp ?? 0).toISOString(),
    }));
  } catch (err: any) {
    // Some exchanges don't support fetchMyTrades without a symbol
    console.warn(`[${exchangeId}] fetchTrades error: ${err.message}`);
    return [];
  }
}

// ─── Fetch Ticker ─────────────────────────────────────────────────────────────

export interface NormalizedTicker {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume24h: number;
  change24hPct: number;
}

export async function fetchTicker(exchangeId: string, symbol: string): Promise<NormalizedTicker | null> {
  const keys = getExchangeKeys(exchangeId);
  if (!keys) return null;

  const exchange = getExchangeInstance(exchangeId, keys.apiKey, keys.apiSecret);
  try {
    const ticker: Ticker = await exchange.fetchTicker(`${symbol}/USDT`);
    return {
      symbol,
      bid: ticker.bid ?? 0,
      ask: ticker.ask ?? 0,
      last: ticker.last ?? 0,
      volume24h: ticker.quoteVolume ?? 0,
      change24hPct: ticker.percentage ?? 0,
    };
  } catch {
    return null;
  }
}

// ─── Fetch Tickers from all connected exchanges ──────────────────────────────

export async function fetchTickersForSymbol(symbol: string): Promise<Map<string, NormalizedTicker>> {
  const connected = getAllConnectedExchanges();
  const results = new Map<string, NormalizedTicker>();

  await Promise.allSettled(
    connected.map(async (ex) => {
      const ticker = await fetchTicker(ex.exchangeId, symbol);
      if (ticker) results.set(ex.exchangeId, ticker);
    })
  );

  return results;
}

// ─── Validate API keys ───────────────────────────────────────────────────────

export async function validateKeys(exchangeId: string, apiKey: string, apiSecret: string): Promise<{ valid: boolean; error?: string }> {
  const ExchangeClass = EXCHANGE_CLASSES[exchangeId];
  if (!ExchangeClass) return { valid: false, error: `Unsupported exchange: ${exchangeId}` };

  const exchange = new ExchangeClass({
    apiKey,
    secret: apiSecret,
    enableRateLimit: true,
    timeout: 10000,
    ...(PROXY_URL ? { httpsProxy: PROXY_URL } : {}),
  });

  try {
    await exchange.fetchBalance();
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

export function getExchangeName(exchangeId: string): string {
  return EXCHANGE_NAMES[exchangeId] ?? exchangeId;
}

export function getSupportedExchanges(): string[] {
  return Object.keys(EXCHANGE_CLASSES);
}
