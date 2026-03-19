import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ArbitrageOpportunity, ArbitrageScanResult } from '../types';
import { fmtUSD, fmtDateTime } from '../utils/format';

export default function Arbitrage() {
  const [result, setResult] = useState<ArbitrageScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);

  function handleScan() {
    setLoading(true);
    api.arbitrage.scan(1).then(r => {
      setResult(r);
      setLoading(false);
      setScanned(true);
    });
  }

  // Auto-scan on mount
  useEffect(() => {
    handleScan();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Arbitrage Radar</h1>
          <p className="text-gray-400 mt-1">
            Detect price discrepancies across connected exchanges — net profit shown after all fees
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={loading}
          className="btn-primary py-2.5 px-6 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scanning...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Scan
            </>
          )}
        </button>
      </div>

      {/* Risk disclaimer */}
      <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-xs text-yellow-400">
          <strong>Important:</strong> Arbitrage windows in liquid markets close within milliseconds.
          By the time you execute manually, the spread will likely have narrowed. Use this tool to
          identify exchanges with systematically better pricing for your trades, not to execute pure arb.
          Always account for withdrawal fees and transfer times if moving funds between exchanges.
        </p>
      </div>

      {result && (
        <>
          {/* Meta */}
          <p className="text-xs text-gray-500 mb-4">
            Last scanned: {fmtDateTime(result.scannedAt)} · Exchanges: {result.connectedExchanges.join(', ')}
          </p>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Assets Scanned</p>
              <p className="text-2xl font-bold text-white">{result.opportunities.length}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Profitable After Fees</p>
              <p className={`text-2xl font-bold ${result.viableCount > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                {result.viableCount}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Best Net Spread</p>
              <p className={`text-2xl font-bold ${result.viableCount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.viableCount > 0
                  ? fmtUSD(Math.max(...result.opportunities.filter(o => o.viable).map(o => o.netProfit)))
                  : '—'}
              </p>
            </div>
          </div>

          {/* Opportunities table */}
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Asset', 'Buy On', 'Buy Price', 'Sell On', 'Sell Price', 'Gross Spread', 'Fees', 'Net Profit', 'Net %', 'Verdict'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-4 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {result.opportunities.map((opp: ArbitrageOpportunity) => (
                    <tr
                      key={opp.symbol}
                      className={`transition-colors hover:bg-gray-800/50 ${opp.viable ? 'bg-emerald-500/5' : ''}`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
                            {opp.symbol.slice(0, 2)}
                          </div>
                          <p className="text-sm font-medium text-white">{opp.symbol}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-300">{opp.buyExchange}</td>
                      <td className="px-5 py-3 text-sm text-white">{fmtUSD(opp.buyPrice)}</td>
                      <td className="px-5 py-3 text-sm text-gray-300">{opp.sellExchange}</td>
                      <td className="px-5 py-3 text-sm text-white">{fmtUSD(opp.sellPrice)}</td>
                      <td className="px-5 py-3 text-sm">
                        <p className="text-white">{fmtUSD(opp.grossSpread)}</p>
                        <p className="text-xs text-gray-500">{opp.grossSpreadPct.toFixed(3)}%</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-red-400">{fmtUSD(opp.totalFees)}</td>
                      <td className={`px-5 py-3 text-sm font-bold ${opp.netProfit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {opp.netProfit > 0 ? '+' : ''}{fmtUSD(opp.netProfit)}
                      </td>
                      <td className={`px-5 py-3 text-sm ${opp.netProfitPct > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {opp.netProfitPct > 0 ? '+' : ''}{opp.netProfitPct.toFixed(3)}%
                      </td>
                      <td className="px-5 py-3">
                        {opp.viable ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Viable
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-gray-700 text-gray-400 border border-gray-600">
                            Below fees
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Insights */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">How to Read This</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Each row shows the best buy price across your connected exchanges versus the best sell price.
                <strong className="text-gray-400"> Net Profit</strong> is what you'd pocket after paying taker fees on both legs.
                A negative figure means fees eat all the spread — not worth trading on spread alone.
              </p>
            </div>
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Practical Use</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Even when no pure arb exists, this shows you which exchange to use for each asset.
                If Binance consistently has a lower ask on BTC, route all your BTC buys there.
                Use <strong className="text-gray-400">Best Execution</strong> to route individual trades optimally.
              </p>
            </div>
          </div>
        </>
      )}

      {!scanned && loading && (
        <div className="card text-center py-16">
          <svg className="w-8 h-8 text-gray-600 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400">Scanning exchanges for price discrepancies...</p>
        </div>
      )}
    </div>
  );
}
