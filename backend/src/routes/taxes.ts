import { Router, Request, Response } from 'express';
import { trades, fundingFees } from '../services/mockData';
import { calculateTaxes } from '../services/taxCalculator';
import { CostBasisComparison, CostBasisMethodResult } from '../types';

const router = Router();

router.get('/report', (req: Request, res: Response) => {
  const year = parseInt(String(req.query.year || new Date().getFullYear()));
  const method = (req.query.method as 'fifo' | 'lifo' | 'hifo') || 'fifo';

  if (!['fifo', 'lifo', 'hifo'].includes(method)) {
    return res.status(400).json({ error: 'method must be fifo, lifo, or hifo' });
  }

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

// GET /api/taxes/compare?year=2024
// Returns side-by-side FIFO/LIFO/HIFO comparison with recommendation
router.get('/compare', (req: Request, res: Response) => {
  const year = parseInt(String(req.query.year || new Date().getFullYear()));

  const deductibleFundingFees = fundingFees
    .filter(f => new Date(f.date).getFullYear() === year && f.amount > 0)
    .reduce((sum, f) => sum + f.amount, 0);

  const methods: Array<'fifo' | 'lifo' | 'hifo'> = ['fifo', 'lifo', 'hifo'];
  const results: CostBasisMethodResult[] = methods.map(m => {
    const r = calculateTaxes(trades, year, m, parseFloat(deductibleFundingFees.toFixed(2)));
    // Estimate tax: short-term at 37%, long-term at 20%
    const estimatedTax = r.shortTermGain * 0.37 + Math.max(0, r.longTermGain) * 0.20;
    return {
      method: m,
      totalGain: parseFloat(r.totalGain.toFixed(2)),
      shortTermGain: parseFloat(r.shortTermGain.toFixed(2)),
      longTermGain: parseFloat(r.longTermGain.toFixed(2)),
      estimatedTax: parseFloat(estimatedTax.toFixed(2)),
      netTaxableGain: parseFloat(r.netTaxableGain.toFixed(2)),
    };
  });

  const sorted = [...results].sort((a, b) => a.estimatedTax - b.estimatedTax);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const maxSavings = parseFloat((worst.estimatedTax - best.estimatedTax).toFixed(2));

  const methodLabels: Record<string, string> = { fifo: 'FIFO', lifo: 'LIFO', hifo: 'HIFO' };
  let recommendation = `${methodLabels[best.method]} minimises your ${year} tax bill`;
  if (maxSavings > 0) {
    recommendation += ` — saving $${maxSavings.toLocaleString()} vs ${methodLabels[worst.method]}`;
  }
  if (best.method === 'hifo') {
    recommendation += '. HIFO sells your highest-cost lots first, locking in the smallest gains.';
  } else if (best.method === 'fifo') {
    recommendation += '. FIFO works best when earlier lots are long-term (lower rate applies).';
  } else {
    recommendation += '. LIFO uses your most recent (often highest-cost) lots first.';
  }

  const comparison: CostBasisComparison = {
    taxYear: year,
    results,
    bestMethod: best.method,
    worstMethod: worst.method,
    maxSavingsVsWorst: maxSavings,
    recommendation,
  };

  return res.json(comparison);
});

export default router;
