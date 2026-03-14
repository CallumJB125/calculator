import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Exchange, Position, PortfolioSummary } from '../types';
import { fmtUSD, fmtPct } from '../utils/format';

export default function Positions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [filterExchange, setFilterExchange] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.positions.list(),
      api.positions.summary(),
      api.exchanges.list(),
    ]).then(([p, s, e]) => {
      setPositions(p);
      setSummary(s);
      setExchanges(e.filter(ex => ex.connected));
      setLoading(false);
    });
  }, []);

  const filtered = filterExchange
    ? positions.filter(p => p.exchangeId === filterExchange)
    : positions;

  const sorted = [...filtered].sort((a, b) => b.currentValue - a.currentValue);

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Open Positions</h1>
          <p className="text-gray-400 mt-1">Current holdings across all connected exchanges</p>
        </div>
        <select
          className="select"
          value={filterExchange}
          onChange={e => setFilterExchange(e.target.value)}
        >
          <option value="">All Exchanges</option>
          {exchanges.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {/* Summary strip */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Value</p>
            <p className="text-xl font-bold text-white">{fmtUSD(summary.totalValue)}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cost Basis</p>
            <p className="text-xl font-bold text-white">{fmtUSD(summary.totalCostBasis)}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Unrealized P&L</p>
            <p className={`text-xl font-bold ${summary.totalUnrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {fmtUSD(summary.totalUnrealizedPnl)}
            </p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Return</p>
            <p className={`text-xl font-bold ${summary.totalUnrealizedPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {fmtPct(summary.totalUnrealizedPnlPct)}
            </p>
          </div>
        </div>
      )}

      {/* Positions table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Asset</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Holdings</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Avg Cost</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Current Price</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Value</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">P&L</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {sorted.map(p => (
                <tr key={p.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
                        {p.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{p.asset}</p>
                        <p className="text-xs text-gray-500">{p.exchangeName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm text-white">
                      {p.quantity < 1 ? p.quantity.toFixed(4) : p.quantity.toFixed(2)} {p.symbol}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-300">
                    {fmtUSD(p.avgCostBasis)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-white">
                    {fmtUSD(p.currentPrice)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-white">
                    {fmtUSD(p.currentValue)}
                  </td>
                  <td className={`px-6 py-4 text-right text-sm font-medium ${p.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {p.unrealizedPnl >= 0 ? '+' : ''}{fmtUSD(p.unrealizedPnl)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={p.unrealizedPnlPct >= 0 ? 'badge-green' : 'badge-red'}>
                      {fmtPct(p.unrealizedPnlPct)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
