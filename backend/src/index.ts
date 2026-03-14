import express from 'express';
import cors from 'cors';
import exchangesRouter from './routes/exchanges';
import positionsRouter from './routes/positions';
import tradesRouter from './routes/trades';
import taxesRouter from './routes/taxes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/exchanges', exchangesRouter);
app.use('/api/positions', positionsRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/taxes', taxesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Crypto Tax Hub API running on http://localhost:${PORT}`);
});
