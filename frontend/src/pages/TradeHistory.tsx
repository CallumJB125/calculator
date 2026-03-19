import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Trade, TradesResponse, TradesSummary, Exchange } from '../types';
import { fmtUSD, fmtDateTime } from '../utils/format';

export default function TradeHistory() {
  const [data, setData] = useState<TradesResponse | null>(null);
  const [summary, setSummary] = useState<TradesSummary | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [filters, setFilters] = useState({
    exchange: '',
    asset: '',
    type: '',
    year: '',
    page: 1,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.trades.summary(),
      api.exchanges.list(),
    ]).then(([s, e]) => {
      setSummary(s);
      setExchanges(e);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    api.trades
      .list({
        exchange: filters.exchange || undefined,
        asset: filters.asset || undefined,
        type: filters.type || undefined,
        year: filters.year ? Number(filters.year) : undefined,
        page: filters.page,
        limit: 20,
      })
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, [filters]);

  const setFilter = (key: keyof typeof filters, value: string | number) =>
    setFilters(f => ({ ...f, [key]: value, page: key !== 'page' ? 1 : f.page }));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Trade History</h1>
        <p className="text-gray-400 mt-1">All trades across connected exchanges — used for tax calculations</p>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="card text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Trades</p>
            <p className="text-xl font-bold text-white">{summary.totalTrades}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Buys</p>
            <p className="text-xl font-bold text-emerald-400">{summary.buyCount}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Sells</p>
            <p className="text-xl font-bold text-red-400">{summary.sellCount}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Bought</p>
            <p className="text-xl font-bold text-white">{fmtUSD(summary.totalBuys)}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Fees</p>
            <p className="text-xl font-bold text-yellow-400">{fmtUSD(summary.totalFees)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6 p-4">
        <div className="flex flex-wrap gap-3">
          <select className="select flex-1 min-w-[140px]" value={filters.exchange} onChange={e => setFilter('exchange', e.target.value)}>
            <option value="">All Exchanges</option>
            {exchanges.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select className="select flex-1 min-w-[120px]" value={filters.type} onChange={e => setFilter('type', e.target.value)}>
            <option value="">All Types</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <select className="select flex-1 min-w-[100px]" value={filters.year} onChange={e => setFilter('year', e.target.value)}>
            <option value="">All Years</option>
            {summary?.availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <input
            type="text"
            className="input flex-1 min-w-[120px]"
            placeholder="Asset (e.g. BTC)"
            value={filters.asset}
            onChange={e => setFilter('asset', e.target.value.toUpperCase())}
          />
          {(filters.exchange || filters.type || filters.year || filters.asset) && (
            <button
              className="btn-secondary"
              onClick={() => setFilters({ exchange: '', asset: '', type: '', year: '', page: 1 })}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Date', 'Exchange', 'Type', 'Asset', 'Quantity', 'Price', 'Total', 'Fee'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : data?.trades.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-500">No trades found</td></tr>
              ) : (
                data?.trades.map((trade: Trade) => (
                  <tr key={trade.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-300 whitespace-nowrap">{fmtDateTime(trade.date)}</td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-gray-300">{trade.exchangeName}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={trade.type === 'buy' ? 'badge-green' : 'badge-red'}>
                        {trade.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-white">{trade.symbol}</td>
                    <td className="px-5 py-3 text-sm text-gray-300">
                      {trade.quantity < 1 ? trade.quantity.toFixed(4) : trade.quantity.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-300">{fmtUSD(trade.price)}</td>
                    <td className="px-5 py-3 text-sm font-medium text-white">{fmtUSD(trade.totalValue)}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{fmtUSD(trade.fee)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(data.page - 1) * data.limit + 1}–{Math.min(data.page * data.limit, data.total)} of {data.total} trades
            </p>
            <div className="flex gap-2">
              <button
                className="btn-secondary"
                disabled={data.page <= 1}
                onClick={() => setFilter('page', data.page - 1)}
              >
                Previous
              </button>
              <button
                className="btn-secondary"
                disabled={data.page >= data.totalPages}
                onClick={() => setFilter('page', data.page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
