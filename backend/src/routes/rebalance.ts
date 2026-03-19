import { Router, Request, Response } from 'express';
import { positions, exchangeFeeStructures, trades } from '../services/mockData';
import { RebalancePlan, RebalanceTarget, RebalanceTrade } from '../types';

const router = Router();

// Default target allocations (user-configurable in a real app)
const DEFAULT_TARGETS: Record<string, { symbol: string; asset: string; targetPct: number }> = {
  BTC: { symbol: 'BTC', asset: 'Bitcoin',  targetPct: 50 },
  ETH: { symbol: 'ETH', asset: 'Ethereum', targetPct: 25 },
  SOL: { symbol: 'SOL', asset: 'Solana',   targetPct: 15 },
  ADA: { symbol: 'ADA', asset: 'Cardano',  targetPct: 10 },
};

// GET /api/rebalance/plan?threshold=5
router.get('/plan', (req: Request, res: Response) => {
  const driftThreshold = parseFloat(String(req.query.threshold || 5));

  // Aggregate positions by symbol (cross-exchange)
  const bySymbol: Record<string, { value: number; qty: number; price: number; asset: string }> = {};
  for (const pos of positions) {
    if (pos.symbol === 'USDC') continue; // exclude stablecoins
    if (!bySymbol[pos.symbol]) {
      bySymbol[pos.symbol] = { value: 0, qty: 0, price: pos.currentPrice, asset: pos.asset };
    }
    bySymbol[pos.symbol].value += pos.currentValue;
    bySymbol[pos.symbol].qty += pos.quantity;
  }

  const totalValue = Object.values(bySymbol).reduce((s, v) => s + v.value, 0);

  // Build target entries
  const targets: RebalanceTarget[] = Object.entries(DEFAULT_TARGETS).map(([sym, t]) => {
    const current = bySymbol[sym];
    const currentValue = current?.value ?? 0;
    const currentPct = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
    const targetValue = (t.targetPct / 100) * totalValue;
    return {
      symbol: sym,
      asset: t.asset,
      targetPct: t.targetPct,
      currentPct: parseFloat(currentPct.toFixed(2)),
      drift: parseFloat((currentPct - t.targetPct).toFixed(2)),
      currentValue: parseFloat(currentValue.toFixed(2)),
      targetValue: parseFloat(targetValue.toFixed(2)),
    };
  });

  // Find the best (lowest fee) connected exchange for buys
  const connectedExchanges = ['coinbase', 'binance'];
  const bestBuyExchange = (symbol: string): string => {
    const fees = exchangeFeeStructures
      .filter(f => connectedExchanges.includes(f.exchangeId))
      .sort((a, b) => a.takerFee - b.takerFee);
    // prefer exchange that already holds the asset
    const holdingExchange = positions.find(p => p.symbol === symbol && connectedExchanges.includes(p.exchangeId));
    return holdingExchange?.exchangeName ?? fees[0]?.exchangeName ?? 'Coinbase';
  };

  // Estimate short-term capital gains tax on a sell (FIFO, 37%)
  const estimateTaxOnSell = (symbol: string, valueToSell: number): number => {
    const buys = trades
      .filter(t => t.type === 'buy' && t.symbol === symbol)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (!buys.length) return 0;
    const oldestBuy = buys[0];
    const daysHeld = Math.floor((Date.now() - new Date(oldestBuy.date).getTime()) / 86400000);
    const rate = daysHeld > 365 ? 0.20 : 0.37;
    const price = bySymbol[symbol]?.price ?? 0;
    const gainPct = oldestBuy.price > 0 ? Math.max(0, (price - oldestBuy.price) / oldestBuy.price) : 0;
    return parseFloat((valueToSell * gainPct * rate).toFixed(2));
  };

  const tradeSuggestions: RebalanceTrade[] = [];
  let estimatedTotalTax = 0;

  for (const target of targets) {
    const diff = target.targetValue - target.currentValue;
    const absDrift = Math.abs(target.drift);
    if (absDrift < driftThreshold) continue;

    const price = bySymbol[target.symbol]?.price ?? 1;
    const qty = parseFloat((Math.abs(diff) / price).toFixed(6));

    if (diff < 0) {
      // Over-weight → sell
      const tax = estimateTaxOnSell(target.symbol, Math.abs(diff));
      estimatedTotalTax += tax;
      const pos = positions.find(p => p.symbol === target.symbol && connectedExchanges.includes(p.exchangeId));
      tradeSuggestions.push({
        action: 'sell',
        symbol: target.symbol,
        asset: target.asset,
        quantity: qty,
        valueUSD: parseFloat(Math.abs(diff).toFixed(2)),
        recommendedExchange: pos?.exchangeName ?? 'Coinbase',
        estimatedTaxImpact: tax,
        reason: `${target.symbol} is ${Math.abs(target.drift).toFixed(1)}% above target — trim to reduce concentration`,
      });
    } else {
      // Under-weight → buy
      tradeSuggestions.push({
        action: 'buy',
        symbol: target.symbol,
        asset: target.asset,
        quantity: qty,
        valueUSD: parseFloat(diff.toFixed(2)),
        recommendedExchange: bestBuyExchange(target.symbol),
        estimatedTaxImpact: 0,
        reason: `${target.symbol} is ${Math.abs(target.drift).toFixed(1)}% below target — add to rebalance`,
      });
    }
  }

  const plan: RebalancePlan = {
    totalPortfolioValue: parseFloat(totalValue.toFixed(2)),
    targets,
    trades: tradeSuggestions,
    estimatedTotalTax: parseFloat(estimatedTotalTax.toFixed(2)),
    driftThreshold,
  };

  return res.json(plan);
});

export default router;
