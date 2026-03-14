import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Exchange, PortfolioSummary, Position } from '../types';
import { fmtUSD, fmtPct, timeAgo } from '../utils/format';

export default function Dashboard() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [topPositions, setTopPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.positions.summary(),
      api.exchanges.list(),
      api.positions.list(),
    ]).then(([s, e, p]) => {
      setSummary(s);
      setExchanges(e);
      setTopPositions(p.sort((a, b) => b.currentValue - a.currentValue).slice(0, 5));
      setLoading(false);
    });
  }, []);

  const connectedCount = exchanges.filter(e => e.connected).length;

  if (loading) return <PageLoader />;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Portfolio Overview</h1>
        <p className="text-gray-400 mt-1">Your crypto holdings across all connected exchanges</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Portfolio Value"
          value={fmtUSD(summary?.totalValue ?? 0)}
          subValue={
            summary ? (
              <span className={summary.totalUnrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {fmtPct(summary.totalUnrealizedPnlPct)} all time
              </span>
            ) : null
          }
          accent="brand"
        />
        <StatCard
          label="Unrealized P&L"
          value={fmtUSD(summary?.totalUnrealizedPnl ?? 0)}
          subValue={
            summary ? (
              <span className="text-gray-500">
                Cost basis: {fmtUSD(summary.totalCostBasis)}
              </span>
            ) : null
          }
          accent={summary && summary.totalUnrealizedPnl >= 0 ? 'green' : 'red'}
        />
        <StatCard
          label="Connected Exchanges"
          value={`${connectedCount} / ${exchanges.length}`}
          subValue={<span className="text-gray-500">{exchanges.filter(e => !e.connected).length} available to connect</span>}
          accent="purple"
        />
        <StatCard
          label="Open Positions"
          value={String(summary?.positionCount ?? 0)}
          subValue={<span className="text-gray-500">across {connectedCount} exchange{connectedCount !== 1 ? 's' : ''}</span>}
          accent="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top positions */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white">Top Holdings</h2>
            <Link to="/positions" className="text-brand-400 text-sm hover:text-brand-300">View all</Link>
          </div>
          <div className="space-y-3">
            {topPositions.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
                    {p.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{p.asset}</p>
                    <p className="text-xs text-gray-500">{p.exchangeName} · {p.quantity.toFixed(p.quantity < 1 ? 4 : 2)} {p.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{fmtUSD(p.currentValue)}</p>
                  <p className={`text-xs ${p.unrealizedPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmtPct(p.unrealizedPnlPct)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exchange status */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white">Exchanges</h2>
            <Link to="/exchanges" className="text-brand-400 text-sm hover:text-brand-300">Manage</Link>
          </div>
          <div className="space-y-3">
            {exchanges.map(ex => (
              <div key={ex.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
                    {ex.logo}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{ex.name}</p>
                    {ex.connected && ex.lastSync && (
                      <p className="text-xs text-gray-500">Synced {timeAgo(ex.lastSync)}</p>
                    )}
                  </div>
                </div>
                {ex.connected ? (
                  <span className="badge-green">Connected</span>
                ) : (
                  <span className="badge-gray">Not connected</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 card">
        <h2 className="font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/taxes" className="btn-primary">Generate Tax Report</Link>
          <Link to="/trades" className="btn-secondary">View Trade History</Link>
          <Link to="/exchanges" className="btn-secondary">Connect Exchange</Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
  accent,
}: {
  label: string;
  value: string;
  subValue?: React.ReactNode;
  accent: 'brand' | 'green' | 'red' | 'purple' | 'orange';
}) {
  const accentMap = {
    brand: 'border-brand-500/30 bg-brand-500/5',
    green: 'border-emerald-500/30 bg-emerald-500/5',
    red: 'border-red-500/30 bg-red-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
    orange: 'border-orange-500/30 bg-orange-500/5',
  };

  return (
    <div className={`card border ${accentMap[accent]}`}>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subValue && <div className="mt-1 text-xs">{subValue}</div>}
    </div>
  );
}

function PageLoader() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 bg-gray-800 rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-800 rounded-xl" />)}
        </div>
        <div className="h-72 bg-gray-800 rounded-xl" />
      </div>
    </div>
  );
}
