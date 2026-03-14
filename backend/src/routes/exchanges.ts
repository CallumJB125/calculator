import { Router, Request, Response } from 'express';
import { exchanges } from '../services/mockData';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json(exchanges);
});

router.post('/:id/connect', (req: Request, res: Response) => {
  const { id } = req.params;
  const { apiKey, apiSecret } = req.body;

  if (!apiKey || !apiSecret) {
    return res.status(400).json({ error: 'apiKey and apiSecret are required' });
  }

  const exchange = exchanges.find(e => e.id === id);
  if (!exchange) {
    return res.status(404).json({ error: 'Exchange not found' });
  }

  exchange.connected = true;
  exchange.apiKey = apiKey.slice(0, 4) + '**********************' + apiKey.slice(-4);
  exchange.lastSync = new Date().toISOString();

  return res.json({ success: true, exchange });
});

router.delete('/:id/disconnect', (req: Request, res: Response) => {
  const { id } = req.params;
  const exchange = exchanges.find(e => e.id === id);

  if (!exchange) {
    return res.status(404).json({ error: 'Exchange not found' });
  }

  exchange.connected = false;
  exchange.apiKey = undefined;
  exchange.apiSecret = undefined;
  exchange.lastSync = undefined;

  return res.json({ success: true });
});

router.post('/:id/sync', (req: Request, res: Response) => {
  const { id } = req.params;
  const exchange = exchanges.find(e => e.id === id);

  if (!exchange) {
    return res.status(404).json({ error: 'Exchange not found' });
  }

  if (!exchange.connected) {
    return res.status(400).json({ error: 'Exchange not connected' });
  }

  exchange.lastSync = new Date().toISOString();
  return res.json({ success: true, lastSync: exchange.lastSync });
});

export default router;
