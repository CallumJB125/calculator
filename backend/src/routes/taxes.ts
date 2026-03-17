import { Router, Request, Response } from 'express';
import { trades, fundingFees } from '../services/mockData';
import { calculateTaxes } from '../services/taxCalculator';

const router = Router();

router.get('/report', (req: Request, res: Response) => {
  const year = parseInt(String(req.query.year || new Date().getFullYear()));
  const method = (req.query.method as 'fifo' | 'lifo' | 'hifo') || 'fifo';

  if (!['fifo', 'lifo', 'hifo'].includes(method)) {
    return res.status(400).json({ error: 'method must be fifo, lifo, or hifo' });
  }

  // Sum funding fees paid in this tax year (deductible as investment expenses)
  const deductibleFundingFees = fundingFees
    .filter(f => new Date(f.date).getFullYear() === year && f.amount > 0)
    .reduce((sum, f) => sum + f.amount, 0);

  const report = calculateTaxes(trades, year, method, parseFloat(deductibleFundingFees.toFixed(2)));
  return res.json(report);
});

router.get('/years', (_req: Request, res: Response) => {
  const years = [...new Set(trades.map(t => new Date(t.date).getFullYear()))].sort((a, b) => b - a);
  return res.json(years);
});

export default router;
