import { Router, Request, Response } from 'express';
import { trades } from '../services/mockData';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { exchange, asset, type, year, page = '1', limit = '20' } = req.query;

  let filtered = [...trades];

  if (exchange) filtered = filtered.filter(t => t.exchangeId === exchange);
  if (asset) filtered = filtered.filter(t => t.symbol === String(asset).toUpperCase());
  if (type) filtered = filtered.filter(t => t.type === type);
  if (year) filtered = filtered.filter(t => new Date(t.date).getFullYear() === Number(year));

  // Sort by date descending
  filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = filtered.length;
  const pageNum = parseInt(String(page));
  const limitNum = parseInt(String(limit));
  const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return res.json({
    trades: paginated,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

router.get('/summary', (req: Request, res: Response) => {
  const { year } = req.query;
  let filtered = [...trades];
  if (year) filtered = filtered.filter(t => new Date(t.date).getFullYear() === Number(year));

  const totalBuys = filtered.filter(t => t.type === 'buy').reduce((sum, t) => sum + t.totalValue, 0);
  const totalSells = filtered.filter(t => t.type === 'sell').reduce((sum, t) => sum + t.totalValue, 0);
  const totalFees = filtered.reduce((sum, t) => sum + t.fee, 0);

  const availableYears = [...new Set(trades.map(t => new Date(t.date).getFullYear()))].sort((a, b) => b - a);

  return res.json({
    totalTrades: filtered.length,
    buyCount: filtered.filter(t => t.type === 'buy').length,
    sellCount: filtered.filter(t => t.type === 'sell').length,
    totalBuys,
    totalSells,
    totalFees,
    availableYears,
  });
});

export default router;
