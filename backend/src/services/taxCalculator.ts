import { Trade, TaxEvent, TaxSummary, TaxLot } from '../types';

type CostBasisMethod = 'fifo' | 'lifo' | 'hifo';

export function calculateTaxes(trades: Trade[], taxYear: number, method: CostBasisMethod = 'fifo'): TaxSummary {
  const yearTrades = trades.filter(t => new Date(t.date).getFullYear() === taxYear);

  // Group buy lots by asset across ALL history (not just this year)
  const lotsByAsset: Record<string, TaxLot[]> = {};
  const allBuys = trades
    .filter(t => t.type === 'buy' && new Date(t.date) <= new Date(`${taxYear}-12-31`))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const buy of allBuys) {
    if (!lotsByAsset[buy.symbol]) lotsByAsset[buy.symbol] = [];
    lotsByAsset[buy.symbol].push({
      tradeId: buy.id,
      date: buy.date,
      quantity: buy.quantity,
      costBasis: buy.price + buy.fee / buy.quantity,
      asset: buy.symbol,
    });
  }

  const taxEvents: TaxEvent[] = [];

  const sells = yearTrades.filter(t => t.type === 'sell');

  for (const sell of sells) {
    let remainingQty = sell.quantity;
    const lots = lotsByAsset[sell.symbol] || [];

    // Sort lots based on method
    let sortedLots: TaxLot[];
    if (method === 'fifo') {
      sortedLots = [...lots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (method === 'lifo') {
      sortedLots = [...lots].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      // hifo - highest cost first
      sortedLots = [...lots].sort((a, b) => b.costBasis - a.costBasis);
    }

    for (const lot of sortedLots) {
      if (remainingQty <= 0) break;
      if (lot.quantity <= 0) continue;

      const usedQty = Math.min(remainingQty, lot.quantity);
      const proceeds = (sell.price * usedQty) - (sell.fee * usedQty / sell.quantity);
      const costBasis = lot.costBasis * usedQty;
      const gain = proceeds - costBasis;

      const sellDate = new Date(sell.date);
      const buyDate = new Date(lot.date);
      const holdingDays = Math.floor((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));

      taxEvents.push({
        id: `${sell.id}-${lot.tradeId}`,
        asset: sell.asset,
        symbol: sell.symbol,
        exchangeName: sell.exchangeName,
        sellDate: sell.date,
        buyDate: lot.date,
        quantity: usedQty,
        proceeds,
        costBasis,
        gain,
        termType: holdingDays > 365 ? 'long' : 'short',
        holdingDays,
      });

      lot.quantity -= usedQty;
      remainingQty -= usedQty;
    }
  }

  const shortTermGain = taxEvents.filter(e => e.termType === 'short').reduce((sum, e) => sum + e.gain, 0);
  const longTermGain = taxEvents.filter(e => e.termType === 'long').reduce((sum, e) => sum + e.gain, 0);
  const totalProceeds = taxEvents.reduce((sum, e) => sum + e.proceeds, 0);
  const totalCostBasis = taxEvents.reduce((sum, e) => sum + e.costBasis, 0);

  return {
    taxYear,
    totalProceeds,
    totalCostBasis,
    shortTermGain,
    longTermGain,
    totalGain: shortTermGain + longTermGain,
    events: taxEvents.sort((a, b) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()),
  };
}
