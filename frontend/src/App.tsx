import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Exchanges from './pages/Exchanges';
import Positions from './pages/Positions';
import TradeHistory from './pages/TradeHistory';
import Execution from './pages/Execution';
import FundingFees from './pages/FundingFees';
import TaxReport from './pages/TaxReport';

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
          <Route path="/funding" element={<FundingFees />} />
          <Route path="/taxes" element={<TaxReport />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
