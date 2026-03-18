import { Router, Request, Response } from 'express';
import { stakingRewards } from '../services/mockData';
import { StakingIncomeSummary } from '../types';

const router = Router();

// GET /api/income/staking?year=2025
router.get('/staking', (req: Request, res: Response) => {
  const year = parseInt(String(req.query.year || new Date().getFullYear()));

  const filtered = stakingRewards.filter(r => new Date(r.date).getFullYear() === year);

  const byAsset: StakingIncomeSummary['byAsset'] = {};
  const byExchange: StakingIncomeSummary['byExchange'] = {};
  let totalIncomeUSD = 0;

  for (const r of filtered) {
    totalIncomeUSD += r.valueUSD;

    if (!byAsset[r.symbol]) byAsset[r.symbol] = { quantity: 0, valueUSD: 0, priceAvg: 0 };
    byAsset[r.symbol].quantity += r.quantity;
    byAsset[r.symbol].valueUSD += r.valueUSD;

    if (!byExchange[r.exchangeName]) byExchange[r.exchangeName] = { quantity: 0, valueUSD: 0 };
    byExchange[r.exchangeName].quantity += r.quantity;
    byExchange[r.exchangeName].valueUSD += r.valueUSD;
  }

  // Compute weighted average price per asset
  for (const sym of Object.keys(byAsset)) {
    const a = byAsset[sym];
    a.priceAvg = a.quantity > 0 ? parseFloat((a.valueUSD / a.quantity).toFixed(2)) : 0;
    a.quantity = parseFloat(a.quantity.toFixed(6));
    a.valueUSD = parseFloat(a.valueUSD.toFixed(2));
  }

  for (const ex of Object.keys(byExchange)) {
    const e = byExchange[ex];
    e.quantity = parseFloat(e.quantity.toFixed(6));
    e.valueUSD = parseFloat(e.valueUSD.toFixed(2));
  }

  totalIncomeUSD = parseFloat(totalIncomeUSD.toFixed(2));

  const summary: StakingIncomeSummary = {
    taxYear: year,
    totalIncomeUSD,
    estimatedTax: parseFloat((totalIncomeUSD * 0.37).toFixed(2)),
    byAsset,
    byExchange,
    rewards: filtered,
  };

  return res.json(summary);
});

// GET /api/income/years
router.get('/years', (_req: Request, res: Response) => {
  const years = [...new Set(stakingRewards.map(r => new Date(r.date).getFullYear()))].sort((a, b) => b - a);
  return res.json(years);
});

export default router;
