import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Exchanges from './pages/Exchanges';
import Positions from './pages/Positions';
import TradeHistory from './pages/TradeHistory';
import Execution from './pages/Execution';
import Arbitrage from './pages/Arbitrage';
import FundingFees from './pages/FundingFees';
import Harvest from './pages/Harvest';
import Analytics from './pages/Analytics';
import TaxReport from './pages/TaxReport';
import Income from './pages/Income';
import Rebalance from './pages/Rebalance';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/exchanges" element={<Exchanges />} />
          <Route path="/positions" element={<Positions />} />
          <Route path="/trades" element={<TradeHistory />} />
          <Route path="/execution" element={<Execution />} />
          <Route path="/arbitrage" element={<Arbitrage />} />
          <Route path="/funding" element={<FundingFees />} />
          <Route path="/harvest" element={<Harvest />} />
          <Route path="/income" element={<Income />} />
          <Route path="/rebalance" element={<Rebalance />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/taxes" element={<TaxReport />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
