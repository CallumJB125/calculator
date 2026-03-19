/**
 * Unified live data layer.
 *
 * Strategy:
 *  1. If exchanges are connected → fetch live from CCXT + CoinGecko
 *  2. If no exchanges connected → fall back to mockData (demo mode)
 *
 * All route handlers should import from this module, NOT directly from mockData.
 */

import { Position, Exchange } from '../types';
import { getAllConnectedExchanges, isExchangeConnected, getCachedBalances } from './database';
import { fetchAllBalances, fetchBalances, getExchangeName } from './exchangeAdapters';
import { fetchPrices, getPrice } from './prices';
import * as mock from './mockData';

// ─── Mode Detection ───────────────────────────────────────────────────────────

export function isLiveMode(): boolean {
  return getAllConnectedExchanges().length > 0;
}

// ─── Exchanges ────────────────────────────────────────────────────────────────

export function getExchanges(): Exchange[] {
  const connected = getAllConnectedExchanges();
  const connectedIds = new Set(connected.map(c => c.exchangeId));

  return mock.exchanges.map(ex => ({
    ...ex,
    connected: connectedIds.has(ex.id),
    apiKey: connectedIds.has(ex.id) ? `${ex.id}_****_connected` : undefined,
    lastSync: connected.find(c => c.exchangeId === ex.id)?.lastSync ?? ex.lastSync,
  }));
}

// ─── Live Positions ───────────────────────────────────────────────────────────

export async function getPositions(exchangeFilter?: string): Promise<Position[]> {
  const connected = getAllConnectedExchanges();

  if (connected.length === 0) {
    // Demo mode — return mock positions
    const positions = exchangeFilter
      ? mock.positions.filter(p => p.exchangeId === exchangeFilter)
      : mock.positions;
    return positions;
  }

  // Live mode — fetch balances and prices
  try {
    const targetExchanges = exchangeFilter
      ? connected.filter(c => c.exchangeId === exchangeFilter)
      : connected;

    const balanceResults = new Map<string, any[]>();
    await Promise.allSettled(
      targetExchanges.map(async ex => {
        try {
          const balances = await fetchBalances(ex.exchangeId);
          balanceResults.set(ex.exchangeId, balances);
        } catch (err: any) {
          console.warn(`[liveData] Balance fetch failed for ${ex.exchangeId}: ${err.message}`);
          // Fall back to cached
          const cached = getCachedBalances(ex.exchangeId);
          balanceResults.set(ex.exchangeId, cached);
        }
      })
    );

    // Get all unique symbols
    const allSymbols = new Set<string>();
    for (const [_, bals] of balanceResults) {
      for (const b of bals) allSymbols.add(b.symbol);
    }

    // Fetch prices
    const prices = await fetchPrices([...allSymbols]);

    // Build positions
    const positions: Position[] = [];
    let posId = 1;

    for (const [exchangeId, balances] of balanceResults) {
      for (const b of balances) {
        const price = prices[b.symbol] ?? 0;
        if (price === 0 && b.symbol !== 'USDC' && b.symbol !== 'USDT') continue;
        if (b.total < 0.0000001) continue;

        const value = b.total * price;
        // We don't know cost basis from exchange APIs alone — set to current (will be refined with trade history)
        const avgCost = price; // placeholder until trade import
        const pnl = 0; // need trade history for real P&L
        const pnlPct = 0;

        positions.push({
          id: `live-${exchangeId}-${b.symbol}-${posId++}`,
          exchangeId,
          exchangeName: getExchangeName(exchangeId),
          asset: getAssetName(b.symbol),
          symbol: b.symbol,
          quantity: b.total,
          avgCostBasis: avgCost,
          currentPrice: price,
          currentValue: parseFloat(value.toFixed(2)),
          unrealizedPnl: pnl,
          unrealizedPnlPct: pnlPct,
        });
      }
    }

    return positions.sort((a, b) => b.currentValue - a.currentValue);
  } catch (err: any) {
    console.error('[liveData] getPositions error:', err.message);
    // Full fallback to mock
    return mock.positions;
  }
}

// ─── Portfolio Summary ────────────────────────────────────────────────────────

export async function getPortfolioSummary() {
  const positions = await getPositions();

  const totalValue = positions.reduce((s, p) => s + p.currentValue, 0);
  const totalCost = positions.reduce((s, p) => s + p.avgCostBasis * p.quantity, 0);
  const totalPnl = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
  const totalPnlPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
  const totalFunding = positions.reduce((s, p) => s + (p.totalFundingFeesPaid ?? 0), 0);

  // Group by asset
  const byAsset: Record<string, any> = {};
  for (const p of positions) {
    if (!byAsset[p.symbol]) {
      byAsset[p.symbol] = {
        totalQty: 0, value: 0, totalCost: 0, avgCostBasis: 0,
        currentPrice: p.currentPrice, pnl: 0, fundingFeesPaid: 0,
      };
    }
    const a = byAsset[p.symbol];
    a.totalQty += p.quantity;
    a.value += p.currentValue;
    a.totalCost += p.avgCostBasis * p.quantity;
    a.pnl += p.unrealizedPnl;
    a.fundingFeesPaid += p.totalFundingFeesPaid ?? 0;
    a.avgCostBasis = a.totalQty > 0 ? a.totalCost / a.totalQty : 0;
  }

  return {
    totalValue: parseFloat(totalValue.toFixed(2)),
    totalCostBasis: parseFloat(totalCost.toFixed(2)),
    totalUnrealizedPnl: parseFloat(totalPnl.toFixed(2)),
    totalUnrealizedPnlPct: parseFloat(totalPnlPct.toFixed(2)),
    totalFundingFeesPaid: parseFloat(totalFunding.toFixed(2)),
    positionCount: positions.length,
    byAsset,
  };
}

// ─── Live Prices ──────────────────────────────────────────────────────────────

export async function getLivePrices(symbols?: string[]): Promise<Record<string, number>> {
  return fetchPrices(symbols);
}

export function getLivePrice(symbol: string): number {
  return getPrice(symbol);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ASSET_NAMES: Record<string, string> = {
  BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', BNB: 'BNB',
  XRP: 'XRP', ADA: 'Cardano', AVAX: 'Avalanche', DOGE: 'Dogecoin',
  DOT: 'Polkadot', LINK: 'Chainlink', MATIC: 'Polygon', UNI: 'Uniswap',
  LTC: 'Litecoin', ATOM: 'Cosmos', XLM: 'Stellar', ALGO: 'Algorand',
  NEAR: 'NEAR Protocol', FTM: 'Fantom', SAND: 'The Sandbox',
  MANA: 'Decentraland', APE: 'ApeCoin', ARB: 'Arbitrum', OP: 'Optimism',
  INJ: 'Injective', SUI: 'Sui', SEI: 'Sei', TIA: 'Celestia',
  JUP: 'Jupiter', WIF: 'Dogwifhat', PEPE: 'Pepe',
  USDC: 'USD Coin', USDT: 'Tether',
};

function getAssetName(symbol: string): string {
  return ASSET_NAMES[symbol] ?? symbol;
}

// ─── Re-export mock data for routes that haven't migrated yet ─────────────────

export { exchanges as mockExchanges, exchangeFeeStructures, positions as mockPositions, trades as mockTrades } from './mockData';
