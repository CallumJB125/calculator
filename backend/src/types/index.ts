export interface Exchange {
  id: string;
  name: string;
  slug: string;
  logo: string;
  connected: boolean;
  apiKey?: string;
  apiSecret?: string;
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

export interface TaxLot {
  tradeId: string;
  date: string;
  quantity: number;
  costBasis: number;
  asset: string;
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

export interface ExchangeFeeStructure {
  exchangeId: string;
  exchangeName: string;
  makerFee: number;       // e.g. 0.001 = 0.1%
  takerFee: number;
  fundingRate: number;    // per funding interval, e.g. 0.0001 = 0.01%
  fundingInterval: number; // hours between funding payments
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

export interface FundingFee {
  id: string;
  positionId: string;
  exchangeId: string;
  exchangeName: string;
  asset: string;
  symbol: string;
  date: string;
  amount: number;       // positive = paid out, negative = received
  rate: number;
  positionSize: number; // USD value of position at funding time
}

export interface FundingFeeSummary {
  totalFeesPaid: number;
  totalFeesReceived: number;
  netFees: number;
  byAsset: Record<string, { paid: number; received: number; net: number }>;
  byExchange: Record<string, { paid: number; received: number; net: number }>;
  fees: FundingFee[];
}
