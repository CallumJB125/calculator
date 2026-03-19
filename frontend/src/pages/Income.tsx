import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StakingIncomeSummary, StakingReward } from '../types';
import { fmtUSD } from '../utils/format';

const PAGE_SIZE = 20;

export default function Income() {
  const [data, setData] = useState<StakingIncomeSummary | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterSymbol, setFilterSymbol] = useState('');

  useEffect(() => {
    api.income.years().then(y => {
      setYears(y);
      if (y.length > 0) setSelectedYear(y[0]);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    api.income.staking(selectedYear).then(d => {
      setData(d);
      setLoading(false);
    });
  }, [selectedYear]);

  const filteredRewards: StakingReward[] = (data?.rewards ?? [])
    .filter(r => !filterSymbol || r.symbol === filterSymbol)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.ceil(filteredRewards.length / PAGE_SIZE);
  const pageRewards = filteredRewards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const symbols = data ? Object.keys(data.byAsset) : [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Staking &amp; Yield Income</h1>
          <p className="text-gray-400 mt-1">Staking rewards are ordinary income taxed at your marginal rate</p>
        </div>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading && <div className="p-8 text-gray-400">Loading staking income...</div>}

      {!loading && data && (
        <>
          {/* Tax notice */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-300">Staking Income is Taxable as Ordinary Income (IRS Notice 2023-27)</p>
              <p className="text-xs text-amber-400/80 mt-1">
                Each staking reward is taxed at fair market value on the date received. This income is reported on Schedule 1, Line 8z.
                The cost basis of the received tokens is the FMV at receipt — important when you later sell those tokens.
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Income {selectedYear}</p>
              <p className="text-xl font-bold text-white">{fmtUSD(data.totalIncomeUSD)}</p>
              <p className="text-xs text-gray-600 mt-1">Ordinary income</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Estimated Tax (37%)</p>
              <p className="text-xl font-bold text-red-400">{fmtUSD(data.estimatedTax)}</p>
              <p className="text-xs text-gray-600 mt-1">Top marginal rate</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reward Events</p>
              <p className="text-xl font-bold text-white">{data.rewards.length}</p>
              <p className="text-xs text-gray-600 mt-1">Total receipts this year</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Assets Staking</p>
              <p className="text-xl font-bold text-white">{Object.keys(data.byAsset).length}</p>
              <p className="text-xs text-gray-600 mt-1">Across {Object.keys(data.byExchange).length} exchange{Object.keys(data.byExchange).length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Per-Asset Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {Object.entries(data.byAsset).map(([sym, a]) => {
              const ex = Object.entries(data.byExchange).find(([, v]) => v.valueUSD === a.valueUSD)?.[0] ?? '';
              return (
                <div key={sym} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-200">
                        {sym.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{sym} Staking</p>
                        <p className="text-xs text-gray-500">{Object.keys(data.byExchange).join(', ')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">{fmtUSD(a.valueUSD)}</p>
                      <p className="text-xs text-gray-500">{a.quantity.toFixed(6)} {sym}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-800 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Avg Price</p>
                      <p className="text-sm font-semibold text-white">{fmtUSD(a.priceAvg)}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Est. Tax</p>
                      <p className="text-sm font-semibold text-red-400">{fmtUSD(a.valueUSD * 0.37)}</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-2">
                      <p className="text-xs text-gray-500">APY</p>
                      <p className="text-sm font-semibold text-emerald-400">
                        {sym === 'ETH' ? '3.5%' : sym === 'SOL' ? '7.0%' : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rewards Table */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Reward History</h2>
              <div className="flex items-center gap-3">
                <select
                  value={filterSymbol}
                  onChange={e => { setFilterSymbol(e.target.value); setPage(1); }}
                  className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="">All Assets</option>
                  {symbols.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="text-xs text-gray-500">{filteredRewards.length} events</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3 pr-4">Date</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3 pr-4">Asset</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3 pr-4">Exchange</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-3 pr-4">Quantity</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-3 pr-4">Price at Receipt</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-3">Income (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRewards.map(r => (
                    <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2.5 pr-4 text-gray-400">
                        {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                            {r.symbol.slice(0, 1)}
                          </div>
                          <span className="text-white font-medium">{r.symbol}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-400">{r.exchangeName}</td>
                      <td className="py-2.5 pr-4 text-right text-emerald-400 font-mono">+{r.quantity.toFixed(6)}</td>
                      <td className="py-2.5 pr-4 text-right text-gray-400 font-mono">{fmtUSD(r.priceAtReceipt)}</td>
                      <td className="py-2.5 text-right text-white font-semibold font-mono">{fmtUSD(r.valueUSD)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-700">
                    <td colSpan={5} className="pt-3 text-xs text-gray-500 font-semibold uppercase">Total (this page)</td>
                    <td className="pt-3 text-right font-bold text-white">
                      {fmtUSD(pageRewards.reduce((s, r) => s + r.valueUSD, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-sm text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-sm text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="card mt-6">
            <h3 className="font-semibold text-white mb-3">Tax Treatment of Staking Rewards</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
              <div>
                <p className="text-gray-400 font-semibold mb-1">At Receipt</p>
                <p>Fair market value of tokens on receipt date = ordinary income. Report on Schedule 1. Withhold taxes accordingly.</p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold mb-1">When You Sell</p>
                <p>Cost basis = FMV at receipt. Sale proceeds minus cost basis = capital gain (short or long term depending on hold period).</p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold mb-1">Record Keeping</p>
                <p>Track each reward's date, quantity, and USD value. CryptoTax Hub generates this data automatically for your accountant.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
