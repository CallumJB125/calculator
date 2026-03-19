import {
  Exchange,
  Position,
  PortfolioSummary,
  TradesResponse,
  TradesSummary,
  TaxSummary,
  ExecutionQuoteResponse,
  TradableAsset,
  FundingFee,
  FundingFeeSummary,
  HarvestSummary,
  TaxPreview,
  ArbitrageScanResult,
  PortfolioAnalytics,
  StakingIncomeSummary,
  RebalancePlan,
  CostBasisComparison,
} from '../types';

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export const api = {
  exchanges: {
    list: () => get<Exchange[]>('/exchanges'),
    connect: (id: string, apiKey: string, apiSecret: string) =>
      post<{ success: boolean; exchange: Exchange }>(`/exchanges/${id}/connect`, { apiKey, apiSecret }),
    disconnect: (id: string) => del<{ success: boolean }>(`/exchanges/${id}/disconnect`),
    sync: (id: string) => post<{ success: boolean; lastSync: string }>(`/exchanges/${id}/sync`, {}),
  },
  positions: {
    list: (exchangeId?: string) =>
      get<Position[]>(`/positions${exchangeId ? `?exchange=${exchangeId}` : ''}`),
    summary: () => get<PortfolioSummary>('/positions/summary'),
  },
  trades: {
    list: (params: {
      exchange?: string;
      asset?: string;
      type?: string;
      year?: number;
      page?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params.exchange) query.set('exchange', params.exchange);
      if (params.asset)    query.set('asset', params.asset);
      if (params.type)     query.set('type', params.type);
      if (params.year)     query.set('year', String(params.year));
      if (params.page)     query.set('page', String(params.page));
      if (params.limit)    query.set('limit', String(params.limit));
      return get<TradesResponse>(`/trades?${query}`);
    },
    summary: (year?: number) =>
      get<TradesSummary>(`/trades/summary${year ? `?year=${year}` : ''}`),
  },
  taxes: {
    report: (year: number, method: 'fifo' | 'lifo' | 'hifo' = 'fifo') =>
      get<TaxSummary>(`/taxes/report?year=${year}&method=${method}`),
    years: () => get<number[]>('/taxes/years'),
    compare: (year: number) => get<CostBasisComparison>(`/taxes/compare?year=${year}`),
  },
  execution: {
    quotes: (asset: string, quantity: number, side: 'buy' | 'sell') =>
      get<ExecutionQuoteResponse>(`/execution/quotes?asset=${asset}&quantity=${quantity}&side=${side}`),
    assets: () => get<TradableAsset[]>('/execution/assets'),
  },
  funding: {
    fees: (params?: { exchange?: string; symbol?: string; year?: number }) => {
      const q = new URLSearchParams();
      if (params?.exchange) q.set('exchange', params.exchange);
      if (params?.symbol)   q.set('symbol', params.symbol);
      if (params?.year)     q.set('year', String(params.year));
      return get<FundingFee[]>(`/funding/fees?${q}`);
    },
    summary: (year?: number) =>
      get<FundingFeeSummary>(`/funding/summary${year ? `?year=${year}` : ''}`),
    years: () => get<number[]>('/funding/years'),
  },
  harvest: {
    opportunities: (year?: number) =>
      get<HarvestSummary>(`/harvest/opportunities${year ? `?year=${year}` : ''}`),
  },
  taxpreview: {
    calculate: (symbol: string, quantity: number, method: 'fifo' | 'lifo' | 'hifo' = 'fifo') =>
      get<TaxPreview>(`/taxpreview?symbol=${symbol}&quantity=${quantity}&method=${method}`),
  },
  arbitrage: {
    scan: (quantity?: number) =>
      get<ArbitrageScanResult>(`/arbitrage/scan${quantity ? `?quantity=${quantity}` : ''}`),
  },
  analytics: {
    risk: () => get<PortfolioAnalytics>('/analytics/risk'),
  },
  income: {
    staking: (year?: number) =>
      get<StakingIncomeSummary>(`/income/staking${year ? `?year=${year}` : ''}`),
    years: () => get<number[]>('/income/years'),
  },
  rebalance: {
    plan: (threshold?: number) =>
      get<RebalancePlan>(`/rebalance/plan${threshold !== undefined ? `?threshold=${threshold}` : ''}`),
  },
};
