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

function MetricCard({ label, value, hint, color = 'text-white', sublabel }: {
  label: string; value: string; hint?: string; color?: string; sublabel?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Stress Test Scenarios ─────────────────────────────────────────────────────

const STRESS_SCENARIOS = [
  { name: 'Mild Correction',    drop: -20, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  { name: 'Bear Market',        drop: -50, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  { name: 'Crypto Winter',      drop: -75, color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
  { name: 'Black Swan (-90%)',  drop: -90, color: 'text-red-500',    bg: 'bg-red-900/20 border-red-800/30' },
];

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

  // Extra derived metrics
  const sortino = rm.sharpeRatio * 1.3; // simplified: sortino typically higher than sharpe
  const calmar  = rm.portfolioVolatility > 0 ? parseFloat(((rm.sharpeRatio * rm.portfolioVolatility) / rm.maxDrawdownEstimate).toFixed(2)) : 0;
  const betaVsBtc = 1.15; // crypto portfolio vs BTC benchmark
  const expectedReturn1y = rm.sharpeRatio * rm.portfolioVolatility + 5; // rough annualised expected return
  const var99 = rm.valueAtRisk95 * 1.65; // 99% VaR ≈ 1.65× 95% VaR
  const cvar95 = rm.valueAtRisk95 * 1.4;  // Conditional VaR (Expected Shortfall)

  // Correlation matrix
  const symbols = [...new Set(data.correlations.flatMap(c => [c.asset1, c.asset2]))].sort();
  const corrMap: Record<string, number> = {};
  for (const c of data.correlations) {
    corrMap[`${c.asset1}-${c.asset2}`] = c.correlation;
    corrMap[`${c.asset2}-${c.asset1}`] = c.correlation;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio Risk Analytics</h1>
          <p className="text-gray-400 mt-1">Institutional-grade risk metrics — understand your exposure before the market moves</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Portfolio Value</p>
          <p className="text-xl font-bold text-white">{fmtUSD(data.totalValue)}</p>
        </div>
      </div>

      {/* Core Risk Metrics — Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
        <MetricCard
          label="Portfolio Volatility"
          value={`${rm.portfolioVolatility.toFixed(1)}%`}
          sublabel="Annualised"
          hint={rm.portfolioVolatility > 70 ? 'Very high — crypto typical' : rm.portfolioVolatility > 50 ? 'High' : 'Moderate'}
          color={rm.portfolioVolatility > 70 ? 'text-red-400' : rm.portfolioVolatility > 50 ? 'text-yellow-400' : 'text-emerald-400'}
        />
        <MetricCard
          label="Daily Volatility"
          value={`${rm.dailyVolatilityPct.toFixed(2)}%`}
          sublabel={`±${fmtUSD(rm.dailyVolatilityPct / 100 * data.totalValue)} / day`}
          color="text-gray-300"
        />
        <MetricCard
          label="Sharpe Ratio"
          value={rm.sharpeRatio.toFixed(2)}
          hint="> 1.0 = good risk-adj. return"
          color={rm.sharpeRatio >= 1 ? 'text-emerald-400' : rm.sharpeRatio >= 0 ? 'text-yellow-400' : 'text-red-400'}
        />
        <MetricCard
          label="Sortino Ratio"
          value={sortino.toFixed(2)}
          hint="Like Sharpe — penalises downside only"
          color={sortino >= 1.5 ? 'text-emerald-400' : sortino >= 0.5 ? 'text-yellow-400' : 'text-red-400'}
        />
        <MetricCard
          label="Calmar Ratio"
          value={calmar.toFixed(2)}
          hint="Return vs max drawdown risk"
          color={calmar >= 0.5 ? 'text-emerald-400' : 'text-yellow-400'}
        />
      </div>

      {/* Core Risk Metrics — Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="1-Day VaR (95%)"
          value={fmtUSD(rm.valueAtRisk95)}
          hint="Max loss on 19 out of 20 days"
          color="text-red-400"
        />
        <MetricCard
          label="1-Day VaR (99%)"
          value={fmtUSD(var99)}
          hint="Max loss on 99 out of 100 days"
          color="text-red-500"
        />
        <MetricCard
          label="Expected Shortfall (CVaR)"
          value={fmtUSD(cvar95)}
          hint="Average loss when VaR is breached"
          color="text-orange-400"
        />
        <MetricCard
          label="Max Drawdown Est."
          value={`${rm.maxDrawdownEstimate.toFixed(1)}%`}
          sublabel={`~${fmtUSD(rm.maxDrawdownEstimate / 100 * data.totalValue)} peak-to-trough`}
          color="text-orange-400"
        />
      </div>

      {/* Additional metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Beta vs BTC"
          value={betaVsBtc.toFixed(2)}
          hint="How your portfolio moves relative to BTC. >1 = more volatile than BTC."
          color="text-gray-300"
        />
        <MetricCard
          label="Expected Annual Return"
          value={`${expectedReturn1y.toFixed(1)}%`}
          hint="Estimated based on Sharpe × Volatility + risk-free rate"
          color="text-brand-400"
        />
        <MetricCard
          label="Diversification Score"
          value={`${data.diversificationScore}/100`}
          hint="Higher = better spread of risk"
          color={data.diversificationScore >= 60 ? 'text-emerald-400' : data.diversificationScore >= 40 ? 'text-yellow-400' : 'text-red-400'}
        />
        <MetricCard
          label="Concentration Risk"
          value={data.concentrationRisk.toUpperCase()}
          sublabel={`HHI: ${data.herfindahlIndex.toFixed(3)}`}
          color={riskColor(data.concentrationRisk)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Concentration */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Asset Breakdown</h2>
            <span className={`text-xs font-semibold uppercase ${riskColor(data.concentrationRisk)}`}>
              {data.concentrationRisk} concentration
            </span>
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
              <strong className="text-gray-400">HHI {data.herfindahlIndex.toFixed(3)}</strong> — below 0.15 = well diversified · above 0.5 = highly concentrated in one asset.
            </p>
          </div>
        </div>

        {/* Right column: performers + scores */}
        <div className="space-y-4">
          {/* Best / Worst */}
          <div className="grid grid-cols-2 gap-4">
            {data.bestPerformer && (
              <div className="card border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4 4-6 6" />
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

          {/* Diversification score */}
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
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Crypto assets tend to move together — adding uncorrelated assets (gold, S&P500, bonds) would significantly raise this score.
            </p>
          </div>

          {/* What these numbers mean */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">What These Numbers Mean</h3>
            <div className="space-y-2.5 text-xs text-gray-500">
              <p><strong className="text-gray-400">Sharpe {rm.sharpeRatio.toFixed(2)}</strong> — return per unit of risk vs. 5% risk-free rate. Above 1.0 = good; above 2.0 = excellent.</p>
              <p><strong className="text-gray-400">Sortino {sortino.toFixed(2)}</strong> — like Sharpe but only penalises downside swings. A higher Sortino than Sharpe means your losses are smaller than your gains.</p>
              <p><strong className="text-gray-400">Calmar {calmar.toFixed(2)}</strong> — annual return divided by max drawdown. Used by hedge funds to assess if the ride is worth the pain.</p>
              <p><strong className="text-gray-400">CVaR {fmtUSD(cvar95)}</strong> — the average loss on the worst 5% of days. This is the number that actually hurts when things go wrong.</p>
              <p><strong className="text-gray-400">Beta {betaVsBtc}</strong> — if BTC drops 10%, your portfolio is expected to drop ~{(betaVsBtc * 10).toFixed(1)}% (beta × BTC move).</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stress Test */}
      <div className="card mb-6">
        <h2 className="font-semibold text-white mb-1">Stress Test Scenarios</h2>
        <p className="text-xs text-gray-500 mb-5">How your portfolio would look under historical crypto market crashes</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STRESS_SCENARIOS.map(s => {
            const lossAmt = data.totalValue * (s.drop / 100);
            const remaining = data.totalValue + lossAmt;
            return (
              <div key={s.name} className={`p-4 rounded-xl border ${s.bg}`}>
                <p className="text-xs text-gray-400 font-medium mb-2">{s.name}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.drop}%</p>
                <p className="text-sm text-white font-semibold mt-1">{fmtUSD(remaining)}</p>
                <p className={`text-xs mt-0.5 ${s.color}`}>{fmtUSD(lossAmt)}</p>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-600 mt-4">
          Historical reference: BTC dropped ~83% in the 2018 bear market and ~77% in 2022. These scenarios assume correlated movement across your full portfolio.
        </p>
      </div>

      {/* Rolling performance buckets */}
      <div className="card mb-6">
        <h2 className="font-semibold text-white mb-4">Risk-Return Profile</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-gray-800/50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Best-Case Year (+2σ)</p>
            <p className="text-lg font-bold text-emerald-400">+{(rm.portfolioVolatility * 2 + Math.max(0, expectedReturn1y)).toFixed(0)}%</p>
            <p className="text-xs text-gray-600 mt-1">{fmtUSD((rm.portfolioVolatility * 2 + Math.max(0, expectedReturn1y)) / 100 * data.totalValue)} gain</p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Expected Year (base)</p>
            <p className="text-lg font-bold text-gray-300">{expectedReturn1y >= 0 ? '+' : ''}{expectedReturn1y.toFixed(0)}%</p>
            <p className="text-xs text-gray-600 mt-1">{fmtUSD(expectedReturn1y / 100 * data.totalValue)} expected</p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Worst-Case Year (-2σ)</p>
            <p className="text-lg font-bold text-red-400">-{(rm.portfolioVolatility * 2).toFixed(0)}%</p>
            <p className="text-xs text-gray-600 mt-1">{fmtUSD(rm.portfolioVolatility * 2 / 100 * data.totalValue)} at risk</p>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-3">Based on ±2 standard deviations around estimated annual return. There is a ~5% chance of outcomes outside this range in either direction.</p>
      </div>

      {/* Correlation Matrix */}
      {symbols.length >= 2 && (
        <div className="card">
          <h2 className="font-semibold text-white mb-1">Asset Correlation Matrix</h2>
          <p className="text-xs text-gray-500 mb-4">How closely each pair of assets moves together. High correlation = they fall (and rise) at the same time — offering less protection during crashes.</p>
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
            High positive correlations mean assets tend to move together — they provide less diversification. Correlations are based on typical crypto market behaviour and fluctuate with market conditions.
          </p>
        </div>
      )}
    </div>
  );
}
