import { Router, Request, Response } from 'express';
import { getExchanges } from '../services/liveData';
import { saveExchangeKeys, disconnectExchange, updateLastSync, isExchangeConnected } from '../services/database';
import { validateKeys, fetchBalances, clearExchangeInstance } from '../services/exchangeAdapters';

const router = Router();

// GET /api/exchanges — list all exchanges with connection status
router.get('/', (_req: Request, res: Response) => {
  res.json(getExchanges());
});

// POST /api/exchanges/:id/connect — connect with real API keys
router.post('/:id/connect', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { apiKey, apiSecret } = req.body;

  if (!apiKey || !apiSecret) {
    return res.status(400).json({ error: 'apiKey and apiSecret are required' });
  }

  const supportedExchanges = ['coinbase', 'binance', 'kraken', 'gemini', 'kucoin'];
  if (!supportedExchanges.includes(id)) {
    return res.status(404).json({ error: `Exchange ${id} not supported` });
  }

  try {
    // Validate keys against the real exchange API
    console.log(`[Exchanges] Validating API keys for ${id}...`);
    const validation = await validateKeys(id, apiKey, apiSecret);

    if (!validation.valid) {
      return res.status(400).json({
        error: `API key validation failed: ${validation.error}`,
        hint: 'Check that your API key has the correct permissions (read balances + trade history).',
      });
    }

    // Save encrypted keys to SQLite
    saveExchangeKeys(id, apiKey, apiSecret);

    // Fetch initial balances
    try {
      const balances = await fetchBalances(id);
      console.log(`[Exchanges] ${id} connected — ${balances.length} assets found`);
    } catch (err: any) {
      console.warn(`[Exchanges] Initial balance fetch for ${id} failed: ${err.message}`);
    }

    const exchanges = getExchanges();
    const exchange = exchanges.find(e => e.id === id);

    return res.json({ success: true, exchange });
  } catch (err: any) {
    console.error(`[Exchanges] Connect error for ${id}:`, err.message);
    return res.status(500).json({ error: `Failed to connect: ${err.message}` });
  }
});

// DELETE /api/exchanges/:id/disconnect — disconnect and remove keys
router.delete('/:id/disconnect', (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isExchangeConnected(id)) {
    return res.status(400).json({ error: 'Exchange is not connected' });
  }

  disconnectExchange(id);
  clearExchangeInstance(id);

  return res.json({ success: true });
});

// POST /api/exchanges/:id/sync — force re-sync balances
router.post('/:id/sync', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isExchangeConnected(id)) {
    return res.status(400).json({ error: 'Exchange not connected' });
  }

  try {
    const balances = await fetchBalances(id);
    updateLastSync(id);

    return res.json({
      success: true,
      lastSync: new Date().toISOString(),
      assetsFound: balances.length,
      balances: balances.map(b => ({
        symbol: b.symbol,
        total: b.total,
        free: b.free,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Sync failed: ${err.message}` });
  }
});

export default router;
