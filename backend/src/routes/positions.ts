import { Router, Request, Response } from 'express';
import { getPositions, getPortfolioSummary, isLiveMode } from '../services/liveData';
import { fundingFees } from '../services/mockData';

const router = Router();

// Attach funding fee totals (mock data — will be replaced when live trade import lands)
function withFundingFees(pos: any) {
  const paid = fundingFees
    .filter(f => f.positionId === pos.id && f.amount > 0)
    .reduce((sum: number, f: any) => sum + f.amount, 0);
  return { ...pos, totalFundingFeesPaid: parseFloat(paid.toFixed(2)) || pos.totalFundingFeesPaid || 0 };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { exchange } = req.query;
    const positions = await getPositions(exchange ? String(exchange) : undefined);
    const enriched = positions.map(withFundingFees);
    return res.json(enriched);
  } catch (err: any) {
    console.error('[Positions] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const summary = await getPortfolioSummary();
    return res.json(summary);
  } catch (err: any) {
    console.error('[Positions/Summary] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/positions/mode — tells frontend whether we're live or demo
router.get('/mode', (_req: Request, res: Response) => {
  return res.json({
    mode: isLiveMode() ? 'live' : 'demo',
    message: isLiveMode()
      ? 'Connected to live exchanges via CCXT'
      : 'Running in demo mode with mock data. Connect an exchange to go live.',
  });
});

export default router;
