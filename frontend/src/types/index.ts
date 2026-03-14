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
}

export interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  totalUnrealizedPnl: number;
  totalUnrealizedPnlPct: number;
  byAsset: Record<string, { value: number; pnl: number }>;
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
  events: TaxEvent[];
}
