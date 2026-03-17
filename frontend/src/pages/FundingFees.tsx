import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FundingFeeSummary } from '../types';
import { fmtUSD, fmtDate } from '../utils/format';

export default function FundingFees() {
  const [summary, setSummary] = useState<FundingFeeSummary | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [filterSymbol, setFilterSymbol] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  useEffect(() => {
    api.funding.years().then(y => {
      setYears(y);
      if (y.length > 0) setSelectedYear(y[0]);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    api.funding.summary(selectedYear).then(s => {
      setSummary(s);
      setLoading(false);
    });
  }, [selectedYear]);

  const filteredFees = summary
    ? summary.fees.filter(f =>
        !filterSymbol || f.symbol === filterSymbol.toUpperCase()
      )
    : [];

  const totalPages = Math.ceil(filteredFees.length / PAGE_SIZE);
  const paginated = filteredFees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const availableSymbols = summary
    ? [...new Set(summary.fees.map(f => f.symbol))].sort()
    : [];

  if (loading) return <div className="p-8 text-gray-400">Loading funding fees...</div>;
  if (!summary) return <div className="p-8 text-gray-400">No funding fee data.</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Funding Fees</h1>
          <p className="text-gray-400 mt-1">Perpetual funding payments — paid fees are tax deductible</p>
        </div>
        <div className="flex gap-3">
          <select
            className="select"
            value={selectedYear ?? ''}
            onChange={e => setSelectedYear(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            className="select"
            value={filterSymbol}
            onChange={e => { setFilterSymbol(e.target.value); setPage(1); }}
          >
            <option value="">All Assets</option>
            {availableSymbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Paid</p>
          <p className="text-xl font-bold text-red-400">{fmtUSD(summary.totalFeesPaid)}</p>
          <p className="text-xs text-gray-600 mt-1">Tax deductible</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Received</p>
          <p className="text-xl font-bold text-emerald-400">{fmtUSD(summary.totalFeesReceived)}</p>
          <p className="text-xs text-gray-600 mt-1">Taxable income</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Net Fees</p>
          <p className={`text-xl font-bold ${summary.netFees >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {fmtUSD(summary.netFees)}
          </p>
          <p className="text-xs text-gray-600 mt-1">Paid minus received</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Deductible Amount</p>
          <p className="text-xl font-bold text-yellow-400">{fmtUSD(summary.totalFeesPaid)}</p>
          <p className="text-xs text-gray-600 mt-1">Flows into Tax Report</p>
        </div>
      </div>

      {/* Tax info banner */}
      <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-sm text-yellow-400">
          <strong>Tax Note:</strong> Funding fees you <em>pay</em> on perpetual positions are deductible as investment expenses
          (IRC §212). The total deductible amount for {selectedYear ?? 'all years'} ({fmtUSD(summary.totalFeesPaid)}) is automatically
          included in your Tax Report to reduce your net taxable gain.
        </p>
      </div>

      {/* Per-asset breakdown */}
      {Object.keys(summary.byAsset).length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-white mb-3">By Asset</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(summary.byAsset).map(([symbol, data]) => (
              <div key={symbol} className="card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
                    {symbol.slice(0, 2)}
                  </div>
                  <p className="font-medium text-white">{symbol}</p>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Paid</span>
                    <span className="text-red-400">{fmtUSD(data.paid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Received</span>
                    <span className="text-emerald-400">{fmtUSD(data.received)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-800 pt-1.5 font-medium">
                    <span className="text-gray-400">Net</span>
                    <span className={data.net >= 0 ? 'text-red-400' : 'text-emerald-400'}>
                      {fmtUSD(data.net)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fees table */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-white">
          Funding Events ({filteredFees.length})
        </h2>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Date', 'Exchange', 'Asset', 'Position Size', 'Rate', 'Amount', 'Type'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-500">
                    No funding fee events found
                  </td>
                </tr>
              ) : (
                paginated.map(fee => (
                  <tr key={fee.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-300 whitespace-nowrap">{fmtDate(fee.date)}</td>
                    <td className="px-5 py-3 text-sm text-gray-400">{fee.exchangeName}</td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium text-white">{fee.symbol}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-300">{fmtUSD(fee.positionSize)}</td>
                    <td className="px-5 py-3 text-sm text-gray-400">{(fee.rate * 100).toFixed(4)}%</td>
                    <td className={`px-5 py-3 text-sm font-medium ${fee.amount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {fee.amount > 0 ? '-' : '+'}{fmtUSD(Math.abs(fee.amount))}
                    </td>
                    <td className="px-5 py-3">
                      <span className={fee.amount > 0
                        ? 'badge-red'
                        : 'badge-green'
                      }>
                        {fee.amount > 0 ? 'Paid' : 'Received'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredFees.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-700 bg-gray-900/50">
                  <td colSpan={5} className="px-5 py-3 text-sm font-semibold text-gray-400">Total</td>
                  <td className={`px-5 py-3 text-sm font-bold ${
                    filteredFees.reduce((s, f) => s + f.amount, 0) >= 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {fmtUSD(Math.abs(filteredFees.reduce((s, f) => s + f.amount, 0)))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredFees.length)} of {filteredFees.length}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="btn-secondary disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="btn-secondary disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
