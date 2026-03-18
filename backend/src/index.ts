import express from 'express';
import cors from 'cors';
import exchangesRouter from './routes/exchanges';
import positionsRouter from './routes/positions';
import tradesRouter from './routes/trades';
import taxesRouter from './routes/taxes';
import executionRouter from './routes/execution';
import fundingRouter from './routes/funding';
import harvestRouter from './routes/harvest';
import taxpreviewRouter from './routes/taxpreview';
import arbitrageRouter from './routes/arbitrage';
import analyticsRouter from './routes/analytics';
import incomeRouter from './routes/income';
import rebalanceRouter from './routes/rebalance';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/exchanges', exchangesRouter);
app.use('/api/positions', positionsRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/taxes', taxesRouter);
app.use('/api/execution', executionRouter);
app.use('/api/funding', fundingRouter);
app.use('/api/harvest', harvestRouter);
app.use('/api/taxpreview', taxpreviewRouter);
app.use('/api/arbitrage', arbitrageRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/income', incomeRouter);
app.use('/api/rebalance', rebalanceRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Crypto Tax Hub API running on http://localhost:${PORT}`);
});
