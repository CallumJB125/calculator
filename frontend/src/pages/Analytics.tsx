import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PortfolioAnalytics } from '../types';
import { fmtUSD, fmtPct } from '../utils/format';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskColor(risk: 'high' | 'medium' | 'low') {
  if (risk === 'high')   return 'text-red-400';
  if (risk === 'medium') return 'text-yellow-400';
  return 'text-emerald-400';
}

function corrColor(v: number) {
  if (v >= 0.8)  return 'bg-red-500/30 text-red-300';
  if (v >= 0.6)  return 'bg-orange-500/20 text-orange-300';
  if (v >= 0.4)  return 'bg-yellow-500/20 text-yellow-300';
  if (v >= 0)    return 'bg-blue-500/20 text-blue-300';
  return 'bg-emerald-500/20 text-emerald-300';
}

function ScoreBar({ value, max = 100, color = 'bg-brand-500' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Analytics() {
  const [data, setData] = useState<PortfolioAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.analytics.risk().then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-gray-400">Calculating portfolio analytics...</div>;
  if (!data)   return <div className="p-8 text-gray-400">No data available.</div>;

  const { riskMetrics: rm } = data;

  // Build correlation matrix labels
  const symbols = [...new Set(data.correlations.flatMap(c => [c.asset1, c.asset2]))].sort();
  const corrMap: Record<string, number> = {};
  for (const c of data.correlations) {
    corrMap[`${c.asset1}-${c.asset2}`] = c.correlation;
    corrMap[`${c.asset2}-${c.asset1}`] = c.correlation;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Portfolio Risk Analytics</h1>
        <p className="text-gray-400 mt-1">Institutional-grade risk metrics for your holdings</p>
      </div>

      {/* Top Risk Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <MetricCard
          label="Portfolio Volatility"
          value={`${rm.portfolioVolatility.toFixed(1)}%`}
          hint="Annualised"
          color={rm.portfolioVolatility > 70 ? 'text-red-400' : rm.portfolioVolatility > 50 ? 'text-yellow-400' : 'text-emerald-400'}
        />
        <MetricCard
          label="Sharpe Ratio"
          value={rm.sharpeRatio.toFixed(2)}
          hint="> 1.0 = good risk-adj. return"
          color={rm.sharpeRatio >= 1 ? 'text-emerald-400' : rm.sharpeRatio >= 0 ? 'text-yellow-400' : 'text-red-400'}
        />
        <MetricCard
          label="1-Day VaR (95%)"
          value={fmtUSD(rm.valueAtRisk95)}
          hint="Max loss on 95% of days"
          color="text-red-400"
        />
        <MetricCard
          label="Max Drawdown Est."
          value={`${rm.maxDrawdownEstimate.toFixed(1)}%`}
          hint="Historical range from peak"
          color="text-orange-400"
        />
        <MetricCard
          label="Daily Volatility"
          value={`${rm.dailyVolatilityPct.toFixed(2)}%`}
          hint="Annualised ÷ √252"
          color="text-gray-300"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Concentration */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Portfolio Concentration</h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold uppercase ${riskColor(data.concentrationRisk)}`}>
                {data.concentrationRisk} concentration
              </span>
              <span className="text-xs text-gray-600">HHI: {data.herfindahlIndex.toFixed(3)}</span>
            </div>
          </div>

          <div className="space-y-3">
            {data.concentration.map(c => (
              <div key={c.symbol}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
                      {c.symbol.slice(0, 2)}
                    </div>
                    <span className="text-sm text-white">{c.symbol}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400">{fmtUSD(c.value)}</span>
                    <span className={c.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'} style={{minWidth:'52px', textAlign:'right'}}>
                      {c.pnlPct >= 0 ? '+' : ''}{c.pnlPct.toFixed(1)}%
                    </span>
                    <span className="text-white font-medium" style={{minWidth:'42px', textAlign:'right'}}>
                      {c.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <ScoreBar
                  value={c.pct}
                  max={100}
                  color={c.pct > 50 ? 'bg-red-500' : c.pct > 30 ? 'bg-yellow-500' : 'bg-brand-500'}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              <strong className="text-gray-400">HHI</strong> (Herfindahl-Hirschman Index): measures concentration.
              0 = perfectly diversified · 1 = all in one asset.
              Below 0.15 is generally considered well-diversified.
            </p>
          </div>
        </div>

        {/* Performers + Diversification */}
        <div className="space-y-4">
          {/* Best / Worst */}
          <div className="grid grid-cols-2 gap-4">
            {data.bestPerformer && (
              <div className="card border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Best Performer</p>
                </div>
                <p className="text-2xl font-bold text-white">{data.bestPerformer.symbol}</p>
                <p className="text-lg font-bold text-emerald-400">+{data.bestPerformer.pct.toFixed(1)}%</p>
                <p className="text-sm text-emerald-500 mt-0.5">{fmtUSD(data.bestPerformer.pnl)}</p>
              </div>
            )}
            {data.worstPerformer && (
              <div className="card border border-red-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Worst Performer</p>
                </div>
                <p className="text-2xl font-bold text-white">{data.worstPerformer.symbol}</p>
                <p className={`text-lg font-bold ${data.worstPerformer.pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.worstPerformer.pct >= 0 ? '+' : ''}{data.worstPerformer.pct.toFixed(1)}%
                </p>
                <p className={`text-sm mt-0.5 ${data.worstPerformer.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {fmtUSD(data.worstPerformer.pnl)}
                </p>
              </div>
            )}
          </div>

          {/* Diversification Score */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Diversification Score</h3>
              <span className={`text-2xl font-bold ${
                data.diversificationScore >= 60 ? 'text-emerald-400' :
                data.diversificationScore >= 40 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {data.diversificationScore}/100
              </span>
            </div>
            <ScoreBar
              value={data.diversificationScore}
              color={data.diversificationScore >= 60 ? 'bg-emerald-500' : data.diversificationScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'}
            />
            <p className="text-xs text-gray-500 mt-2">
              Weighted score based on asset concentration and pairwise correlations.
              Crypto assets tend to be highly correlated — diversifying into uncorrelated asset classes
              (equities, commodities, real estate) would raise this score significantly.
            </p>
          </div>

          {/* VaR explainer */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-2">What These Numbers Mean</h3>
            <div className="space-y-2 text-xs text-gray-500">
              <p><strong className="text-gray-400">1-Day 95% VaR {fmtUSD(rm.valueAtRisk95)}</strong> — on 19 out of 20 trading days you should NOT lose more than this amount. The 1-in-20 days can be much worse.</p>
              <p><strong className="text-gray-400">Max Drawdown {rm.maxDrawdownEstimate.toFixed(1)}%</strong> — estimated peak-to-trough decline based on historical crypto volatility. In extreme bear markets, actual drawdowns have exceeded 80%.</p>
              <p><strong className="text-gray-400">Sharpe {rm.sharpeRatio.toFixed(2)}</strong> — return per unit of risk vs a 5% risk-free rate. Above 1.0 indicates good risk-adjusted returns.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Correlation Matrix */}
      {symbols.length >= 2 && (
        <div className="card">
          <h2 className="font-semibold text-white mb-4">Asset Correlation Matrix</h2>
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr>
                  <th className="w-16 pb-3 pr-3" />
                  {symbols.map(s => (
                    <th key={s} className="pb-3 pr-3 text-center text-xs font-semibold text-gray-400 min-w-[60px]">{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {symbols.map(row => (
                  <tr key={row}>
                    <td className="pr-3 py-1.5 text-xs font-semibold text-gray-400 text-right">{row}</td>
                    {symbols.map(col => {
                      const v = row === col ? 1 : (corrMap[`${row}-${col}`] ?? null);
                      return (
                        <td key={col} className="pr-3 py-1.5 text-center">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold min-w-[44px] ${
                            row === col
                              ? 'bg-gray-700 text-gray-300'
                              : v !== null
                              ? corrColor(v)
                              : 'text-gray-600'
                          }`}>
                            {row === col ? '1.00' : v !== null ? v.toFixed(2) : '—'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            {[
              { label: '≥ 0.8 Very high', cls: 'bg-red-500/30 text-red-300' },
              { label: '0.6–0.8 High',    cls: 'bg-orange-500/20 text-orange-300' },
              { label: '0.4–0.6 Moderate', cls: 'bg-yellow-500/20 text-yellow-300' },
              { label: '< 0.4 Low',        cls: 'bg-blue-500/20 text-blue-300' },
              { label: '< 0 Negative',     cls: 'bg-emerald-500/20 text-emerald-300' },
            ].map(l => (
              <span key={l.label} className={`px-2 py-0.5 rounded font-medium ${l.cls}`}>{l.label}</span>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3">
            High positive correlations mean assets tend to move together — they provide less diversification benefit.
            Correlations are based on typical crypto market behaviour; actual values fluctuate with market conditions.
          </p>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, hint, color = 'text-white' }: {
  label: string; value: string; hint?: string; color?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}
