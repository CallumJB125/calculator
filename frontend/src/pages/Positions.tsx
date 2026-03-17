import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Exchange, Position, PortfolioSummary } from '../types';
import { fmtUSD, fmtPct } from '../utils/format';

type ViewMode = 'by-exchange' | 'consolidated';

export default function Positions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [filterExchange, setFilterExchange] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('by-exchange');
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
        <div className="flex gap-3">
          {/* View Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            <button
              onClick={() => setViewMode('by-exchange')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'by-exchange'
                  ? 'bg-brand-600/30 text-brand-300 border-r border-brand-500/30'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200 border-r border-gray-700'
              }`}
            >
              By Exchange
            </button>
            <button
              onClick={() => setViewMode('consolidated')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'consolidated'
                  ? 'bg-brand-600/30 text-brand-300'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              Consolidated
            </button>
          </div>

          {viewMode === 'by-exchange' && (
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
          )}
        </div>
      </div>

      {/* Summary strip */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="card text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Value</p>
            <p className="text-xl font-bold text-white">{fmtUSD(summary.totalValue)}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Cost Basis</p>
            <p className="text-xl font-bold text-white">{fmtUSD(summary.totalCostBasis)}</p>
            <p className="text-xs text-gray-600 mt-1">Across all exchanges</p>
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
          <div className="card text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Funding Fees Paid</p>
            <p className="text-xl font-bold text-yellow-400">{fmtUSD(summary.totalFundingFeesPaid)}</p>
            <p className="text-xs text-gray-600 mt-1">Tax deductible</p>
          </div>
        </div>
      )}

      {viewMode === 'by-exchange' ? (
        <ByExchangeTable positions={sorted} />
      ) : (
        <ConsolidatedTable summary={summary} />
      )}
    </div>
  );
}

// ─── By Exchange Table ────────────────────────────────────────────────────────

function ByExchangeTable({ positions }: { positions: Position[] }) {
  return (
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
              <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Funding Fees</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {positions.map(p => (
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
                <td className="px-6 py-4 text-right">
                  {(p.totalFundingFeesPaid ?? 0) > 0 ? (
                    <span className="text-sm text-yellow-400">{fmtUSD(p.totalFundingFeesPaid ?? 0)}</span>
                  ) : (
                    <span className="text-sm text-gray-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Consolidated Table ───────────────────────────────────────────────────────

function ConsolidatedTable({ summary }: { summary: PortfolioSummary | null }) {
  if (!summary) return null;

  const rows = Object.entries(summary.byAsset)
    .map(([symbol, data]) => ({ symbol, ...data }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-xs text-blue-400">
          <strong>Consolidated View</strong> — holdings in the same asset are merged across all exchanges.
          The <em>Avg Cost Basis</em> shown is a weighted average across brokers
          (total cost ÷ total quantity).
        </p>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Asset</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Total Holdings</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Total Cost Basis</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Wtd. Avg Cost</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Current Price</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Total Value</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Unrealized P&L</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Funding Fees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rows.map(row => {
                const pnlPct = row.totalCost > 0
                  ? ((row.value - row.totalCost) / row.totalCost) * 100
                  : 0;
                return (
                  <tr key={row.symbol} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
                          {row.symbol.slice(0, 2)}
                        </div>
                        <p className="text-sm font-medium text-white">{row.symbol}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-white">
                      {row.totalQty < 1 ? row.totalQty.toFixed(4) : row.totalQty.toFixed(2)} {row.symbol}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-300">
                      {fmtUSD(row.totalCost)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-300">
                      {fmtUSD(row.avgCostBasis)}
                      <p className="text-xs text-gray-600">per {row.symbol}</p>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-white">
                      {fmtUSD(row.currentPrice)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-white">
                      {fmtUSD(row.value)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className={`text-sm font-medium ${row.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {row.pnl >= 0 ? '+' : ''}{fmtUSD(row.pnl)}
                      </p>
                      <p className={`text-xs ${pnlPct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {fmtPct(pnlPct)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {row.fundingFeesPaid > 0 ? (
                        <span className="text-sm text-yellow-400">{fmtUSD(row.fundingFeesPaid)}</span>
                      ) : (
                        <span className="text-sm text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-700 bg-gray-900/50">
                <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-gray-400">Total</td>
                <td className="px-6 py-3 text-right text-sm font-semibold text-gray-300">
                  {fmtUSD(rows.reduce((s, r) => s + r.totalCost, 0))}
                </td>
                <td />
                <td />
                <td className="px-6 py-3 text-right text-sm font-semibold text-white">
                  {fmtUSD(rows.reduce((s, r) => s + r.value, 0))}
                </td>
                <td className={`px-6 py-3 text-right text-sm font-bold ${
                  rows.reduce((s, r) => s + r.pnl, 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {fmtUSD(rows.reduce((s, r) => s + r.pnl, 0))}
                </td>
                <td className="px-6 py-3 text-right text-sm font-semibold text-yellow-400">
                  {fmtUSD(rows.reduce((s, r) => s + r.fundingFeesPaid, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
