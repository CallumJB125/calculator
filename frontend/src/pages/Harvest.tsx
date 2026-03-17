import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { HarvestSummary, HarvestOpportunity } from '../types';
import { fmtUSD, fmtDate } from '../utils/format';

export default function Harvest() {
  const [data, setData] = useState<HarvestSummary | null>(null);
  const [years] = useState<number[]>([2026, 2025, 2024]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.harvest.opportunities(selectedYear).then(d => {
      setData(d);
      setLoading(false);
    });
  }, [selectedYear]);

  if (loading) return <div className="p-8 text-gray-400">Scanning positions...</div>;
  if (!data)   return <div className="p-8 text-gray-400">No data.</div>;

  const hasOpportunities = data.opportunities.length > 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tax-Loss Harvesting</h1>
          <p className="text-gray-400 mt-1">
            Identify positions to sell at a loss and offset capital gains — with wash-sale protection
          </p>
        </div>
        <select
          className="select"
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
        >
          {years.map(y => <option key={y} value={y}>Tax Year {y}</option>)}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Unrealised Losses</p>
          <p className="text-xl font-bold text-red-400">{fmtUSD(data.totalUnrealizedLoss)}</p>
          <p className="text-xs text-gray-600 mt-1">Available to harvest</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tax Savings</p>
          <p className="text-xl font-bold text-emerald-400">{fmtUSD(data.totalPotentialSavings)}</p>
          <p className="text-xs text-gray-600 mt-1">If all harvested today</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Existing Gains ({selectedYear})</p>
          <p className={`text-xl font-bold ${data.existingGainsThisYear >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {fmtUSD(data.existingGainsThisYear)}
          </p>
          <p className="text-xs text-gray-600 mt-1">Realised so far this year</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Net After Harvest</p>
          <p className={`text-xl font-bold ${data.netGainAfterHarvest >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {fmtUSD(data.netGainAfterHarvest)}
          </p>
          <p className="text-xs text-gray-600 mt-1">Taxable gain remaining</p>
        </div>
      </div>

      {/* How it works */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-400 mb-1">How Tax-Loss Harvesting Works</h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          Sell positions that are currently at a loss to lock in the loss for tax purposes.
          Those losses offset your realised gains — reducing your tax bill.
          After selling, wait <strong className="text-gray-300">31+ days</strong> before repurchasing the same asset
          to avoid the IRS <strong className="text-gray-300">wash-sale rule</strong> (which would disallow the loss).
          You can immediately buy a correlated but non-identical asset in the meantime.
        </p>
      </div>

      {hasOpportunities ? (
        <>
          <h2 className="font-semibold text-white mb-4">
            Harvest Opportunities ({data.opportunities.length})
          </h2>

          <div className="space-y-3">
            {data.opportunities.map(opp => (
              <HarvestCard
                key={opp.positionId}
                opp={opp}
                expanded={expandedId === opp.positionId}
                onToggle={() => setExpandedId(expandedId === opp.positionId ? null : opp.positionId)}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="card text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-white font-semibold mb-1">No harvest opportunities for {selectedYear}</p>
          <p className="text-sm text-gray-500">All positions are currently at a gain. Check back after market movements.</p>
        </div>
      )}
    </div>
  );
}

// ─── Harvest Card ─────────────────────────────────────────────────────────────

function HarvestCard({ opp, expanded, onToggle }: {
  opp: HarvestOpportunity;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`card overflow-hidden p-0 border ${opp.washSaleRisk ? 'border-yellow-500/30' : 'border-gray-800'}`}>
      {/* Main row */}
      <button
        onClick={onToggle}
        className="w-full text-left px-6 py-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Asset */}
          <div className="flex items-center gap-3 min-w-[160px]">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
              {opp.symbol.slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{opp.asset}</p>
              <p className="text-xs text-gray-500">{opp.exchangeName}</p>
            </div>
          </div>

          {/* Loss */}
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-0.5">Unrealised Loss</p>
            <p className="text-sm font-semibold text-red-400">{fmtUSD(opp.unrealizedLoss)}</p>
          </div>

          {/* Savings */}
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-0.5">Est. Tax Savings</p>
            <p className="text-sm font-bold text-emerald-400">
              {opp.washSaleRisk ? '—' : fmtUSD(opp.taxSavings)}
            </p>
          </div>

          {/* Term */}
          <div>
            <span className={opp.termType === 'long' ? 'badge-green' : 'badge-red'}>
              {opp.termType === 'long' ? 'Long-Term' : 'Short-Term'}
            </span>
          </div>

          {/* Wash sale badge */}
          <div className="min-w-[140px] text-right">
            {opp.washSaleRisk ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/15 border border-yellow-500/30 rounded-lg">
                <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-xs text-yellow-400 font-medium">
                  Wash-sale risk ({opp.daysUntilSafe}d)
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-lg">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-emerald-400 font-medium">Safe to harvest</span>
              </div>
            )}
          </div>

          {/* Expand chevron */}
          <svg
            className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-800 px-6 py-5 bg-gray-900/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-1">Quantity</p>
              <p className="text-white">{opp.quantity < 1 ? opp.quantity.toFixed(4) : opp.quantity.toFixed(2)} {opp.symbol}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Avg Cost Basis</p>
              <p className="text-white">{fmtUSD(opp.avgCostBasis)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Current Price</p>
              <p className="text-white">{fmtUSD(opp.currentPrice)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Tax Rate Applied</p>
              <p className="text-white">{(opp.savingsRate * 100).toFixed(0)}% ({opp.termType}-term)</p>
            </div>
          </div>

          {/* Lot breakdown */}
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Lot Breakdown</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Buy Date', 'Qty', 'Cost Basis', 'Days Held', 'Term', 'Days to Long-Term'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-500 pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {opp.lots.map((lot, i) => (
                  <tr key={i} className="py-2">
                    <td className="py-2 pr-4 text-gray-300">{fmtDate(lot.buyDate)}</td>
                    <td className="py-2 pr-4 text-white">
                      {lot.quantity < 1 ? lot.quantity.toFixed(4) : lot.quantity.toFixed(2)}
                    </td>
                    <td className="py-2 pr-4 text-gray-300">{fmtUSD(lot.costBasis)}</td>
                    <td className="py-2 pr-4 text-gray-400">{lot.daysHeld}d</td>
                    <td className="py-2 pr-4">
                      <span className={lot.termType === 'long' ? 'badge-green' : 'badge-red'}>
                        {lot.termType}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      {lot.termType === 'short' ? (
                        <span className="text-yellow-400">{lot.daysUntilLongTerm}d</span>
                      ) : (
                        <span className="text-emerald-400">Long-term ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {opp.washSaleRisk && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-xs text-yellow-400">
                <strong>Wash-Sale Warning:</strong> This position was purchased {opp.daysHeld} days ago.
                You must wait <strong>{opp.daysUntilSafe} more days</strong> before selling to ensure the loss is deductible.
                If you sell now, the IRS will disallow the loss.
                You can still sell a different asset immediately.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
