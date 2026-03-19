import { Router, Request, Response } from 'express';
import { positions, trades } from '../services/mockData';

const router = Router();

// GET /api/taxpreview?symbol=BTC&quantity=0.5&method=fifo
router.get('/', (req: Request, res: Response) => {
  const { symbol: symbolParam, quantity: quantityStr, method = 'fifo' } = req.query;

  if (!symbolParam || !quantityStr) {
    return res.status(400).json({ error: 'symbol and quantity are required' });
  }

  const symbol = String(symbolParam).toUpperCase();
  const quantity = parseFloat(String(quantityStr));

  if (isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'quantity must be a positive number' });
  }

  const holding = positions.find(p => p.symbol === symbol);
  if (!holding) {
    return res.status(404).json({ error: `No position found for ${symbol}` });
  }

  const totalHeld = positions.filter(p => p.symbol === symbol).reduce((s, p) => s + p.quantity, 0);
  if (quantity > totalHeld + 0.00001) {
    return res.status(400).json({ error: `Exceeds total holdings of ${totalHeld.toFixed(8)} ${symbol}` });
  }

  const currentPrice = holding.currentPrice;
  const saleDate = new Date();

  // Build available lots from buy history
  const allBuys = trades
    .filter(t => t.type === 'buy' && t.symbol === symbol)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(t => ({
      tradeId: t.id,
      date: t.date,
      qty: t.quantity,
      costPerUnit: t.price + t.fee / t.quantity,
    }));

  // Consume lots consumed by prior sells (FIFO drain)
  const priorSells = trades
    .filter(t => t.type === 'sell' && t.symbol === symbol)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const sell of priorSells) {
    let rem = sell.quantity;
    for (const lot of allBuys) {
      if (rem <= 0) break;
      const used = Math.min(lot.qty, rem);
      lot.qty -= used;
      rem -= used;
    }
  }

  const availableLots = allBuys.filter(l => l.qty > 0.0000001);

  // Sort per requested method
  const m = String(method);
  let sorted = [...availableLots];
  if (m === 'lifo') {
    sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } else if (m === 'hifo') {
    sorted.sort((a, b) => b.costPerUnit - a.costPerUnit);
  } else {
    sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // Compute per-lot tax impact
  let remaining = quantity;
  const usedLots: Array<{
    buyDate: string;
    quantity: number;
    costPerUnit: number;
    costBasisTotal: number;
    proceeds: number;
    gain: number;
    daysHeld: number;
    termType: 'short' | 'long';
    daysUntilLongTerm: number;
    estimatedTax: number;
  }> = [];

  for (const lot of sorted) {
    if (remaining <= 0) break;
    const used = Math.min(lot.qty, remaining);
    const proceeds = currentPrice * used;
    const costBasisTotal = lot.costPerUnit * used;
    const gain = proceeds - costBasisTotal;
    const daysHeld = Math.floor((saleDate.getTime() - new Date(lot.date).getTime()) / (1000 * 60 * 60 * 24));
    const termType: 'short' | 'long' = daysHeld > 365 ? 'long' : 'short';
    const daysUntilLongTerm = termType === 'short' ? Math.max(0, 366 - daysHeld) : 0;
    const estimatedTax = termType === 'short'
      ? Math.max(0, gain * 0.37)
      : Math.max(0, gain * 0.20);

    usedLots.push({
      buyDate: lot.date,
      quantity: parseFloat(used.toFixed(8)),
      costPerUnit: parseFloat(lot.costPerUnit.toFixed(2)),
      costBasisTotal: parseFloat(costBasisTotal.toFixed(2)),
      proceeds: parseFloat(proceeds.toFixed(2)),
      gain: parseFloat(gain.toFixed(2)),
      daysHeld,
      termType,
      daysUntilLongTerm,
      estimatedTax: parseFloat(estimatedTax.toFixed(2)),
    });

    remaining -= used;
  }

  const totalProceeds = parseFloat((currentPrice * quantity).toFixed(2));
  const totalCostBasis = parseFloat(usedLots.reduce((s, l) => s + l.costBasisTotal, 0).toFixed(2));
  const totalGain = parseFloat((totalProceeds - totalCostBasis).toFixed(2));
  const shortTermGain = parseFloat(usedLots.filter(l => l.termType === 'short').reduce((s, l) => s + l.gain, 0).toFixed(2));
  const longTermGain = parseFloat(usedLots.filter(l => l.termType === 'long').reduce((s, l) => s + l.gain, 0).toFixed(2));
  const estimatedTax = parseFloat(usedLots.reduce((s, l) => s + l.estimatedTax, 0).toFixed(2));
  const effectiveRate = totalProceeds > 0 ? parseFloat(((estimatedTax / totalProceeds) * 100).toFixed(2)) : 0;
  const taxCostPct = totalGain > 0 ? parseFloat(((estimatedTax / totalGain) * 100).toFixed(2)) : 0;

  // Check if any short-term lots could flip to long-term soon
  const soonLongTerm = usedLots
    .filter(l => l.termType === 'short' && l.daysUntilLongTerm > 0 && l.daysUntilLongTerm <= 60 && l.gain > 0)
    .sort((a, b) => a.daysUntilLongTerm - b.daysUntilLongTerm);

  const potentialSavingsIfWait = soonLongTerm.reduce((s, l) => s + l.gain * (0.37 - 0.20), 0);

  return res.json({
    symbol,
    quantity,
    currentPrice,
    proceeds: totalProceeds,
    costBasis: totalCostBasis,
    gain: totalGain,
    shortTermGain,
    longTermGain,
    estimatedTax,
    effectiveRate,
    taxCostPct,
    method: m,
    lots: usedLots,
    insight: soonLongTerm.length > 0 && potentialSavingsIfWait > 10 ? {
      type: 'wait_for_long_term',
      message: `Waiting up to ${soonLongTerm[0].daysUntilLongTerm} more days could save ~${Math.round(potentialSavingsIfWait)} in taxes by flipping ${soonLongTerm.length} lot(s) to long-term rates.`,
      daysToWait: soonLongTerm[0].daysUntilLongTerm,
      potentialSavings: parseFloat(potentialSavingsIfWait.toFixed(2)),
      flipDate: new Date(saleDate.getTime() + soonLongTerm[0].daysUntilLongTerm * 86400000).toISOString(),
    } : null,
  });
});

export default router;
