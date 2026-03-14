import { Exchange, Position, PortfolioSummary, TradesResponse, TradesSummary, TaxSummary } from '../types';

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
      if (params.asset) query.set('asset', params.asset);
      if (params.type) query.set('type', params.type);
      if (params.year) query.set('year', String(params.year));
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      return get<TradesResponse>(`/trades?${query}`);
    },
    summary: (year?: number) =>
      get<TradesSummary>(`/trades/summary${year ? `?year=${year}` : ''}`),
  },
  taxes: {
    report: (year: number, method: 'fifo' | 'lifo' | 'hifo' = 'fifo') =>
      get<TaxSummary>(`/taxes/report?year=${year}&method=${method}`),
    years: () => get<number[]>('/taxes/years'),
  },
};
