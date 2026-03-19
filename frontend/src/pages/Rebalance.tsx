import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { RebalancePlan } from '../types';
import { fmtUSD } from '../utils/format';

const DRIFT_OPTIONS = [3, 5, 10];

// ─── Beginner Explainer ───────────────────────────────────────────────────────

function BeginnerGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6 border border-blue-500/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-blue-500/10 hover:bg-blue-500/15 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-semibold text-blue-400">New to rebalancing? Click here for a plain-English explanation</span>
        </div>
        <svg className={`w-4 h-4 text-blue-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 py-5 bg-blue-500/5 space-y-4 text-sm text-gray-300">
          <div>
            <p className="font-semibold text-white mb-1">What is rebalancing?</p>
            <p className="text-gray-400 leading-relaxed">
              Imagine you decided to put 60% of your crypto in Bitcoin and 40% in Ethereum. Over time, Bitcoin shoots up and now makes up 75% of your portfolio. Your plan is out of whack — that's called <strong className="text-gray-200">drift</strong>. Rebalancing means selling some Bitcoin and buying more Ethereum to get back to 60/40.
            </p>
          </div>
          <div>
            <p className="font-semibold text-white mb-1">Why does it matter?</p>
            <p className="text-gray-400 leading-relaxed">
              Rebalancing forces you to <strong className="text-gray-200">sell high and buy low</strong> — automatically, without trying to guess the market. It keeps your risk level consistent with what you're comfortable with.
            </p>
          </div>
          <div>
            <p className="font-semibold text-white mb-1">What does "drift threshold" mean?</p>
            <p className="text-gray-400 leading-relaxed">
              This is how far your actual allocation can wander from your target before we suggest a trade. A <strong className="text-gray-200">5% threshold</strong> means we only act when something is more than 5 percentage points off target. Smaller thresholds = more frequent trades but more taxes. Larger = fewer trades.
            </p>
          </div>
          <div>
            <p className="font-semibold text-white mb-1">What about taxes?</p>
            <p className="text-gray-400 leading-relaxed">
              Every sell triggers a potential tax event. That's why this tool shows you the <strong className="text-gray-200">estimated tax cost</strong> of each rebalancing trade. Pro tip: use new cash (a fresh deposit) to buy underweight assets instead of selling — zero tax!
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <p className="text-xs text-emerald-400">
              <strong>Beginner tip:</strong> If this is your first time, just read the suggestions below. You don't have to execute every trade — even following 1-2 of them will improve your portfolio.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio Rebalancer</h1>
          <p className="text-gray-400 mt-1">Keep your crypto allocation on track — automatically</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">How sensitive should alerts be?</p>
            <div className="flex items-center gap-2">
              {DRIFT_OPTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setThreshold(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    threshold === d
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                  title={d === 3 ? 'High sensitivity — trades more often' : d === 10 ? 'Low sensitivity — fewer trades, less tax' : 'Balanced'}
                >
                  {d}%{d === 5 ? ' ★' : ''}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {threshold === 3 ? 'High sensitivity — more frequent adjustments' : threshold === 10 ? 'Low sensitivity — fewer trades, lower tax bill' : 'Balanced — recommended for most investors'}
            </p>
          </div>
        </div>
      </div>

      {/* Beginner guide */}
      <BeginnerGuide />

      {loading && <div className="p-8 text-gray-400">Calculating your rebalancing plan...</div>}

      {!loading && plan && (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Your Portfolio</p>
              <p className="text-xl font-bold text-white">{fmtUSD(plan.totalPortfolioValue)}</p>
              <p className="text-xs text-gray-600 mt-1">Total crypto value tracked</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Trades Suggested</p>
              <p className="text-xl font-bold text-white">{plan.trades.length}</p>
              <p className="text-xs text-gray-600 mt-1">{sells.length} sell · {buys.length} buy</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tax Cost of Selling</p>
              <p className="text-xl font-bold text-red-400">{fmtUSD(plan.estimatedTotalTax)}</p>
              <p className="text-xs text-gray-600 mt-1">Only if you execute the sells</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Drift Threshold</p>
              <p className="text-xl font-bold text-white">{plan.driftThreshold}%</p>
              <p className="text-xs text-gray-600 mt-1">Assets within this range are fine</p>
            </div>
          </div>

          {/* Current vs Target — visual breakdown */}
          <div className="card mb-6">
            <h2 className="font-semibold text-white mb-1">Your Current vs Target Allocation</h2>
            <p className="text-xs text-gray-500 mb-5">The goal marker (|) shows where you want each coin to be. Orange = you own too much of this. Blue = you need more of this.</p>
            <div className="space-y-5">
              {plan.targets.map(t => {
                const overweight = t.drift > 0;
                const absDrift = Math.abs(t.drift);
                const needsRebalance = absDrift >= plan.driftThreshold;
                return (
                  <div key={t.symbol}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
                          {t.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-white">{t.symbol}</span>
                          {needsRebalance && (
                            <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${overweight ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'}`}>
                              {overweight ? `You own ${absDrift.toFixed(1)}% too much` : `You need ${absDrift.toFixed(1)}% more`}
                            </span>
                          )}
                          {!needsRebalance && (
                            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">On target</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-right">
                        <div>
                          <span className="text-gray-500 text-xs">Now: </span>
                          <span className={`font-semibold ${overweight && needsRebalance ? 'text-orange-400' : !overweight && needsRebalance ? 'text-blue-400' : 'text-emerald-400'}`}>
                            {t.currentPct.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Goal: </span>
                          <span className="font-semibold text-gray-300">{t.targetPct}%</span>
                        </div>
                        <div className="text-gray-400 w-24">{fmtUSD(t.currentValue)}</div>
                      </div>
                    </div>

                    <div className="relative h-2.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-10"
                        style={{ left: `${t.targetPct}%` }}
                      />
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
          </div>

          {/* Trade Suggestions */}
          {plan.trades.length === 0 ? (
            <div className="card text-center py-12">
              <svg className="w-12 h-12 text-emerald-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-semibold text-white">Your portfolio looks great!</p>
              <p className="text-sm text-gray-400 mt-1">Everything is within {plan.driftThreshold}% of your targets. No trades needed right now.</p>
              <p className="text-xs text-gray-600 mt-3">Try lowering the threshold to see smaller adjustments.</p>
            </div>
          ) : (
            <>
              <h2 className="font-semibold text-white mb-4">
                Suggested Trades
                <span className="ml-2 text-sm text-gray-500 font-normal">— you don't have to do all of these. Even one helps.</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sells */}
                {sells.length > 0 && (
                  <div className="card border border-red-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                      <h2 className="font-semibold text-white">Trim These (Sell)</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">These assets have grown beyond your target. Selling a bit locks in profit and resets your balance.</p>
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
                              <span className="text-gray-500">Amount: </span>
                              <span className="text-gray-300">{trade.quantity.toFixed(6)} {trade.symbol}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Best exchange: </span>
                              <span className="text-gray-300">{trade.recommendedExchange}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Tax you'd owe: </span>
                              <span className="text-red-400">{fmtUSD(trade.estimatedTaxImpact)}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 italic">{trade.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buys */}
                {buys.length > 0 && (
                  <div className="card border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4 4-6 6" />
                      </svg>
                      <h2 className="font-semibold text-white">Add to These (Buy)</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">These assets have fallen below your target. Adding to them brings you back on plan — no tax triggered on buys.</p>
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
                              <span className="text-gray-500">Amount: </span>
                              <span className="text-gray-300">{trade.quantity.toFixed(6)} {trade.symbol}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Best exchange: </span>
                              <span className="text-gray-300">{trade.recommendedExchange}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Tax: </span>
                              <span className="text-emerald-400">None (buying doesn't trigger tax)</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 italic">{trade.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Smart tips */}
          <div className="card mt-6">
            <h3 className="font-semibold text-white mb-3">Smart Ways to Rebalance Without a Big Tax Bill</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-brand-600/30 flex items-center justify-center text-xs font-bold text-brand-400">1</span>
                  <p className="text-sm font-semibold text-gray-200">Deposit new cash</p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">Instead of selling BTC to buy ETH, just deposit fresh money and buy ETH directly. Zero tax triggered. This is the easiest option.</p>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-brand-600/30 flex items-center justify-center text-xs font-bold text-brand-400">2</span>
                  <p className="text-sm font-semibold text-gray-200">Harvest losses first</p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">If you have positions in the red, sell those first. The losses offset the gains from rebalancing sells — reducing or eliminating your tax bill.</p>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-brand-600/30 flex items-center justify-center text-xs font-bold text-brand-400">3</span>
                  <p className="text-sm font-semibold text-gray-200">Wait for 1 year</p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">If you've held an asset for less than a year, waiting until you hit 12 months drops your tax rate from up to 37% down to 20% — sometimes worth the wait.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
