import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { BrokerQuote, ExecutionQuoteResponse, TradableAsset } from '../types';
import { fmtUSD } from '../utils/format';

// ─── Help Guide Modal ────────────────────────────────────────────────────────

const GUIDE_SECTIONS = [
  {
    title: '1. What is Best Execution?',
    body: `Best execution means finding the broker that fills your trade at the best net price — accounting for the spot price on that exchange, estimated market-impact slippage, and trading fees. A broker with lower fees but a worse price may cost more overall.`,
  },
  {
    title: '2. How to Use This Tool',
    body: `① Select the asset you want to trade (BTC, ETH, SOL, ADA).\n② Enter the quantity.\n③ Choose Buy or Sell.\n④ Click "Get Quotes" — connected exchanges are compared instantly.\n⑤ The row marked BEST is the recommended venue. Click any row to see the full fee breakdown.`,
  },
  {
    title: '3. What Each Column Means',
    body: `• Spot Price — the mid-market price on that exchange at this moment.\n• Est. Fill — your likely execution price after market-impact slippage (market order).\n• Slippage — how much the fill deviates from spot (smaller = better).\n• Trading Fee — the taker fee charged on the filled notional.\n• Total Cost / Proceeds — what you actually pay (buy) or receive (sell) after all fees.\n• Net / Unit — total cost divided by quantity; use this to compare apples-to-apples.\n• Funding Rate — the annualised perpetual funding rate. High funding means you pay more to hold the position over time.`,
  },
  {
    title: '4. Connecting a New Broker',
    body: `Go to the Exchanges page → click "Connect" on any listed exchange → enter your API Key and API Secret.\n\nWhere to find your API keys:\n• Coinbase — Advanced Trade → API → New API Key. Permissions needed: "View" + "Trade".\n• Binance — Account → API Management → Create API. Enable "Enable Spot & Margin Trading".\n• Kraken — Settings → API → Add Key. Tick "Query Funds" and "Create & Modify Orders".\n• Gemini — Account → API Settings → Create a New API Key. Scope: "Trading".\n• KuCoin — API Management → Create API. Enable "Trade" permission.\n\nNever enable withdrawal permissions on API keys used here.`,
  },
  {
    title: '5. Funding Fees & Tax',
    body: `Perpetual futures charge a funding fee every 8 hours (4 hours on Kraken). When the rate is positive you pay long holders; when negative you receive it.\n\nFunding fees you pay are deductible as investment expenses. Track them on the Funding Fees page — the annual total flows automatically into your Tax Report.`,
  },
  {
    title: '6. Tips for Large Trades',
    body: `• For orders > $50k, consider splitting across two brokers to reduce slippage.\n• Binance typically has the deepest BTC/ETH liquidity and lowest slippage for large sizes.\n• Limit orders (maker fee) are cheaper but not guaranteed to fill — this tool shows taker (market-order) costs.\n• Always review the "Funding Rate" column if you plan to hold a perpetual position; a 20%+ annualised rate can erode gains quickly.`,
  },
];

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">How to Use Best Execution</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {GUIDE_SECTIONS.map(s => (
            <div key={s.title}>
              <h3 className="text-sm font-semibold text-brand-400 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-800">
          <button onClick={onClose} className="btn-primary w-full">Got it</button>
        </div>
      </div>
    </div>
  );
}

// ─── Recommendation Badge ─────────────────────────────────────────────────────

function RecBadge({ rec }: { rec: BrokerQuote['recommendation'] }) {
  const cls = rec === 'best'
    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
    : rec === 'good'
    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    : 'bg-gray-700 text-gray-400 border border-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${cls}`}>
      {rec}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Execution() {
  const [assets, setAssets] = useState<TradableAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [quantity, setQuantity] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [result, setResult] = useState<ExecutionQuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    api.execution.assets().then(a => {
      setAssets(a.filter(x => x.symbol !== 'USDC'));
    });
  }, []);

  const currentAsset = assets.find(a => a.symbol === selectedAsset);

  function handleGetQuotes() {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity greater than zero.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    api.execution.quotes(selectedAsset, qty, side)
      .then(r => { setResult(r); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }

  const connected = result?.quotes.filter(q => q.available) ?? [];
  const disconnected = result?.quotes.filter(q => !q.available) ?? [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Best Execution</h1>
          <p className="text-gray-400 mt-1">Compare brokers to get the best fill price and lowest total fees</p>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How to Use
        </button>
      </div>

      {/* Trade Input Card */}
      <div className="card mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">Configure Trade</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Asset */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Asset</label>
            <select
              className="select w-full"
              value={selectedAsset}
              onChange={e => { setSelectedAsset(e.target.value); setResult(null); }}
            >
              {assets.map(a => (
                <option key={a.symbol} value={a.symbol}>{a.symbol} — {a.asset}</option>
              ))}
            </select>
            {currentAsset && (
              <p className="text-xs text-gray-600 mt-1">Market: {fmtUSD(currentAsset.currentPrice)}</p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Quantity</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder={`e.g. 0.5 ${selectedAsset}`}
              className="input w-full"
              value={quantity}
              onChange={e => { setQuantity(e.target.value); setResult(null); }}
            />
            {currentAsset && quantity && !isNaN(parseFloat(quantity)) && (
              <p className="text-xs text-gray-600 mt-1">
                ≈ {fmtUSD(parseFloat(quantity) * currentAsset.currentPrice)} notional
              </p>
            )}
          </div>

          {/* Side */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Direction</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-700">
              <button
                onClick={() => { setSide('buy'); setResult(null); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  side === 'buy'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => { setSide('sell'); setResult(null); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  side === 'sell'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                Sell
              </button>
            </div>
          </div>

          {/* Get Quotes */}
          <div>
            <button
              onClick={handleGetQuotes}
              disabled={loading}
              className="btn-primary w-full py-2.5 disabled:opacity-50"
            >
              {loading ? 'Fetching...' : 'Get Quotes'}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-semibold text-white">
              Quotes for {result.quantity} {result.asset} ({result.side.toUpperCase()})
            </h2>
            <span className="text-xs text-gray-500">
              Reference price: {fmtUSD(result.basePrice)}
            </span>
          </div>

          {/* Info banner */}
          <div className="mb-5 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-400">
              <strong>Tip:</strong> "Total Cost" (buy) / "Total Proceeds" (sell) already includes estimated slippage and trading fees.
              The <strong>BEST</strong> broker gives you the lowest cost to buy or highest proceeds on a sell.
              Funding rate matters if you plan to hold a perpetual position overnight.
            </p>
          </div>

          {/* Quotes table */}
          <div className="card overflow-hidden p-0 mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    {[
                      'Exchange', 'Spot Price', 'Est. Fill', 'Slippage', 'Trading Fee',
                      side === 'buy' ? 'Total Cost' : 'Total Proceeds',
                      'Net / Unit', 'Funding Rate (ann.)', 'Verdict',
                    ].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-4 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {connected.map(q => (
                    <>
                      <tr
                        key={q.exchangeId}
                        className={`hover:bg-gray-800/50 transition-colors cursor-pointer ${
                          q.recommendation === 'best' ? 'bg-emerald-500/5' : ''
                        } ${expandedRow === q.exchangeId ? 'bg-gray-800/30' : ''}`}
                        onClick={() => setExpandedRow(expandedRow === q.exchangeId ? null : q.exchangeId)}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
                              {q.exchangeName.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-white">{q.exchangeName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-300">{fmtUSD(q.spotPrice)}</td>
                        <td className="px-5 py-3 text-sm text-white font-medium">{fmtUSD(q.estimatedFillPrice)}</td>
                        <td className={`px-5 py-3 text-sm ${Math.abs(q.slippagePct) < 0.05 ? 'text-emerald-400' : Math.abs(q.slippagePct) < 0.15 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {q.slippagePct > 0 ? '+' : ''}{q.slippagePct.toFixed(3)}%
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-300">
                          {fmtUSD(q.tradingFee)}
                          <span className="text-xs text-gray-500 ml-1">({q.tradingFeePct.toFixed(2)}%)</span>
                        </td>
                        <td className={`px-5 py-3 text-sm font-bold ${
                          q.recommendation === 'best'
                            ? side === 'buy' ? 'text-emerald-400' : 'text-emerald-400'
                            : 'text-white'
                        }`}>
                          {fmtUSD(q.totalCost)}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-300">{fmtUSD(q.netCostPerUnit)}</td>
                        <td className={`px-5 py-3 text-sm ${q.fundingRateAnnualized > 30 ? 'text-red-400' : q.fundingRateAnnualized > 15 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                          {q.fundingRateAnnualized.toFixed(2)}%
                        </td>
                        <td className="px-5 py-3">
                          <RecBadge rec={q.recommendation} />
                        </td>
                      </tr>
                      {expandedRow === q.exchangeId && (
                        <tr key={`${q.exchangeId}-detail`} className="bg-gray-800/20">
                          <td colSpan={9} className="px-5 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-400">
                              <div>
                                <p className="text-gray-500 mb-0.5">Taker Fee Rate</p>
                                <p className="text-white">{q.tradingFeePct.toFixed(3)}%</p>
                              </div>
                              <div>
                                <p className="text-gray-500 mb-0.5">Fill vs Spot Diff</p>
                                <p className="text-white">{fmtUSD(Math.abs(q.estimatedFillPrice - q.spotPrice))}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 mb-0.5">Funding Rate (8h)</p>
                                <p className="text-white">{(q.fundingRate * 100).toFixed(4)}%</p>
                              </div>
                              <div>
                                <p className="text-gray-500 mb-0.5">Est. Daily Funding Cost</p>
                                <p className="text-white">
                                  {fmtUSD(q.estimatedFillPrice * result.quantity * q.fundingRate * 3)}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Disconnected brokers */}
          {disconnected.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Not Connected — Potential Venues</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {disconnected.map(q => (
                  <div key={q.exchangeId} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400">
                        {q.exchangeName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-gray-300">{q.exchangeName}</p>
                        <p className="text-xs text-gray-500">Taker: {(q.tradingFeePct).toFixed(2)}% · Funding: {q.fundingRateAnnualized.toFixed(1)}% ann.</p>
                      </div>
                    </div>
                    <a
                      href="/exchanges"
                      className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      Connect →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div className="card text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          </div>
          <p className="text-gray-400 mb-1">Configure your trade above and click <strong className="text-gray-300">Get Quotes</strong></p>
          <p className="text-sm text-gray-600">All connected brokers will be compared instantly.</p>
          <button
            onClick={() => setShowHelp(true)}
            className="mt-4 text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            Need help? View the guide →
          </button>
        </div>
      )}
    </div>
  );
}
