import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { HarvestSummary, HarvestOpportunity } from '../types';
import { fmtUSD, fmtDate } from '../utils/format';

// ─── AI Tax Bot ───────────────────────────────────────────────────────────────

interface BotMessage {
  role: 'bot' | 'user';
  text: string;
}

const BOT_SUGGESTIONS = [
  'How much can I save by harvesting today?',
  'What is the wash-sale rule?',
  'Should I harvest losses before year end?',
  'Which positions should I sell first?',
  'How do I avoid the wash-sale rule?',
];

// Simple rule-based bot responses driven by real harvest data
function getBotResponse(input: string, data: HarvestSummary | null): string {
  const q = input.toLowerCase();

  if (!data) return "I'm still loading your portfolio data. Give me a moment!";

  const totalLoss = Math.abs(data.totalUnrealizedLoss);
  const savings = data.totalPotentialSavings;
  const opps = data.opportunities;
  const safeOpps = opps.filter(o => !o.washSaleRisk);
  const washOpps = opps.filter(o => o.washSaleRisk);
  const shortTerm = opps.filter(o => o.termType === 'short');
  const longTerm  = opps.filter(o => o.termType === 'long');

  if (q.includes('save') || q.includes('much') || q.includes('savings')) {
    if (savings <= 0) return "Your portfolio is currently all in profit — no losses to harvest right now. Check back after a market dip!";
    return `Based on your current positions, you could save approximately **${fmtUSD(savings)}** in taxes by harvesting your unrealised losses of **${fmtUSD(totalLoss)}** today. ${safeOpps.length} position${safeOpps.length !== 1 ? 's are' : ' is'} safe to harvest immediately (no wash-sale risk).`;
  }

  if (q.includes('wash') || q.includes('rule') || q.includes('irs')) {
    const days = washOpps.length > 0 ? Math.max(...washOpps.map(o => o.daysUntilSafe)) : 0;
    return `The IRS wash-sale rule says you cannot buy the **same or substantially identical** asset within 30 days before or after selling at a loss. If you do, the loss is disallowed.\n\nYou have ${washOpps.length} position${washOpps.length !== 1 ? 's' : ''} flagged with wash-sale risk — the longest wait is **${days} days**. In the meantime, you can buy a *correlated but different* asset (e.g. sell ADA and buy DOT) to maintain market exposure.`;
  }

  if (q.includes('year end') || q.includes('deadline') || q.includes('before')) {
    return `Year-end harvesting is most valuable if you have realised gains this year to offset. Your existing gains so far: **${fmtUSD(data.existingGainsThisYear)}**. After harvesting, your net taxable gain would drop to **${fmtUSD(data.netGainAfterHarvest)}**. Act before **December 31** — losses must be *realised* in the tax year you want to use them.`;
  }

  if (q.includes('which') || q.includes('first') || q.includes('priority') || q.includes('sell')) {
    if (safeOpps.length === 0 && opps.length === 0) return "You have no loss positions to harvest at the moment. All your assets are in profit.";
    if (safeOpps.length === 0) return `All ${washOpps.length} loss position${washOpps.length !== 1 ? 's' : ''} currently have wash-sale risk. You'll need to wait before harvesting them safely.`;
    const top = safeOpps.sort((a, b) => b.taxSavings - a.taxSavings)[0];
    return `Prioritise **${top.asset} (${top.symbol})** first — harvesting it today saves approximately **${fmtUSD(top.taxSavings)}** in taxes. ${shortTerm.length > 0 ? `Short-term losses (taxed at up to 37%) are more valuable than long-term losses — focus on those ${shortTerm.length} short-term position${shortTerm.length !== 1 ? 's' : ''} first.` : `You have ${longTerm.length} long-term loss position${longTerm.length !== 1 ? 's' : ''} available.`}`;
  }

  if (q.includes('avoid') || q.includes('workaround') || q.includes('instead')) {
    return `Three ways to avoid triggering the wash-sale rule:\n\n1. **Wait 31+ days** before repurchasing the same asset.\n2. **Buy a similar asset** immediately — e.g. sell SOL and buy AVAX. They're correlated enough to maintain exposure, but the IRS treats them as different assets.\n3. **Use new cash** to buy your desired asset in a different account while you wait.`;
  }

  if (q.includes('short') || q.includes('long') || q.includes('term')) {
    return `Short-term losses (held < 1 year) offset short-term gains taxed at up to **37%**. Long-term losses (held > 1 year) offset long-term gains taxed at **0–20%**.\n\nYou have **${shortTerm.length} short-term** and **${longTerm.length} long-term** loss positions. Short-term losses are typically more tax-efficient to harvest because they save you more per dollar of loss.`;
  }

  if (q.includes('hello') || q.includes('hi') || q.includes('help')) {
    return `Hi! I'm your Tax Harvesting Assistant. I can help you:\n\n• Understand how much tax you can save right now\n• Explain the wash-sale rule and how to avoid it\n• Tell you which positions to sell first\n• Help you plan your year-end tax strategy\n\nWhat would you like to know?`;
  }

  return `Great question! Based on your current portfolio: you have **${opps.length} loss position${opps.length !== 1 ? 's' : ''}** with potential savings of **${fmtUSD(savings)}**. ${safeOpps.length} ${safeOpps.length !== 1 ? 'are' : 'is'} safe to harvest today. Try asking me "which positions should I sell first?" or "how much can I save?"`;
}

function TaxBot({ data }: { data: HarvestSummary | null }) {
  const [messages, setMessages] = useState<BotMessage[]>([
    { role: 'bot', text: "Hi! I'm your Tax Harvesting Assistant. I analyse your portfolio in real time and help you get the best tax outcome. Ask me anything, or tap a suggestion below." }
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send(text: string) {
    if (!text.trim()) return;
    setMessages(m => [...m, { role: 'user', text }]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      const response = getBotResponse(text, data);
      setMessages(m => [...m, { role: 'bot', text: response }]);
      setThinking(false);
    }, 600);
  }

  return (
    <div className="card flex flex-col h-[560px]">
      {/* Bot header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800">
        <div className="w-9 h-9 rounded-xl bg-brand-600/30 border border-brand-500/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.607L5 14.5m14.8.5l1.196 4.786a.75.75 0 01-.665.964H3.682a.75.75 0 01-.665-.964L4.2 15M5 14.5l-.8.392" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Tax Harvest Assistant</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400">Live — using your real portfolio data</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-brand-600/30 text-white border border-brand-500/30 rounded-tr-sm'
                : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-sm'
            }`}>
              {/* Render **bold** markdown */}
              {m.text.split('\n').map((line, li) => (
                <p key={li} className={li > 0 ? 'mt-2' : ''}>
                  {line.split(/\*\*(.*?)\*\*/g).map((part, pi) =>
                    pi % 2 === 1
                      ? <strong key={pi} className="text-white font-semibold">{part}</strong>
                      : part
                  )}
                </p>
              ))}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {BOT_SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          className="input flex-1 text-sm"
          placeholder="Ask about tax harvesting..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send(input)}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || thinking}
          className="btn-primary px-4 py-2 disabled:opacity-40"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
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
      <button
        onClick={onToggle}
        className="w-full text-left px-6 py-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-[160px]">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
              {opp.symbol.slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{opp.asset}</p>
              <p className="text-xs text-gray-500">{opp.exchangeName}</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-500 mb-0.5">Unrealised Loss</p>
            <p className="text-sm font-semibold text-red-400">{fmtUSD(opp.unrealizedLoss)}</p>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-500 mb-0.5">Est. Tax Savings</p>
            <p className="text-sm font-bold text-emerald-400">
              {opp.washSaleRisk ? '—' : fmtUSD(opp.taxSavings)}
            </p>
          </div>

          <div>
            <span className={opp.termType === 'long' ? 'badge-green' : 'badge-red'}>
              {opp.termType === 'long' ? 'Long-Term' : 'Short-Term'}
            </span>
          </div>

          <div className="min-w-[140px] text-right">
            {opp.washSaleRisk ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/15 border border-yellow-500/30 rounded-lg">
                <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-xs text-yellow-400 font-medium">
                  Wait {opp.daysUntilSafe}d
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

          <svg
            className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

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
                  <tr key={i}>
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
                <strong>Wash-Sale Warning:</strong> You must wait <strong>{opp.daysUntilSafe} more days</strong> before selling to ensure the loss is deductible.
                In the meantime, buy a correlated asset (e.g. sell ADA → buy DOT) to stay invested.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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

      {/* Two-column layout: opportunities + bot */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Opportunities */}
        <div className="lg:col-span-3">
          <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-400 mb-1">How Tax-Loss Harvesting Works</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Sell positions that are currently at a loss to lock in the loss for tax purposes.
              Those losses offset your realised gains — reducing your tax bill.
              After selling, wait <strong className="text-gray-300">31+ days</strong> before repurchasing
              to avoid the wash-sale rule.
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
              <p className="text-sm text-gray-500">All positions are currently at a gain. Ask the assistant for tips on planning ahead.</p>
            </div>
          )}
        </div>

        {/* Right: AI Bot */}
        <div className="lg:col-span-2">
          <TaxBot data={data} />
        </div>
      </div>
    </div>
  );
}
