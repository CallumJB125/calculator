export interface Exchange {
  id: string;
  name: string;
  slug: string;
  logo: string;
  connected: boolean;
  apiKey?: string;
  lastSync?: string;
}

export interface Position {
  id: string;
  exchangeId: string;
  exchangeName: string;
  asset: string;
  symbol: string;
  quantity: number;
  avgCostBasis: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  totalFundingFeesPaid?: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  totalUnrealizedPnl: number;
  totalUnrealizedPnlPct: number;
  totalFundingFeesPaid: number;
  byAsset: Record<string, {
    value: number;
    pnl: number;
    totalQty: number;
    totalCost: number;
    avgCostBasis: number;
    currentPrice: number;
    fundingFeesPaid: number;
  }>;
  positionCount: number;
}

export interface Trade {
  id: string;
  exchangeId: string;
  exchangeName: string;
  date: string;
  type: 'buy' | 'sell';
  asset: string;
  symbol: string;
  quantity: number;
  price: number;
  totalValue: number;
  fee: number;
  feeCurrency: string;
}

export interface TradesResponse {
  trades: Trade[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TradesSummary {
  totalTrades: number;
  buyCount: number;
  sellCount: number;
  totalBuys: number;
  totalSells: number;
  totalFees: number;
  availableYears: number[];
}

export interface TaxEvent {
  id: string;
  asset: string;
  symbol: string;
  exchangeName: string;
  sellDate: string;
  buyDate: string;
  quantity: number;
  proceeds: number;
  costBasis: number;
  gain: number;
  termType: 'short' | 'long';
  holdingDays: number;
}

export interface TaxSummary {
  taxYear: number;
  totalProceeds: number;
  totalCostBasis: number;
  shortTermGain: number;
  longTermGain: number;
  totalGain: number;
  totalDeductibleFundingFees: number;
  netTaxableGain: number;
  events: TaxEvent[];
}

export interface BrokerQuote {
  exchangeId: string;
  exchangeName: string;
  connected: boolean;
  spotPrice: number;
  estimatedFillPrice: number;
  slippagePct: number;
  tradingFee: number;
  tradingFeePct: number;
  fundingRate: number;
  fundingRateAnnualized: number;
  totalCost: number;
  netCostPerUnit: number;
  recommendation: 'best' | 'good' | 'poor';
  available: boolean;
}

export interface ExecutionQuoteResponse {
  asset: string;
  quantity: number;
  side: string;
  basePrice: number;
  quotes: BrokerQuote[];
}

export interface TradableAsset {
  symbol: string;
  asset: string;
  currentPrice: number;
}

export interface FundingFee {
  id: string;
  positionId: string;
  exchangeId: string;
  exchangeName: string;
  asset: string;
  symbol: string;
  date: string;
  amount: number;
  rate: number;
  positionSize: number;
}

export interface FundingFeeSummary {
  totalFeesPaid: number;
  totalFeesReceived: number;
  netFees: number;
  byAsset: Record<string, { paid: number; received: number; net: number }>;
  byExchange: Record<string, { paid: number; received: number; net: number }>;
  fees: FundingFee[];
}

// ── Tax-Loss Harvesting ───────────────────────────────────────────────────────

export interface HarvestLot {
  buyDate: string;
  daysHeld: number;
  termType: 'short' | 'long';
  daysUntilLongTerm: number;
  quantity: number;
  costBasis: number;
}

export interface HarvestOpportunity {
  positionId: string;
  exchangeId: string;
  exchangeName: string;
  asset: string;
  symbol: string;
  quantity: number;
  avgCostBasis: number;
  currentPrice: number;
  currentValue: number;
  unrealizedLoss: number;
  taxSavings: number;
  washSaleRisk: boolean;
  daysUntilSafe: number;
  daysHeld: number;
  termType: 'short' | 'long';
  savingsRate: number;
  lots: HarvestLot[];
}

export interface HarvestSummary {
  taxYear: number;
  existingGainsThisYear: number;
  totalUnrealizedLoss: number;
  totalPotentialSavings: number;
  netGainAfterHarvest: number;
  opportunities: HarvestOpportunity[];
}

// ── Tax Preview ───────────────────────────────────────────────────────────────

export interface TaxPreviewLot {
  buyDate: string;
  quantity: number;
  costPerUnit: number;
  costBasisTotal: number;
  proceeds: number;
  gain: number;
  daysHeld: number;
  termType: 'short' | 'long';
  daysUntilLongTerm: number;
  estimatedTax: number;
}

export interface TaxPreviewInsight {
  type: string;
  message: string;
  daysToWait: number;
  potentialSavings: number;
  flipDate: string;
}

export interface TaxPreview {
  symbol: string;
  quantity: number;
  currentPrice: number;
  proceeds: number;
  costBasis: number;
  gain: number;
  shortTermGain: number;
  longTermGain: number;
  estimatedTax: number;
  effectiveRate: number;
  taxCostPct: number;
  method: string;
  lots: TaxPreviewLot[];
  insight: TaxPreviewInsight | null;
}

// ── Arbitrage ─────────────────────────────────────────────────────────────────

export interface ArbitrageOpportunity {
  asset: string;
  symbol: string;
  quantity: number;
  buyExchange: string;
  buyExchangeId: string;
  buyPrice: number;
  buyFee: number;
  sellExchange: string;
  sellExchangeId: string;
  sellPrice: number;
  sellFee: number;
  grossSpread: number;
  grossSpreadPct: number;
  totalFees: number;
  netProfit: number;
  netProfitPct: number;
  viable: boolean;
  breakEvenUnits: number | null;
}

export interface ArbitrageScanResult {
  scannedAt: string;
  connectedExchanges: string[];
  quantity: number;
  opportunities: ArbitrageOpportunity[];
  viableCount: number;
}

// ── Staking Income ────────────────────────────────────────────────────────────

export interface StakingReward {
  id: string;
  exchangeId: string;
  exchangeName: string;
  asset: string;
  symbol: string;
  date: string;
  quantity: number;
  valueUSD: number;
  priceAtReceipt: number;
}

export interface StakingIncomeSummary {
  taxYear: number;
  totalIncomeUSD: number;
  estimatedTax: number;
  byAsset: Record<string, { quantity: number; valueUSD: number; priceAvg: number }>;
  byExchange: Record<string, { quantity: number; valueUSD: number }>;
  rewards: StakingReward[];
}

// ── Rebalancing ───────────────────────────────────────────────────────────────

export interface RebalanceTarget {
  symbol: string;
  asset: string;
  targetPct: number;
  currentPct: number;
  drift: number;
  currentValue: number;
  targetValue: number;
}

export interface RebalanceTrade {
  action: 'buy' | 'sell';
  symbol: string;
  asset: string;
  quantity: number;
  valueUSD: number;
  recommendedExchange: string;
  estimatedTaxImpact: number;
  reason: string;
}

export interface RebalancePlan {
  totalPortfolioValue: number;
  targets: RebalanceTarget[];
  trades: RebalanceTrade[];
  estimatedTotalTax: number;
  driftThreshold: number;
}

// ── Cost Basis Comparison ─────────────────────────────────────────────────────

export interface CostBasisMethodResult {
  method: 'fifo' | 'lifo' | 'hifo';
  totalGain: number;
  shortTermGain: number;
  longTermGain: number;
  estimatedTax: number;
  netTaxableGain: number;
}

export interface CostBasisComparison {
  taxYear: number;
  results: CostBasisMethodResult[];
  bestMethod: 'fifo' | 'lifo' | 'hifo';
  worstMethod: 'fifo' | 'lifo' | 'hifo';
  maxSavingsVsWorst: number;
  recommendation: string;
}

// ── Portfolio Analytics ───────────────────────────────────────────────────────

export interface ConcentrationEntry {
  symbol: string;
  value: number;
  pct: number;
  pnl: number;
  pnlPct: number;
}

export interface PortfolioAnalytics {
  totalValue: number;
  concentration: ConcentrationEntry[];
  herfindahlIndex: number;
  concentrationRisk: 'high' | 'medium' | 'low';
  diversificationScore: number;
  bestPerformer:  { symbol: string; pct: number; pnl: number } | null;
  worstPerformer: { symbol: string; pct: number; pnl: number } | null;
  correlations: Array<{ asset1: string; asset2: string; correlation: number }>;
  riskMetrics: {
    portfolioVolatility: number;
    sharpeRatio: number;
    maxDrawdownEstimate: number;
    valueAtRisk95: number;
    dailyVolatilityPct: number;
  };
}
