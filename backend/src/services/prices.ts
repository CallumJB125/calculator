/**
 * CoinGecko price feed — free tier (30 calls/min).
 * Caches prices for 30 seconds to stay well within limits.
 */

import { ProxyAgent, fetch as undiciFetch } from 'undici';

// Pick up the system proxy (set by the container environment)
const PROXY_URL = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
const proxyAgent = PROXY_URL ? new ProxyAgent(PROXY_URL) : undefined;

async function proxyFetch(url: string, options: { signal?: AbortSignal } = {}): Promise<Response> {
  if (proxyAgent) {
    const res = await undiciFetch(url, { ...options, dispatcher: proxyAgent } as any);
    return res as unknown as Response;
  }
  return fetch(url, options);
}

interface PriceCache {
  prices: Record<string, number>;
  timestamp: number;
}

// CoinGecko ID mapping for the assets we support
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  LINK: 'chainlink',
  MATIC: 'matic-network',
  UNI: 'uniswap',
  LTC: 'litecoin',
  ATOM: 'cosmos',
  XLM: 'stellar',
  ALGO: 'algorand',
  NEAR: 'near',
  FTM: 'fantom',
  SAND: 'the-sandbox',
  MANA: 'decentraland',
  APE: 'apecoin',
  ARB: 'arbitrum',
  OP: 'optimism',
  INJ: 'injective-protocol',
  SUI: 'sui',
  SEI: 'sei-network',
  TIA: 'celestia',
  JUP: 'jupiter-exchange-solana',
  WIF: 'dogwifcoin',
  PEPE: 'pepe',
  USDC: 'usd-coin',
  USDT: 'tether',
};

const CACHE_TTL_MS = 30_000; // 30 seconds
let cache: PriceCache | null = null;

// Fallback prices (used when CoinGecko is unavailable)
const FALLBACK_PRICES: Record<string, number> = {
  BTC: 67420, ETH: 3580, SOL: 178.5, BNB: 592, XRP: 0.52,
  ADA: 0.48, AVAX: 36.2, DOGE: 0.165, DOT: 7.45, LINK: 14.8,
  MATIC: 0.88, UNI: 9.6, LTC: 83.5, ATOM: 8.1, XLM: 0.125,
  ALGO: 0.198, NEAR: 7.3, FTM: 0.82, SAND: 0.44, MANA: 0.39,
  APE: 1.25, ARB: 1.08, OP: 2.35, INJ: 24.6, SUI: 1.45,
  SEI: 0.54, TIA: 8.9, JUP: 0.92, WIF: 2.78, PEPE: 0.0000115,
  USDC: 1, USDT: 1,
};

export async function fetchPrices(symbols?: string[]): Promise<Record<string, number>> {
  // Return cache if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    if (symbols) {
      const filtered: Record<string, number> = {};
      for (const s of symbols) filtered[s] = cache.prices[s] ?? FALLBACK_PRICES[s] ?? 0;
      return filtered;
    }
    return { ...cache.prices };
  }

  // Build CoinGecko request
  const targetSymbols = symbols ?? Object.keys(COINGECKO_IDS);
  const geckoIds = targetSymbols
    .map(s => COINGECKO_IDS[s])
    .filter(Boolean);

  if (geckoIds.length === 0) return { ...FALLBACK_PRICES };

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds.join(',')}&vs_currencies=usd`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await proxyFetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`CoinGecko API returned ${response.status}, using fallback prices`);
      return { ...FALLBACK_PRICES };
    }

    const data = (await response.json()) as Record<string, { usd?: number }>;

    // Map back to our symbols
    const prices: Record<string, number> = {};
    for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
      if (data[geckoId]?.usd !== undefined) {
        prices[symbol] = data[geckoId].usd!;
      } else if (FALLBACK_PRICES[symbol]) {
        prices[symbol] = FALLBACK_PRICES[symbol];
      }
    }

    // Update cache
    cache = { prices, timestamp: Date.now() };
    console.log(`[Prices] Fetched ${Object.keys(prices).length} prices from CoinGecko`);
    return symbols
      ? Object.fromEntries(symbols.map(s => [s, prices[s] ?? FALLBACK_PRICES[s] ?? 0]))
      : prices;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn('[Prices] CoinGecko request timed out, using fallback');
    } else {
      console.warn('[Prices] CoinGecko error:', err.message, '— using fallback');
    }
    return { ...FALLBACK_PRICES };
  }
}

export function getPrice(symbol: string): number {
  if (cache?.prices[symbol] !== undefined) return cache.prices[symbol];
  return FALLBACK_PRICES[symbol] ?? 0;
}

export function getCoinGeckoId(symbol: string): string | undefined {
  return COINGECKO_IDS[symbol];
}

export function getSupportedSymbols(): string[] {
  return Object.keys(COINGECKO_IDS);
}
