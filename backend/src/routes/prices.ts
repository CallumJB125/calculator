import { Router, Request, Response } from 'express';
import { fetchPrices, getSupportedSymbols } from '../services/prices';

const router = Router();

// GET /api/prices — all supported asset prices (CoinGecko)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const prices = await fetchPrices();
    return res.json({
      source: 'coingecko',
      currency: 'USD',
      count: Object.keys(prices).length,
      prices,
      cachedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/prices/:symbol — single asset price
router.get('/:symbol', async (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const prices = await fetchPrices([symbol]);
    const price = prices[symbol];
    if (!price) return res.status(404).json({ error: `No price for ${symbol}` });
    return res.json({ symbol, price, currency: 'USD', source: 'coingecko' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/prices/supported — list all supported symbols
router.get('/supported/list', (_req: Request, res: Response) => {
  return res.json({ symbols: getSupportedSymbols() });
});

export default router;
