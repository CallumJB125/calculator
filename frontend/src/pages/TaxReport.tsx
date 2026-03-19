import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { TaxSummary, TaxEvent, CostBasisComparison } from '../types';
import { fmtUSD, fmtDate } from '../utils/format';

type Method = 'fifo' | 'lifo' | 'hifo';

const METHOD_LABELS: Record<Method, string> = {
  fifo: 'FIFO (First In, First Out)',
  lifo: 'LIFO (Last In, First Out)',
  hifo: 'HIFO (Highest In, First Out)',
};

export default function TaxReport() {
  const [report, setReport] = useState<TaxSummary | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() - 1);
  const [method, setMethod] = useState<Method>('fifo');
  const [loading, setLoading] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [filterTerm, setFilterTerm] = useState<'all' | 'short' | 'long'>('all');
  const [comparison, setComparison] = useState<CostBasisComparison | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [loadingComparison, setLoadingComparison] = useState(false);

  useEffect(() => {
    api.taxes.years().then(y => {
      setYears(y);
      if (y.length > 0) setSelectedYear(y[0]);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    api.taxes.report(selectedYear, method).then(r => {
      setReport(r);
      setLoading(false);
    });
  }, [selectedYear, method]);

  const handleCompare = () => {
    if (comparison?.taxYear === selectedYear) {
      setShowComparison(v => !v);
      return;
    }
    setLoadingComparison(true);
    setShowComparison(true);
    api.taxes.compare(selectedYear).then(c => {
      setComparison(c);
      setLoadingComparison(false);
    });
  };

  const filteredEvents =
    report?.events.filter(e => filterTerm === 'all' || e.termType === filterTerm) ?? [];

  // Estimated tax: short-term at 37%, long-term at 20%, minus funding fee deduction
  const estimatedTax = report
    ? Math.max(0, report.shortTermGain * 0.37 + Math.max(0, report.longTermGain) * 0.2
        - report.totalDeductibleFundingFees * 0.37)
    : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tax Report</h1>
          <p className="text-gray-400 mt-1">Capital gains & losses for tax filing</p>
        </div>
        <div className="flex gap-3">
          <select
            className="select"
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {years.map(y => <option key={y} value={y}>Tax Year {y}</option>)}
          </select>
          <select
            className="select"
            value={method}
            onChange={e => setMethod(e.target.value as Method)}
          >
            {(Object.keys(METHOD_LABELS) as Method[]).map(m => (
              <option key={m} value={m}>{METHOD_LABELS[m]}</option>
            ))}
          </select>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 transition-colors"
            onClick={handleCompare}
          >
            {showComparison ? 'Hide' : 'Compare'} Methods
          </button>
          {report && (
            <button
              className="btn-primary"
              onClick={() => downloadCSV(report)}
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">Calculating taxes...</div>
      ) : report ? (
        <>
          {/* Summary cards — capital gains */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            <SummaryCard label="Total Proceeds" value={fmtUSD(report.totalProceeds)} />
            <SummaryCard label="Total Cost Basis" value={fmtUSD(report.totalCostBasis)} />
            <SummaryCard
              label="Short-Term Gain"
              value={fmtUSD(report.shortTermGain)}
              color={report.shortTermGain >= 0 ? 'text-red-400' : 'text-emerald-400'}
              hint="Taxed as ordinary income"
            />
            <SummaryCard
              label="Long-Term Gain"
              value={fmtUSD(report.longTermGain)}
              color={report.longTermGain >= 0 ? 'text-emerald-400' : 'text-emerald-400'}
              hint="Lower tax rate (0–20%)"
            />
            <SummaryCard
              label="Net Gain / Loss"
              value={fmtUSD(report.totalGain)}
              color={report.totalGain >= 0 ? 'text-red-400' : 'text-emerald-400'}
            />
            <SummaryCard
              label="Est. Tax Owed"
              value={fmtUSD(Math.max(0, estimatedTax))}
              color="text-yellow-400"
              hint="After funding fee deduction"
            />
          </div>

          {/* Funding fees deduction banner */}
          {report.totalDeductibleFundingFees > 0 && (
            <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-emerald-400 font-medium">
                  Funding Fee Deduction Applied — {fmtUSD(report.totalDeductibleFundingFees)}
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Funding fees paid on perpetual positions are deductible as investment expenses (IRC §212).
                  Net taxable gain after deduction: <strong className="text-emerald-400">{fmtUSD(report.netTaxableGain)}</strong>
                  {' '}(saving ≈ {fmtUSD(report.totalDeductibleFundingFees * 0.37)} in taxes at the 37% rate).
                </p>
              </div>
            </div>
          )}

          {/* Deduction summary card row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <SummaryCard
              label="Funding Fees Deduction"
              value={fmtUSD(report.totalDeductibleFundingFees)}
              color="text-emerald-400"
              hint="Paid perpetual funding (§212)"
            />
            <SummaryCard
              label="Net Taxable Gain"
              value={fmtUSD(report.netTaxableGain)}
              color={report.netTaxableGain >= 0 ? 'text-red-400' : 'text-emerald-400'}
              hint="After funding fee deduction"
            />
            <SummaryCard
              label="Tax Savings"
              value={fmtUSD(report.totalDeductibleFundingFees * 0.37)}
              color="text-yellow-400"
              hint="Est. at 37% ordinary rate"
            />
          </div>

          {/* Disclaimer */}
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-400">
              <strong>Disclaimer:</strong> This is an estimate for informational purposes only. Tax estimates assume a 37% rate
              for short-term and 20% for long-term gains. Funding fee deductibility may depend on your jurisdiction and tax status.
              Consult a qualified tax professional before filing.
            </p>
          </div>

          {/* Cost Basis Method Optimizer */}
          {showComparison && (
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white">Cost Basis Method Optimizer</h2>
                <span className="text-xs text-gray-500">Side-by-side FIFO / LIFO / HIFO comparison for {selectedYear}</span>
              </div>
              {loadingComparison ? (
                <p className="text-gray-400 text-sm">Calculating...</p>
              ) : comparison ? (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {comparison.results.map(r => {
                      const isBest  = r.method === comparison.bestMethod;
                      const isWorst = r.method === comparison.worstMethod;
                      return (
                        <div
                          key={r.method}
                          className={`rounded-xl p-4 border transition-colors cursor-pointer ${
                            method === r.method
                              ? 'border-brand-500 bg-brand-600/10'
                              : isBest
                              ? 'border-emerald-500/40 bg-emerald-500/5'
                              : 'border-gray-700 bg-gray-800/40'
                          }`}
                          onClick={() => setMethod(r.method)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                              {r.method.toUpperCase()}
                            </span>
                            {isBest && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Best</span>
                            )}
                            {isWorst && !isBest && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-500/20 text-red-300">Highest Tax</span>
                            )}
                          </div>
                          <p className="text-2xl font-bold text-white mb-1">{fmtUSD(r.estimatedTax)}</p>
                          <p className="text-xs text-gray-500">Est. tax</p>
                          <div className="mt-3 space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Total Gain</span>
                              <span className={r.totalGain >= 0 ? 'text-red-400' : 'text-emerald-400'}>{fmtUSD(r.totalGain)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Short-Term</span>
                              <span className="text-gray-300">{fmtUSD(r.shortTermGain)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Long-Term</span>
                              <span className="text-gray-300">{fmtUSD(r.longTermGain)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                    <p className="text-sm text-emerald-300 font-medium">
                      Recommendation: {comparison.recommendation}
                    </p>
                    {comparison.maxSavingsVsWorst > 0 && (
                      <p className="text-xs text-emerald-500 mt-1">
                        Click a method card to switch the report to that method.
                      </p>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Events filter */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">
              Capital Gains Events ({filteredEvents.length})
            </h2>
            <div className="flex gap-2">
              {(['all', 'short', 'long'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterTerm(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterTerm === t
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {t === 'all' ? 'All' : t === 'short' ? 'Short-Term' : 'Long-Term'}
                </button>
              ))}
            </div>
          </div>

          {/* Events table */}
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Asset', 'Exchange', 'Sold', 'Acquired', 'Held', 'Qty', 'Proceeds', 'Cost Basis', 'Gain / Loss', 'Term'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-5 py-8 text-center text-gray-500">
                        No taxable events for {selectedYear}
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((event: TaxEvent) => (
                      <tr
                        key={event.id}
                        className={`hover:bg-gray-800/50 transition-colors cursor-pointer ${
                          expandedEvent === event.id ? 'bg-gray-800/30' : ''
                        }`}
                        onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                      >
                        <td className="px-5 py-3 text-sm font-medium text-white">{event.symbol}</td>
                        <td className="px-5 py-3 text-sm text-gray-400">{event.exchangeName}</td>
                        <td className="px-5 py-3 text-sm text-gray-300 whitespace-nowrap">{fmtDate(event.sellDate)}</td>
                        <td className="px-5 py-3 text-sm text-gray-300 whitespace-nowrap">{fmtDate(event.buyDate)}</td>
                        <td className="px-5 py-3 text-sm text-gray-400">{event.holdingDays}d</td>
                        <td className="px-5 py-3 text-sm text-gray-300">
                          {event.quantity < 1 ? event.quantity.toFixed(4) : event.quantity.toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-sm text-white">{fmtUSD(event.proceeds)}</td>
                        <td className="px-5 py-3 text-sm text-gray-400">{fmtUSD(event.costBasis)}</td>
                        <td className={`px-5 py-3 text-sm font-semibold ${event.gain >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {event.gain >= 0 ? '+' : ''}{fmtUSD(event.gain)}
                        </td>
                        <td className="px-5 py-3">
                          <span className={event.termType === 'long' ? 'badge-green' : 'badge-red'}>
                            {event.termType === 'long' ? 'Long' : 'Short'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredEvents.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-gray-700 bg-gray-900/50">
                      <td colSpan={6} className="px-5 py-3 text-sm font-semibold text-gray-400">Total</td>
                      <td className="px-5 py-3 text-sm font-semibold text-white">
                        {fmtUSD(filteredEvents.reduce((s, e) => s + e.proceeds, 0))}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-400">
                        {fmtUSD(filteredEvents.reduce((s, e) => s + e.costBasis, 0))}
                      </td>
                      <td className={`px-5 py-3 text-sm font-bold ${
                        filteredEvents.reduce((s, e) => s + e.gain, 0) >= 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {fmtUSD(filteredEvents.reduce((s, e) => s + e.gain, 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-gray-400">No data available</div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color = 'text-white', hint }: {
  label: string;
  value: string;
  color?: string;
  hint?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

function downloadCSV(report: TaxSummary) {
  const headers = [
    'Asset', 'Exchange', 'Sell Date', 'Buy Date', 'Holding Days',
    'Quantity', 'Proceeds', 'Cost Basis', 'Gain/Loss', 'Term',
  ];
  const rows = report.events.map(e => [
    e.symbol,
    e.exchangeName,
    fmtDate(e.sellDate),
    fmtDate(e.buyDate),
    e.holdingDays,
    e.quantity,
    e.proceeds.toFixed(2),
    e.costBasis.toFixed(2),
    e.gain.toFixed(2),
    e.termType,
  ]);

  const meta = [
    [],
    ['Summary'],
    ['Total Gains', report.totalGain.toFixed(2)],
    ['Deductible Funding Fees', report.totalDeductibleFundingFees.toFixed(2)],
    ['Net Taxable Gain', report.netTaxableGain.toFixed(2)],
  ];

  const csv = [[...headers], ...rows, ...meta].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `crypto-tax-report-${report.taxYear}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
