import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { RebalancePlan } from '../types';
import { fmtUSD } from '../utils/format';

const DRIFT_OPTIONS = [3, 5, 10];

export default function Rebalance() {
  const [plan, setPlan] = useState<RebalancePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(5);

  const loadPlan = (t: number) => {
    setLoading(true);
    api.rebalance.plan(t).then(p => {
      setPlan(p);
      setLoading(false);
    });
  };

  useEffect(() => { loadPlan(threshold); }, [threshold]);

  const sells = plan?.trades.filter(t => t.action === 'sell') ?? [];
  const buys  = plan?.trades.filter(t => t.action === 'buy')  ?? [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio Rebalancer</h1>
          <p className="text-gray-400 mt-1">Tax-aware rebalancing to your target allocations</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Drift threshold:</span>
          {DRIFT_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => setThreshold(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                threshold === d
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {d}%
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="p-8 text-gray-400">Calculating rebalancing plan...</div>}

      {!loading && plan && (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Portfolio Value</p>
              <p className="text-xl font-bold text-white">{fmtUSD(plan.totalPortfolioValue)}</p>
              <p className="text-xs text-gray-600 mt-1">Excl. stablecoins</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Trades Needed</p>
              <p className="text-xl font-bold text-white">{plan.trades.length}</p>
              <p className="text-xs text-gray-600 mt-1">{sells.length} sell · {buys.length} buy</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Est. Tax on Sells</p>
              <p className="text-xl font-bold text-red-400">{fmtUSD(plan.estimatedTotalTax)}</p>
              <p className="text-xs text-gray-600 mt-1">From rebalancing sells</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Drift Threshold</p>
              <p className="text-xl font-bold text-white">{plan.driftThreshold}%</p>
              <p className="text-xs text-gray-600 mt-1">Min drift to trigger trade</p>
            </div>
          </div>

          {/* Current vs Target */}
          <div className="card mb-6">
            <h2 className="font-semibold text-white mb-4">Current vs Target Allocation</h2>
            <div className="space-y-4">
              {plan.targets.map(t => {
                const overweight = t.drift > 0;
                const absDrift = Math.abs(t.drift);
                const needsRebalance = absDrift >= plan.driftThreshold;
                return (
                  <div key={t.symbol}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
                          {t.symbol.slice(0, 2)}
                        </div>
                        <span className="text-sm font-medium text-white">{t.symbol}</span>
                        {needsRebalance && (
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${overweight ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'}`}>
                            {overweight ? `+${absDrift.toFixed(1)}% over` : `${absDrift.toFixed(1)}% under`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm text-right">
                        <div>
                          <span className="text-gray-500 text-xs">Current </span>
                          <span className={`font-semibold ${overweight ? 'text-orange-400' : 'text-blue-400'}`}>
                            {t.currentPct.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Target </span>
                          <span className="font-semibold text-gray-300">{t.targetPct}%</span>
                        </div>
                        <div className="text-gray-400 w-24">{fmtUSD(t.currentValue)}</div>
                      </div>
                    </div>

                    {/* Stacked bar */}
                    <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                      {/* Target marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-gray-500 z-10"
                        style={{ left: `${t.targetPct}%` }}
                      />
                      {/* Current fill */}
                      <div
                        className={`h-full rounded-full transition-all ${
                          !needsRebalance ? 'bg-emerald-500' : overweight ? 'bg-orange-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, t.currentPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-600 mt-4">
              The vertical line shows your target allocation. Green = within threshold; orange = overweight; blue = underweight.
            </p>
          </div>

          {/* Trade Suggestions */}
          {plan.trades.length === 0 ? (
            <div className="card text-center py-12">
              <svg className="w-12 h-12 text-emerald-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-semibold text-white">Portfolio is balanced</p>
              <p className="text-sm text-gray-400 mt-1">All assets are within the {plan.driftThreshold}% drift threshold. No trades needed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sells */}
              {sells.length > 0 && (
                <div className="card border border-red-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                    <h2 className="font-semibold text-white">Suggested Sells</h2>
                  </div>
                  <div className="space-y-3">
                    {sells.map((trade, i) => (
                      <div key={i} className="bg-gray-800/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-300">SELL</span>
                            <span className="font-semibold text-white">{trade.symbol}</span>
                          </div>
                          <span className="font-bold text-white">{fmtUSD(trade.valueUSD)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                          <div>
                            <span className="text-gray-500">Quantity: </span>
                            <span className="text-gray-300">{trade.quantity.toFixed(6)} {trade.symbol}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Exchange: </span>
                            <span className="text-gray-300">{trade.recommendedExchange}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Est. Tax: </span>
                            <span className="text-red-400">{fmtUSD(trade.estimatedTaxImpact)}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">{trade.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buys */}
              {buys.length > 0 && (
                <div className="card border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <h2 className="font-semibold text-white">Suggested Buys</h2>
                  </div>
                  <div className="space-y-3">
                    {buys.map((trade, i) => (
                      <div key={i} className="bg-gray-800/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300">BUY</span>
                            <span className="font-semibold text-white">{trade.symbol}</span>
                          </div>
                          <span className="font-bold text-white">{fmtUSD(trade.valueUSD)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                          <div>
                            <span className="text-gray-500">Quantity: </span>
                            <span className="text-gray-300">{trade.quantity.toFixed(6)} {trade.symbol}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Best Exchange: </span>
                            <span className="text-gray-300">{trade.recommendedExchange}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Tax Impact: </span>
                            <span className="text-emerald-400">None (buy)</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">{trade.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tax-awareness note */}
          <div className="card mt-6">
            <h3 className="font-semibold text-white mb-2">Tax-Aware Rebalancing Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
              <div>
                <p className="text-gray-400 font-semibold mb-1">Use New Cash First</p>
                <p>Direct new contributions to under-weight assets before selling over-weight ones. Avoids triggering capital gains entirely.</p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold mb-1">Harvest Losses Simultaneously</p>
                <p>Combine rebalancing sells with tax-loss harvesting. Check the Tax Harvesting page for positions with unrealized losses.</p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold mb-1">Wait for Long-Term Status</p>
                <p>If an over-weight position is close to 1-year hold, waiting can cut your tax rate from 37% to 20%. Use Tax Preview to check.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
