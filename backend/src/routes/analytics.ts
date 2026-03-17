import { Router, Request, Response } from 'express';
import { positions } from '../services/mockData';

const router = Router();

// Estimated annualised volatility (%) per asset — typical crypto figures
const ASSET_VOLS: Record<string, number> = {
  BTC: 58,
  ETH: 72,
  SOL: 88,
  ADA: 84,
  USDC: 0,
};

// Historical correlation matrix (crypto assets are highly correlated with BTC)
const CORRELATIONS: Array<{ asset1: string; asset2: string; correlation: number }> = [
  { asset1: 'BTC', asset2: 'ETH', correlation: 0.85 },
  { asset1: 'BTC', asset2: 'SOL', correlation: 0.78 },
  { asset1: 'BTC', asset2: 'ADA', correlation: 0.72 },
  { asset1: 'ETH', asset2: 'SOL', correlation: 0.82 },
  { asset1: 'ETH', asset2: 'ADA', correlation: 0.76 },
  { asset1: 'SOL', asset2: 'ADA', correlation: 0.69 },
];

router.get('/risk', (_req, res) => {
  const totalValue = positions.reduce((s, p) => s + p.currentValue, 0);

  // --- Concentration (merged per asset across exchanges) ---
  const byAsset: Record<string, { value: number; pnl: number; cost: number; pnlPct: number }> = {};
  for (const p of positions) {
    if (!byAsset[p.symbol]) byAsset[p.symbol] = { value: 0, pnl: 0, cost: 0, pnlPct: 0 };
    byAsset[p.symbol].value += p.currentValue;
    byAsset[p.symbol].pnl  += p.unrealizedPnl;
    byAsset[p.symbol].cost += p.avgCostBasis * p.quantity;
  }
  for (const sym of Object.keys(byAsset)) {
    const d = byAsset[sym];
    d.pnlPct = d.cost > 0 ? ((d.value - d.cost) / d.cost) * 100 : 0;
  }

  const concentration = Object.entries(byAsset)
    .map(([symbol, d]) => ({
      symbol,
      value:  parseFloat(d.value.toFixed(2)),
      pct:    parseFloat(((d.value / totalValue) * 100).toFixed(2)),
      pnl:    parseFloat(d.pnl.toFixed(2)),
      pnlPct: parseFloat(d.pnlPct.toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value);

  // HHI: closer to 1 = highly concentrated
  const hhi = concentration.reduce((s, c) => s + Math.pow(c.pct / 100, 2), 0);
  const concentrationRisk: 'high' | 'medium' | 'low' = hhi > 0.5 ? 'high' : hhi > 0.25 ? 'medium' : 'low';

  // --- Performers ---
  const riskAssets = concentration.filter(c => c.symbol !== 'USDC');
  const sortedPerf = [...riskAssets].sort((a, b) => b.pnlPct - a.pnlPct);
  const best  = sortedPerf[0]  ?? null;
  const worst = sortedPerf[sortedPerf.length - 1] ?? null;

  // --- Portfolio volatility (weighted sum — simplified, ignores correlations for brevity) ---
  const portfolioVol = concentration.reduce((s, c) => {
    const vol = ASSET_VOLS[c.symbol] ?? 70;
    return s + (c.pct / 100) * vol;
  }, 0);

  // Weighted avg unrealised return
  const weightedReturn = riskAssets.reduce((s, c) => s + (c.pnlPct * c.value) / totalValue, 0);

  // Sharpe: (return - risk_free_rate) / volatility  (risk-free = 5%)
  const sharpeRatio = portfolioVol > 0 ? (weightedReturn - 5) / portfolioVol : 0;

  // 1-day 95% VaR
  const dailyVol = portfolioVol / Math.sqrt(252);
  const valueAtRisk95 = 1.645 * (dailyVol / 100) * totalValue;

  // Max drawdown estimate: empirically ~0.65× annualised vol for crypto
  const maxDrawdownEstimate = portfolioVol * 0.65;

  // --- Active correlations (only assets that are held) ---
  const heldSymbols = new Set(riskAssets.map(c => c.symbol));
  const relevantCorrelations = CORRELATIONS.filter(
    c => heldSymbols.has(c.asset1) && heldSymbols.has(c.asset2),
  );

  // --- Diversification score (0-100, higher = better) ---
  // Based on: number of assets, avg correlation, and concentration
  const avgCorr = relevantCorrelations.length > 0
    ? relevantCorrelations.reduce((s, c) => s + c.correlation, 0) / relevantCorrelations.length
    : 1;
  const diversificationScore = Math.round(
    Math.max(0, Math.min(100, (1 - avgCorr) * 50 + (1 - hhi) * 50)),
  );

  return res.json({
    totalValue: parseFloat(totalValue.toFixed(2)),
    concentration,
    herfindahlIndex: parseFloat(hhi.toFixed(4)),
    concentrationRisk,
    diversificationScore,
    bestPerformer:  best  ? { symbol: best.symbol,  pct: best.pnlPct,  pnl: best.pnl  } : null,
    worstPerformer: worst ? { symbol: worst.symbol, pct: worst.pnlPct, pnl: worst.pnl } : null,
    correlations: relevantCorrelations,
    riskMetrics: {
      portfolioVolatility:  parseFloat(portfolioVol.toFixed(2)),
      sharpeRatio:          parseFloat(sharpeRatio.toFixed(2)),
      maxDrawdownEstimate:  parseFloat(maxDrawdownEstimate.toFixed(2)),
      valueAtRisk95:        parseFloat(valueAtRisk95.toFixed(2)),
      dailyVolatilityPct:   parseFloat(dailyVol.toFixed(2)),
    },
  });
});

export default router;
