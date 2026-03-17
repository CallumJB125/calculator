import { Router, Request, Response } from 'express';
import { positions, fundingFees } from '../services/mockData';

const router = Router();

// Attach funding fee totals to each position
function withFundingFees(pos: typeof positions[0]) {
  const paid = fundingFees
    .filter(f => f.positionId === pos.id && f.amount > 0)
    .reduce((sum, f) => sum + f.amount, 0);
  return { ...pos, totalFundingFeesPaid: parseFloat(paid.toFixed(2)) };
}

router.get('/', (req: Request, res: Response) => {
  const { exchange } = req.query;
  const source = exchange
    ? positions.filter(p => p.exchangeId === exchange)
    : positions;
  return res.json(source.map(withFundingFees));
});

router.get('/summary', (_req: Request, res: Response) => {
  const enriched = positions.map(withFundingFees);

  const totalValue = enriched.reduce((sum, p) => sum + p.currentValue, 0);
  const totalCostBasis = enriched.reduce((sum, p) => sum + p.avgCostBasis * p.quantity, 0);
  const totalUnrealizedPnl = enriched.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const totalUnrealizedPnlPct = ((totalValue - totalCostBasis) / totalCostBasis) * 100;
  const totalFundingFeesPaid = enriched.reduce((sum, p) => sum + (p.totalFundingFeesPaid ?? 0), 0);

  // Consolidated per-asset view (across all exchanges)
  const byAsset = enriched.reduce<Record<string, {
    value: number;
    pnl: number;
    totalQty: number;
    totalCost: number;
    currentPrice: number;
    fundingFeesPaid: number;
  }>>((acc, p) => {
    if (!acc[p.symbol]) {
      acc[p.symbol] = { value: 0, pnl: 0, totalQty: 0, totalCost: 0, currentPrice: p.currentPrice, fundingFeesPaid: 0 };
    }
    acc[p.symbol].value += p.currentValue;
    acc[p.symbol].pnl += p.unrealizedPnl;
    acc[p.symbol].totalQty += p.quantity;
    acc[p.symbol].totalCost += p.avgCostBasis * p.quantity;
    acc[p.symbol].currentPrice = p.currentPrice;
    acc[p.symbol].fundingFeesPaid += p.totalFundingFeesPaid ?? 0;
    return acc;
  }, {});

  // Compute weighted avg cost basis per asset
  const consolidatedByAsset = Object.entries(byAsset).reduce<Record<string, {
    value: number;
    pnl: number;
    totalQty: number;
    totalCost: number;
    avgCostBasis: number;
    currentPrice: number;
    fundingFeesPaid: number;
  }>>((acc, [symbol, data]) => {
    acc[symbol] = {
      ...data,
      avgCostBasis: data.totalQty > 0 ? data.totalCost / data.totalQty : 0,
    };
    return acc;
  }, {});

  return res.json({
    totalValue,
    totalCostBasis,
    totalUnrealizedPnl,
    totalUnrealizedPnlPct,
    totalFundingFeesPaid: parseFloat(totalFundingFeesPaid.toFixed(2)),
    byAsset: consolidatedByAsset,
    positionCount: positions.length,
  });
});

export default router;
