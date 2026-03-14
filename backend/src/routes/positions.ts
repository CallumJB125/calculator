import { Router, Request, Response } from 'express';
import { positions } from '../services/mockData';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { exchange } = req.query;
  if (exchange) {
    return res.json(positions.filter(p => p.exchangeId === exchange));
  }
  return res.json(positions);
});

router.get('/summary', (_req: Request, res: Response) => {
  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalCostBasis = positions.reduce((sum, p) => sum + p.avgCostBasis * p.quantity, 0);
  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const totalUnrealizedPnlPct = ((totalValue - totalCostBasis) / totalCostBasis) * 100;

  const byAsset = positions.reduce<Record<string, { value: number; pnl: number }>>((acc, p) => {
    if (!acc[p.symbol]) acc[p.symbol] = { value: 0, pnl: 0 };
    acc[p.symbol].value += p.currentValue;
    acc[p.symbol].pnl += p.unrealizedPnl;
    return acc;
  }, {});

  return res.json({
    totalValue,
    totalCostBasis,
    totalUnrealizedPnl,
    totalUnrealizedPnlPct,
    byAsset,
    positionCount: positions.length,
  });
});

export default router;
