import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { Exchange, Position, PortfolioSummary, TaxPreview } from '../types';
import { fmtUSD, fmtPct, fmtDate } from '../utils/format';

type ViewMode = 'by-exchange' | 'consolidated';

// ─── Tax Preview Modal ────────────────────────────────────────────────────────

function TaxPreviewModal({ symbol, onClose }: { symbol: string; onClose: () => void }) {
  const [qty, setQty] = useState('');
  const [method, setMethod] = useState<'fifo' | 'lifo' | 'hifo'>('fifo');
  const [preview, setPreview] = useState<TaxPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const calculate = useCallback(() => {
    const q = parseFloat(qty);
    if (isNaN(q) || q <= 0) { setError('Enter a valid quantity.'); return; }
    setError('');
    setLoading(true);
    api.taxpreview.calculate(symbol, q, method)
      .then(p => { setPreview(p); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [symbol, qty, method]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-bold text-white">What If I Sell? — {symbol}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Instant tax impact preview before you trade</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {/* Inputs */}
          <div className="flex gap-3 mb-5">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1.5">Quantity to Sell</label>
              <input
                type="number" min="0" step="any"
                className="input w-full"
                placeholder={`e.g. 0.5 ${symbol}`}
                value={qty}
                onChange={e => { setQty(e.target.value); setPreview(null); }}
                onKeyDown={e => e.key === 'Enter' && calculate()}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Cost Basis Method</label>
              <select className="select" value={method} onChange={e => { setMethod(e.target.value as typeof method); setPreview(null); }}>
                <option value="fifo">FIFO</option>
                <option value="lifo">LIFO</option>
                <option value="hifo">HIFO</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={calculate} disabled={loading} className="btn-primary py-2.5 px-5 disabled:opacity-50">
                {loading ? '...' : 'Preview'}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

          {preview && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="card text-center p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Proceeds</p>
                  <p className="text-lg font-bold text-white">{fmtUSD(preview.proceeds)}</p>
                </div>
                <div className="card text-center p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Gain / Loss</p>
                  <p className={`text-lg font-bold ${preview.gain >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {preview.gain >= 0 ? '+' : ''}{fmtUSD(preview.gain)}
                  </p>
                </div>
                <div className="card text-center p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Est. Tax Owed</p>
                  <p className="text-lg font-bold text-yellow-400">{fmtUSD(preview.estimatedTax)}</p>
                  <p className="text-xs text-gray-600">{preview.taxCostPct}% of proceeds</p>
                </div>
              </div>

              {/* Short/long split */}
              {(preview.shortTermGain !== 0 || preview.longTermGain !== 0) && (
                <div className="flex gap-3 mb-5">
                  <div className="flex-1 card p-3 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">Short-Term Gain (37%)</p>
                    <p className={`text-sm font-semibold ${preview.shortTermGain >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {preview.shortTermGain >= 0 ? '+' : ''}{fmtUSD(preview.shortTermGain)}
                    </p>
                  </div>
                  <div className="flex-1 card p-3 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">Long-Term Gain (20%)</p>
                    <p className={`text-sm font-semibold ${preview.longTermGain >= 0 ? 'text-emerald-400' : 'text-emerald-400'}`}>
                      {preview.longTermGain >= 0 ? '+' : ''}{fmtUSD(preview.longTermGain)}
                    </p>
                  </div>
                </div>
              )}

              {/* Wait-for-long-term insight */}
              {preview.insight && (
                <div className="mb-5 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-lg flex gap-3">
                  <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-emerald-400">Save ~{fmtUSD(preview.insight.potentialSavings)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{preview.insight.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Long-term threshold: <strong className="text-gray-300">{fmtDate(preview.insight.flipDate)}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Lot breakdown */}
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Lot Breakdown ({preview.method.toUpperCase()})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-800">
                      {['Buy Date', 'Qty', 'Cost/Unit', 'Proceeds', 'Gain', 'Days', 'Term', 'Tax'].map(h => (
                        <th key={h} className="text-left text-gray-500 pb-2 pr-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {preview.lots.map((lot, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pr-3 text-gray-300">{fmtDate(lot.buyDate)}</td>
                        <td className="py-1.5 pr-3 text-white">{lot.quantity < 1 ? lot.quantity.toFixed(4) : lot.quantity.toFixed(2)}</td>
                        <td className="py-1.5 pr-3 text-gray-300">{fmtUSD(lot.costPerUnit)}</td>
                        <td className="py-1.5 pr-3 text-gray-300">{fmtUSD(lot.proceeds)}</td>
                        <td className={`py-1.5 pr-3 font-medium ${lot.gain >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {lot.gain >= 0 ? '+' : ''}{fmtUSD(lot.gain)}
                        </td>
                        <td className="py-1.5 pr-3 text-gray-400">{lot.daysHeld}d</td>
                        <td className="py-1.5 pr-3">
                          <span className={lot.termType === 'long' ? 'badge-green' : 'badge-red'}>{lot.termType}</span>
                          {lot.termType === 'short' && lot.daysUntilLongTerm > 0 && (
                            <span className="block text-yellow-500 text-xs mt-0.5">{lot.daysUntilLongTerm}d to LT</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-3 text-yellow-400">{fmtUSD(lot.estimatedTax)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Positions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [filterExchange, setFilterExchange] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('by-exchange');
  const [loading, setLoading] = useState(true);
  const [previewSymbol, setPreviewSymbol] = useState<string | null>(null);

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
      {previewSymbol && (
        <TaxPreviewModal symbol={previewSymbol} onClose={() => setPreviewSymbol(null)} />
      )}
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
        <ByExchangeTable positions={sorted} onPreview={setPreviewSymbol} />
      ) : (
        <ConsolidatedTable summary={summary} />
      )}
    </div>
  );
}

// ─── By Exchange Table ────────────────────────────────────────────────────────

function ByExchangeTable({ positions, onPreview }: {
  positions: Position[];
  onPreview: (symbol: string) => void;
}) {
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
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Tax Preview</th>
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
                <td className="px-6 py-4 text-center">
                  {p.symbol !== 'USDC' && (
                    <button
                      onClick={() => onPreview(p.symbol)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-brand-600/20 text-brand-400 border border-brand-500/20 hover:bg-brand-600/30 transition-colors whitespace-nowrap"
                    >
                      $ Preview
                    </button>
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
