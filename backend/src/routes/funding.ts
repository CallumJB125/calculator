import { Router, Request, Response } from 'express';
import { fundingFees } from '../services/mockData';

const router = Router();

// GET /api/funding/fees?exchange=binance&symbol=BTC&year=2026
router.get('/fees', (req: Request, res: Response) => {
  const { exchange, symbol, year } = req.query;

  let filtered = [...fundingFees];
  if (exchange) filtered = filtered.filter(f => f.exchangeId === String(exchange));
  if (symbol)   filtered = filtered.filter(f => f.symbol === String(symbol).toUpperCase());
  if (year)     filtered = filtered.filter(f => new Date(f.date).getFullYear() === parseInt(String(year)));

  return res.json(filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
});

// GET /api/funding/summary?year=2026
router.get('/summary', (req: Request, res: Response) => {
  const { year } = req.query;

  let filtered = [...fundingFees];
  if (year) filtered = filtered.filter(f => new Date(f.date).getFullYear() === parseInt(String(year)));

  const totalFeesPaid     = filtered.filter(f => f.amount > 0).reduce((s, f) => s + f.amount, 0);
  const totalFeesReceived = filtered.filter(f => f.amount < 0).reduce((s, f) => s + Math.abs(f.amount), 0);

  type Bucket = { paid: number; received: number; net: number };
  const byAsset: Record<string, Bucket> = {};
  const byExchange: Record<string, Bucket> = {};

  for (const fee of filtered) {
    if (!byAsset[fee.symbol])       byAsset[fee.symbol]       = { paid: 0, received: 0, net: 0 };
    if (!byExchange[fee.exchangeId]) byExchange[fee.exchangeId] = { paid: 0, received: 0, net: 0 };

    if (fee.amount > 0) {
      byAsset[fee.symbol].paid       += fee.amount;
      byExchange[fee.exchangeId].paid += fee.amount;
    } else {
      byAsset[fee.symbol].received       += Math.abs(fee.amount);
      byExchange[fee.exchangeId].received += Math.abs(fee.amount);
    }
    byAsset[fee.symbol].net       += fee.amount;
    byExchange[fee.exchangeId].net += fee.amount;
  }

  // Round all bucketed values
  for (const key of Object.keys(byAsset)) {
    byAsset[key].paid     = parseFloat(byAsset[key].paid.toFixed(2));
    byAsset[key].received = parseFloat(byAsset[key].received.toFixed(2));
    byAsset[key].net      = parseFloat(byAsset[key].net.toFixed(2));
  }
  for (const key of Object.keys(byExchange)) {
    byExchange[key].paid     = parseFloat(byExchange[key].paid.toFixed(2));
    byExchange[key].received = parseFloat(byExchange[key].received.toFixed(2));
    byExchange[key].net      = parseFloat(byExchange[key].net.toFixed(2));
  }

  return res.json({
    totalFeesPaid:     parseFloat(totalFeesPaid.toFixed(2)),
    totalFeesReceived: parseFloat(totalFeesReceived.toFixed(2)),
    netFees:           parseFloat((totalFeesPaid - totalFeesReceived).toFixed(2)),
    byAsset,
    byExchange,
    fees: filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  });
});

// GET /api/funding/years
router.get('/years', (_req, res) => {
  const years = [...new Set(fundingFees.map(f => new Date(f.date).getFullYear()))].sort((a, b) => b - a);
  return res.json(years);
});

export default router;
