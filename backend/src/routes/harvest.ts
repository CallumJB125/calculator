import { Router, Request, Response } from 'express';
import { positions, trades } from '../services/mockData';

const router = Router();

// GET /api/harvest/opportunities?year=2026
router.get('/opportunities', (req: Request, res: Response) => {
  const year = parseInt(String(req.query.year || new Date().getFullYear()));
  const now = new Date();

  // --- Compute approximate realized gains already booked this year ---
  const yearSells = trades.filter(t => t.type === 'sell' && new Date(t.date).getFullYear() === year);

  // Track remaining lots per symbol (FIFO) to estimate cost basis of sells
  const lotsForGainCalc: Record<string, Array<{ date: string; qty: number; price: number; fee: number }>> = {};
  for (const t of trades.filter(x => x.type === 'buy').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())) {
    if (!lotsForGainCalc[t.symbol]) lotsForGainCalc[t.symbol] = [];
    lotsForGainCalc[t.symbol].push({ date: t.date, qty: t.quantity, price: t.price, fee: t.fee });
  }

  let existingGainsThisYear = 0;
  for (const sell of yearSells) {
    let rem = sell.quantity;
    const lots = lotsForGainCalc[sell.symbol] ?? [];
    for (const lot of lots) {
      if (rem <= 0) break;
      const used = Math.min(lot.qty, rem);
      const costPerUnit = lot.price + lot.fee / lot.qty;
      existingGainsThisYear += sell.price * used - costPerUnit * used - sell.fee * (used / sell.quantity);
      lot.qty -= used;
      rem -= used;
    }
  }

  // --- Find loss positions ---
  const opportunities = positions
    .filter(p => p.unrealizedPnl < 0)
    .map(p => {
      // Most recent buy for this position (to check wash-sale)
      const buys = trades
        .filter(t => t.type === 'buy' && t.symbol === p.symbol && t.exchangeId === p.exchangeId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const mostRecentBuy = buys[0];
      const daysHeld = mostRecentBuy
        ? Math.floor((now.getTime() - new Date(mostRecentBuy.date).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Wash-sale rule: cannot repurchase substantially identical asset within 30 days before/after the sale
      const washSaleRisk = daysHeld < 30;
      const daysUntilSafe = washSaleRisk ? 30 - daysHeld : 0;

      const termType: 'short' | 'long' = daysHeld > 365 ? 'long' : 'short';
      const lossAmount = Math.abs(p.unrealizedPnl);
      const rate = termType === 'short' ? 0.37 : 0.20;
      const taxSavings = washSaleRisk ? 0 : lossAmount * rate;

      // For each short-term lot, when does it cross the long-term threshold?
      const lotsWithCountdown = buys.map(b => {
        const bDaysHeld = Math.floor((now.getTime() - new Date(b.date).getTime()) / (1000 * 60 * 60 * 24));
        const daysUntilLongTerm = Math.max(0, 366 - bDaysHeld);
        return {
          buyDate: b.date,
          daysHeld: bDaysHeld,
          termType: bDaysHeld > 365 ? 'long' : 'short',
          daysUntilLongTerm: bDaysHeld > 365 ? 0 : daysUntilLongTerm,
          quantity: b.quantity,
          costBasis: b.price + b.fee / b.quantity,
        };
      });

      return {
        positionId: p.id,
        exchangeId: p.exchangeId,
        exchangeName: p.exchangeName,
        asset: p.asset,
        symbol: p.symbol,
        quantity: p.quantity,
        avgCostBasis: p.avgCostBasis,
        currentPrice: p.currentPrice,
        currentValue: p.currentValue,
        unrealizedLoss: parseFloat(p.unrealizedPnl.toFixed(2)),
        taxSavings: parseFloat(taxSavings.toFixed(2)),
        washSaleRisk,
        daysUntilSafe,
        daysHeld,
        termType,
        savingsRate: rate,
        lots: lotsWithCountdown,
      };
    })
    .sort((a, b) => b.taxSavings - a.taxSavings);

  const totalUnrealizedLoss = opportunities.reduce((s, o) => s + o.unrealizedLoss, 0);
  const totalPotentialSavings = opportunities.reduce((s, o) => s + o.taxSavings, 0);
  const netGainAfterHarvest = existingGainsThisYear + totalUnrealizedLoss;

  return res.json({
    taxYear: year,
    existingGainsThisYear: parseFloat(existingGainsThisYear.toFixed(2)),
    totalUnrealizedLoss: parseFloat(totalUnrealizedLoss.toFixed(2)),
    totalPotentialSavings: parseFloat(totalPotentialSavings.toFixed(2)),
    netGainAfterHarvest: parseFloat(netGainAfterHarvest.toFixed(2)),
    opportunities,
  });
});

export default router;
