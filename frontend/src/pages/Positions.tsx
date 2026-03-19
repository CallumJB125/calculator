import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { Exchange, Position, PortfolioSummary, TaxPreview } from '../types';
import { fmtUSD, fmtPct, fmtDate } from '../utils/format';

type PositionTab = 'spot' | 'leverage';

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
                    <p className="text-sm font-semibold text-emerald-400">
                      {preview.longTermGain >= 0 ? '+' : ''}{fmtUSD(preview.longTermGain)}
                    </p>
                  </div>
                </div>
              )}

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

// ─── Broker Breakdown Modal ────────────────────────────────────────────────────

function BrokerBreakdownModal({
  symbol,
  asset,
  positions,
  onPreview,
  onClose,
}: {
  symbol: string;
  asset: string;
  positions: Position[];
  onPreview: (symbol: string) => void;
  onClose: () => void;
}) {
  const totalValue = positions.reduce((s, p) => s + p.currentValue, 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-bold text-white">{asset} — Broker Breakdown</h2>
            <p className="text-xs text-gray-500 mt-0.5">How your {symbol} is allocated across connected brokers</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-3">
          {positions.map(p => {
            const sharePct = totalValue > 0 ? (p.currentValue / totalValue) * 100 : 0;
            return (
              <div key={p.id} className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                      {p.exchangeName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{p.exchangeName}</p>
                      <p className="text-xs text-gray-500">{sharePct.toFixed(1)}% of your {symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{fmtUSD(p.currentValue)}</p>
                    <p className={`text-xs font-medium ${p.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.unrealizedPnl >= 0 ? '+' : ''}{fmtUSD(p.unrealizedPnl)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-gray-500 mb-0.5">Holdings</p>
                    <p className="text-white">{p.quantity < 1 ? p.quantity.toFixed(4) : p.quantity.toFixed(2)} {p.symbol}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-0.5">Avg Cost</p>
                    <p className="text-white">{fmtUSD(p.avgCostBasis)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-0.5">Return</p>
                    <p className={p.unrealizedPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {fmtPct(p.unrealizedPnlPct)}
                    </p>
                  </div>
                </div>
                {/* allocation bar */}
                <div className="mt-3 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${sharePct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-6 pb-5">
          <button
            onClick={() => { onClose(); onPreview(symbol); }}
            className="w-full btn-primary py-2.5 text-sm"
          >
            Preview Tax Impact if I Sell
          </button>
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
  const [tab, setTab] = useState<PositionTab>('spot');
  const [loading, setLoading] = useState(true);
  const [previewSymbol, setPreviewSymbol] = useState<string | null>(null);
  const [brokerSymbol, setBrokerSymbol] = useState<string | null>(null);

  // Simulated live price drift (±0.5% per tick)
  const [priceTick, setPriceTick] = useState(0);
  const tickRef = useRef(0);

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

  // Real-time price simulation: nudge prices every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      setPriceTick(t => t + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Apply simulated live drift to positions
  const livePositions = positions.map(p => {
    if (p.symbol === 'USDC') return p;
    // deterministic drift based on tick + symbol seed
    const seed = p.symbol.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const drift = Math.sin(tickRef.current * 0.4 + seed) * 0.003; // ±0.3%
    const livePrice = parseFloat((p.currentPrice * (1 + drift)).toFixed(2));
    const liveValue = parseFloat((p.quantity * livePrice).toFixed(2));
    const livePnl = parseFloat((liveValue - p.avgCostBasis * p.quantity).toFixed(2));
    const livePnlPct = parseFloat(((livePnl / (p.avgCostBasis * p.quantity)) * 100).toFixed(2));
    return { ...p, currentPrice: livePrice, currentValue: liveValue, unrealizedPnl: livePnl, unrealizedPnlPct: livePnlPct };
  });

  // Split: spot vs leverage (positions with funding fees = leverage/perpetual)
  const spotPositions = livePositions.filter(p => !(p.totalFundingFeesPaid && p.totalFundingFeesPaid > 0));
  const leveragePositions = livePositions.filter(p => p.totalFundingFeesPaid && p.totalFundingFeesPaid > 0);
  const activePositions = tab === 'spot' ? spotPositions : leveragePositions;

  // Consolidate: merge same asset across brokers
  const consolidatedMap = new Map<string, { asset: string; symbol: string; positions: Position[] }>();
  for (const p of activePositions) {
    if (!consolidatedMap.has(p.symbol)) {
      consolidatedMap.set(p.symbol, { asset: p.asset, symbol: p.symbol, positions: [] });
    }
    consolidatedMap.get(p.symbol)!.positions.push(p);
  }
  const consolidated = [...consolidatedMap.values()].map(group => {
    const totalQty = group.positions.reduce((s, p) => s + p.quantity, 0);
    const totalValue = group.positions.reduce((s, p) => s + p.currentValue, 0);
    const totalCost = group.positions.reduce((s, p) => s + p.avgCostBasis * p.quantity, 0);
    const totalPnl = group.positions.reduce((s, p) => s + p.unrealizedPnl, 0);
    const totalFunding = group.positions.reduce((s, p) => s + (p.totalFundingFeesPaid ?? 0), 0);
    const pnlPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
    const currentPrice = group.positions[0].currentPrice;
    const brokerCount = group.positions.length;
    return {
      asset: group.asset,
      symbol: group.symbol,
      positions: group.positions,
      totalQty,
      totalValue,
      totalCost,
      totalPnl,
      totalFunding,
      pnlPct,
      currentPrice,
      brokerCount,
    };
  }).sort((a, b) => b.totalValue - a.totalValue);

  // Live summary totals
  const liveTotalValue = livePositions.reduce((s, p) => s + p.currentValue, 0);
  const liveTotalPnl = livePositions.reduce((s, p) => s + p.unrealizedPnl, 0);
  const liveTotalCost = livePositions.reduce((s, p) => s + p.avgCostBasis * p.quantity, 0);
  const liveReturnPct = liveTotalCost > 0 ? ((liveTotalValue - liveTotalCost) / liveTotalCost) * 100 : 0;
  const liveFunding = livePositions.reduce((s, p) => s + (p.totalFundingFeesPaid ?? 0), 0);

  const brokerEntry = brokerSymbol ? consolidatedMap.get(brokerSymbol) : null;

  if (loading) return <div className="p-8 text-gray-400">Loading positions...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {previewSymbol && (
        <TaxPreviewModal symbol={previewSymbol} onClose={() => setPreviewSymbol(null)} />
      )}
      {brokerEntry && (
        <BrokerBreakdownModal
          symbol={brokerEntry.symbol}
          asset={brokerEntry.asset}
          positions={brokerEntry.positions}
          onPreview={sym => setPreviewSymbol(sym)}
          onClose={() => setBrokerSymbol(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Open Positions</h1>
          <p className="text-gray-400 mt-1">Live P&L across all connected exchanges</p>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">Live</span>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Value</p>
          <p className="text-xl font-bold text-white">{fmtUSD(liveTotalValue)}</p>
          <p className="text-xs text-gray-600 mt-1">{livePositions.filter(p => p.symbol !== 'USDC').length} assets</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Unrealized P&L</p>
          <p className={`text-xl font-bold ${liveTotalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {liveTotalPnl >= 0 ? '+' : ''}{fmtUSD(liveTotalPnl)}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Return</p>
          <p className={`text-xl font-bold ${liveReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmtPct(liveReturnPct)}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Funding Fees Paid</p>
          <p className="text-xl font-bold text-yellow-400">{fmtUSD(liveFunding)}</p>
          <p className="text-xs text-gray-600 mt-1">Tax deductible</p>
        </div>
      </div>

      {/* Spot / Leverage Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-gray-800/50 p-1 rounded-xl w-fit border border-gray-700">
        <button
          onClick={() => setTab('spot')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'spot'
              ? 'bg-brand-600 text-white shadow'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Spot
          <span className="ml-2 text-xs opacity-70">{spotPositions.length > 0 ? consolidatedMap.size - [...consolidatedMap.values()].filter(g => g.positions.every(p => p.totalFundingFeesPaid && p.totalFundingFeesPaid > 0)).length : 0}</span>
        </button>
        <button
          onClick={() => setTab('leverage')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'leverage'
              ? 'bg-orange-600 text-white shadow'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Leverage / Perp
          <span className="ml-2 text-xs opacity-70">{leveragePositions.length}</span>
        </button>
      </div>

      {tab === 'leverage' && (
        <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <p className="text-xs text-orange-400">
            <strong>Leveraged / Perpetual Positions</strong> — these positions accrue funding fees every 8 hours.
            Funding fees paid are tax-deductible as investment expenses. Track them on the Funding Fees page.
          </p>
        </div>
      )}

      {/* Positions Table */}
      {consolidated.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-400 font-medium">No {tab} positions found</p>
          <p className="text-sm text-gray-600 mt-1">
            {tab === 'leverage'
              ? 'No perpetual/leveraged positions detected. Open a perp on a connected exchange.'
              : 'No spot positions found across your connected exchanges.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Asset</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Holdings</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Live Price</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Value</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">P&L</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Return</th>
                  {tab === 'leverage' && (
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Funding Fees</th>
                  )}
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Brokers</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Tax Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {consolidated.map(row => (
                  <tr key={row.symbol} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
                          {row.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{row.asset}</p>
                          <p className="text-xs text-gray-500">{row.symbol}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm text-white">
                        {row.totalQty < 1 ? row.totalQty.toFixed(4) : row.totalQty.toFixed(2)} {row.symbol}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-white font-medium">
                      {fmtUSD(row.currentPrice)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-white">
                      {fmtUSD(row.totalValue)}
                    </td>
                    <td className={`px-6 py-4 text-right text-sm font-semibold ${row.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {row.totalPnl >= 0 ? '+' : ''}{fmtUSD(row.totalPnl)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={row.pnlPct >= 0 ? 'badge-green' : 'badge-red'}>
                        {fmtPct(row.pnlPct)}
                      </span>
                    </td>
                    {tab === 'leverage' && (
                      <td className="px-6 py-4 text-right">
                        {row.totalFunding > 0 ? (
                          <span className="text-sm text-yellow-400">{fmtUSD(row.totalFunding)}</span>
                        ) : (
                          <span className="text-sm text-gray-600">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setBrokerSymbol(row.symbol)}
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600 hover:text-white transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {row.brokerCount} broker{row.brokerCount > 1 ? 's' : ''}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.symbol !== 'USDC' && (
                        <button
                          onClick={() => setPreviewSymbol(row.symbol)}
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
      )}

      {/* Connected brokers strip */}
      {exchanges.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <p className="text-xs text-gray-600">Running on:</p>
          {exchanges.map(e => (
            <span key={e.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {e.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
