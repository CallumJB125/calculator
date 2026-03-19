import { Router, Request, Response } from 'express';
import { exchanges, exchangeFeeStructures, positions } from '../services/mockData';

const router = Router();

// GET /api/arbitrage/scan?quantity=1
router.get('/scan', (req: Request, res: Response) => {
  const quantity = parseFloat(String(req.query.quantity || '1'));

  if (isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'quantity must be a positive number' });
  }

  const connectedExchanges = exchanges.filter(e => e.connected);

  // De-duplicate assets
  const seen = new Set<string>();
  const assets = positions.filter(p => {
    if (seen.has(p.symbol) || p.symbol === 'USDC') return false;
    seen.add(p.symbol);
    return true;
  });

  const opportunities = [];

  for (const asset of assets) {
    const prices: Array<{
      exchangeId: string;
      exchangeName: string;
      bid: number;
      ask: number;
      takerFee: number;
    }> = [];

    for (const exchange of connectedExchanges) {
      const fee = exchangeFeeStructures.find(f => f.exchangeId === exchange.id);
      if (!fee) continue;

      // Each exchange has a slightly different mid-price (consistent with execution route)
      const seed = exchange.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
      const assetSeed = asset.symbol.charCodeAt(0);
      const midVariation = ((seed + assetSeed) % 7 - 3) * 0.0008;
      const mid = asset.currentPrice * (1 + midVariation);

      // Simulate bid/ask spread ~0.02% each side
      const halfSpread = mid * 0.0002;
      prices.push({
        exchangeId: exchange.id,
        exchangeName: exchange.name,
        bid: mid - halfSpread,   // you SELL at bid
        ask: mid + halfSpread,   // you BUY at ask
        takerFee: fee.takerFee,
      });
    }

    if (prices.length < 2) continue;

    // Find the best buy (lowest ask) and best sell (highest bid)
    const bestBuy  = [...prices].sort((a, b) => a.ask - b.ask)[0];
    const bestSell = [...prices].sort((a, b) => b.bid - a.bid)[0];

    if (bestBuy.exchangeId === bestSell.exchangeId) continue;

    const buyNotional  = bestBuy.ask * quantity;
    const sellNotional = bestSell.bid * quantity;

    const buyFee  = buyNotional  * bestBuy.takerFee;
    const sellFee = sellNotional * bestSell.takerFee;
    const totalFees = buyFee + sellFee;

    const grossSpread    = bestSell.bid - bestBuy.ask;
    const grossSpreadPct = (grossSpread / bestBuy.ask) * 100;
    const netProfit      = sellNotional - buyNotional - totalFees;
    const netProfitPct   = (netProfit / buyNotional) * 100;

    // Break-even size: how many units until fees eat the spread
    const spreadPerUnit  = bestSell.bid - bestBuy.ask;
    const feePerUnit     = bestBuy.ask * bestBuy.takerFee + bestSell.bid * bestSell.takerFee;
    const breakEvenUnits = feePerUnit > 0 ? feePerUnit / spreadPerUnit : Infinity;

    opportunities.push({
      asset: asset.asset,
      symbol: asset.symbol,
      quantity,
      buyExchange: bestBuy.exchangeName,
      buyExchangeId: bestBuy.exchangeId,
      buyPrice: parseFloat(bestBuy.ask.toFixed(2)),
      buyFee: parseFloat(buyFee.toFixed(2)),
      sellExchange: bestSell.exchangeName,
      sellExchangeId: bestSell.exchangeId,
      sellPrice: parseFloat(bestSell.bid.toFixed(2)),
      sellFee: parseFloat(sellFee.toFixed(2)),
      grossSpread: parseFloat(grossSpread.toFixed(2)),
      grossSpreadPct: parseFloat(grossSpreadPct.toFixed(4)),
      totalFees: parseFloat(totalFees.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2)),
      netProfitPct: parseFloat(netProfitPct.toFixed(4)),
      viable: netProfit > 0,
      breakEvenUnits: isFinite(breakEvenUnits) ? parseFloat(breakEvenUnits.toFixed(4)) : null,
    });
  }

  opportunities.sort((a, b) => {
    if (a.viable !== b.viable) return a.viable ? -1 : 1;
    return b.netProfit - a.netProfit;
  });

  return res.json({
    scannedAt: new Date().toISOString(),
    connectedExchanges: connectedExchanges.map(e => e.name),
    quantity,
    opportunities,
    viableCount: opportunities.filter(o => o.viable).length,
  });
});

export default router;
