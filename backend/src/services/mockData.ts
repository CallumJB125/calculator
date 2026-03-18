import { Exchange, Position, Trade, ExchangeFeeStructure, FundingFee, StakingReward } from '../types';


export const exchanges: Exchange[] = [
  {
    id: 'coinbase',
    name: 'Coinbase',
    slug: 'coinbase',
    logo: 'CB',
    connected: true,
    apiKey: 'cb_**********************abc1',
    lastSync: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'binance',
    name: 'Binance',
    slug: 'binance',
    logo: 'BN',
    connected: true,
    apiKey: 'bn_**********************xyz9',
    lastSync: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'kraken',
    name: 'Kraken',
    slug: 'kraken',
    logo: 'KR',
    connected: false,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    slug: 'gemini',
    logo: 'GM',
    connected: false,
  },
  {
    id: 'kucoin',
    name: 'KuCoin',
    slug: 'kucoin',
    logo: 'KC',
    connected: false,
  },
];

export const exchangeFeeStructures: ExchangeFeeStructure[] = [
  { exchangeId: 'coinbase', exchangeName: 'Coinbase', makerFee: 0.004, takerFee: 0.006, fundingRate: 0.00015, fundingInterval: 8 },
  { exchangeId: 'binance',  exchangeName: 'Binance',  makerFee: 0.001, takerFee: 0.001, fundingRate: 0.0001,  fundingInterval: 8 },
  { exchangeId: 'kraken',   exchangeName: 'Kraken',   makerFee: 0.0016, takerFee: 0.0026, fundingRate: 0.00012, fundingInterval: 4 },
  { exchangeId: 'gemini',   exchangeName: 'Gemini',   makerFee: 0.002, takerFee: 0.003, fundingRate: 0.00018, fundingInterval: 8 },
  { exchangeId: 'kucoin',   exchangeName: 'KuCoin',   makerFee: 0.001, takerFee: 0.001, fundingRate: 0.00008, fundingInterval: 8 },
];

export const positions: Position[] = [
  {
    id: 'pos-1',
    exchangeId: 'coinbase',
    exchangeName: 'Coinbase',
    asset: 'Bitcoin',
    symbol: 'BTC',
    quantity: 0.845,
    avgCostBasis: 38250.0,
    currentPrice: 67420.0,
    currentValue: 56969.9,
    unrealizedPnl: 24705.65,
    unrealizedPnlPct: 76.5,
  },
  {
    id: 'pos-2',
    exchangeId: 'coinbase',
    exchangeName: 'Coinbase',
    asset: 'Ethereum',
    symbol: 'ETH',
    quantity: 4.2,
    avgCostBasis: 2100.0,
    currentPrice: 3580.0,
    currentValue: 15036.0,
    unrealizedPnl: 6216.0,
    unrealizedPnlPct: 70.48,
  },
  {
    id: 'pos-3',
    exchangeId: 'binance',
    exchangeName: 'Binance',
    asset: 'Bitcoin',
    symbol: 'BTC',
    quantity: 0.25,
    avgCostBasis: 42100.0,
    currentPrice: 67420.0,
    currentValue: 16855.0,
    unrealizedPnl: 6330.0,
    unrealizedPnlPct: 60.09,
  },
  {
    id: 'pos-4',
    exchangeId: 'binance',
    exchangeName: 'Binance',
    asset: 'Solana',
    symbol: 'SOL',
    quantity: 35.0,
    avgCostBasis: 85.0,
    currentPrice: 178.5,
    currentValue: 6247.5,
    unrealizedPnl: 3272.5,
    unrealizedPnlPct: 109.82,
  },
  {
    id: 'pos-5',
    exchangeId: 'binance',
    exchangeName: 'Binance',
    asset: 'Cardano',
    symbol: 'ADA',
    quantity: 5000.0,
    avgCostBasis: 0.65,
    currentPrice: 0.48,
    currentValue: 2400.0,
    unrealizedPnl: -850.0,
    unrealizedPnlPct: -26.15,
  },
  {
    id: 'pos-6',
    exchangeId: 'coinbase',
    exchangeName: 'Coinbase',
    asset: 'USD Coin',
    symbol: 'USDC',
    quantity: 3250.0,
    avgCostBasis: 1.0,
    currentPrice: 1.0,
    currentValue: 3250.0,
    unrealizedPnl: 0,
    unrealizedPnlPct: 0,
  },
];

// Generate realistic trade history for tax purposes
export const trades: Trade[] = [
  // 2023 trades
  {
    id: 'trade-1',
    exchangeId: 'coinbase',
    exchangeName: 'Coinbase',
    date: '2023-01-15T10:30:00Z',
    type: 'buy',
    asset: 'Bitcoin',
    symbol: 'BTC',
    quantity: 0.5,
    price: 21000.0,
    totalValue: 10500.0,
    fee: 26.25,
    feeCurrency: 'USD',
  },
  {
    id: 'trade-2',
    exchangeId: 'coinbase',
    exchangeName: 'Coinbase',
    date: '2023-03-22T14:15:00Z',
    type: 'buy',
    asset: 'Ethereum',
    symbol: 'ETH',
    quantity: 3.0,
    price: 1750.0,
    totalValue: 5250.0,
    fee: 13.13,
    feeCurrency: 'USD',
  },
  {
    id: 'trade-3',
    exchangeId: 'binance',
    exchangeName: 'Binance',
    date: '2023-05-10T09:00:00Z',
    type: 'buy',
    asset: 'Solana',
    symbol: 'SOL',
    quantity: 50.0,
    price: 22.5,
    totalValue: 1125.0,
    fee: 1.13,
    feeCurrency: 'USD',
  },
  {
    id: 'trade-4',
    exchangeId: 'coinbase',
    exchangeName: 'Coinbase',
    date: '2023-06-18T16:45:00Z',
    type: 'sell',
    asset: 'Bitcoin',
    symbol: 'BTC',
    quantity: 0.2,
    price: 26500.0,
    totalValue: 5300.0,
    fee: 13.25,
    feeCurrency: 'USD',
  },
  {
    id: 'trade-5',
    exchangeId: 'binance',
    exchangeName: 'Binance',
    date: '2023-08-05T11:20:00Z',
    type: 'buy',
    asset: 'Cardano',
    symbol: 'ADA',
    quantity: 5000.0,
    price: 0.31,
    totalValue: 1550.0,
    fee: 1.55,
    feeCurrency: 'USD',
  },
  {
    id: 'trade-6',
    exchangeId: 'coinbase',
    exchangeName: 'Coinbase',
    date: '2023-09-12T13:30:00Z',
    type: 'sell',
    asset: 'Solana',
    symbol: 'SOL',
    quantity: 15.0,
    price: 19.8,
    totalValue: 297.0,
    fee: 0.74,
    feeCurrency: 'USD',
  },
  {
    id: 'trade-7',
    exchangeId: 'coinbase',
    exchangeName: 'Coinbase',
    date: '2023-10-20T08:00:00Z',
    type: 'buy',
    asset: 'Bitcoin',
    symbol: 'BTC',
    quantity: 0.345,
    price: 28900.0,
    totalValue: 9970.5,
    fee: 24.93,
    feeCurrency: 'USD',
  },
  {
    id: 'trade-8',
    exchangeId: 'binance',
    exchangeName: 'Binance',
    date: '2023-11-25T15:00:00Z',
    type: 'buy',
    asset: 'Ethereum',
    symbol: 'ETH',
    quantity: 1.2,
    price: 2040.0,
    totalValue: 2448.0,
    fee: 2.45,
    feeCurrency: 'USD',
  },
  // 2024 trades
  {
    id: 'trade-9',
    exchangeId: 'coinbase',
    exchangeName: 'Coinbase',
    date: '2024-01-08T10:00:00Z',
    type: 'sell',
    asset: 'Bitcoin',
    symbol: 'BTC',
    quantity: 0.1,
    price: 44200.0,
    totalValue: 4420.0,
    fee: 11.05,
    feeCurrency: 'USD',
  },
  {
    id: 'trade-10',
    exchangeId: 'binance',
    exchangeName: 'Binance',
    date: '2024-02-14T12:00:00Z',
    type: 'buy',
    asset: 'Bitcoin',
    symbol: 'BTC',
    quantity: 0.25,
    price: 51800.0,
    totalValue: 12950.0,
    fee: 12.95,
    feeCurrency: 'USD',
  },
  {
    id: 'trade-11',
    exchangeId: 'coinbase',
    exchangeName: 'Coinbase',
    date: '2024-03-05T09:30:00Z',
    type: 'sell',
    asset: 'Ethereum',
    symbol: 'ETH',
    quantity: 1.5,
    price: 3850.0,
    totalValue: 5775.0,
    fee: 14.44,
    feeCurrency: 'USD',
  },
  {
    id: 'trade-12',
    exchangeId: 'binance',
    exchangeName: 'Binance',
    date: '2024-04-18T14:00:00Z',
    type: 'buy',
    asset: 'Solana',
    symbol: 'SOL',
    quantity: 20.0,
    price: 145.0,
    totalValue: 2900.0,
    fee: 2.9,
    feeCurrency: 'USD',
  },
  {
    id: 'trade-13',
    exchangeId: 'coinbase',
    exchangeName: 'Coinbase',
    date: '2024-05-22T11:00:00Z',
    type: 'sell',
    asset: 'Solana',
    symbol: 'SOL',
    quantity: 20.0,
    price: 170.0,
    totalValue: 3400.0,
    fee: 8.5,
    feeCurrency: 'USD',
  },
  {
    id: 'trade-14',
    exchangeId: 'coinbase',
    exchangeName: 'Coinbase',
    date: '2024-07-10T16:00:00Z',
    type: 'buy',
    asset: 'Ethereum',
    symbol: 'ETH',
    quantity: 2.5,
    price: 3100.0,
    totalValue: 7750.0,
    fee: 19.38,
    feeCurrency: 'USD',
  },
  {
    id: 'trade-15',
    exchangeId: 'binance',
    exchangeName: 'Binance',
    date: '2024-09-15T10:00:00Z',
    type: 'sell',
    asset: 'Cardano',
    symbol: 'ADA',
    quantity: 2000.0,
    price: 0.38,
    totalValue: 760.0,
    fee: 0.76,
    feeCurrency: 'USD',
  },
  {
    id: 'trade-16',
    exchangeId: 'binance',
    exchangeName: 'Binance',
    date: '2024-11-08T09:00:00Z',
    type: 'buy',
    asset: 'Cardano',
    symbol: 'ADA',
    quantity: 2000.0,
    price: 0.42,
    totalValue: 840.0,
    fee: 0.84,
    feeCurrency: 'USD',
  },
  {
    id: 'trade-17',
    exchangeId: 'coinbase',
    exchangeName: 'Coinbase',
    date: '2024-12-01T13:00:00Z',
    type: 'sell',
    asset: 'Bitcoin',
    symbol: 'BTC',
    quantity: 0.15,
    price: 95000.0,
    totalValue: 14250.0,
    fee: 35.63,
    feeCurrency: 'USD',
  },
  // 2025 trades
  {
    id: 'trade-18',
    exchangeId: 'coinbase',
    exchangeName: 'Coinbase',
    date: '2025-01-15T10:00:00Z',
    type: 'buy',
    asset: 'Bitcoin',
    symbol: 'BTC',
    quantity: 0.25,
    price: 101500.0,
    totalValue: 25375.0,
    fee: 63.44,
    feeCurrency: 'USD',
  },
  {
    id: 'trade-19',
    exchangeId: 'binance',
    exchangeName: 'Binance',
    date: '2025-02-20T14:00:00Z',
    type: 'sell',
    asset: 'Ethereum',
    symbol: 'ETH',
    quantity: 1.0,
    price: 2800.0,
    totalValue: 2800.0,
    fee: 7.0,
    feeCurrency: 'USD',
  },
  {
    id: 'trade-20',
    exchangeId: 'coinbase',
    exchangeName: 'Coinbase',
    date: '2025-03-05T09:00:00Z',
    type: 'buy',
    asset: 'Ethereum',
    symbol: 'ETH',
    quantity: 1.0,
    price: 2200.0,
    totalValue: 2200.0,
    fee: 5.5,
    feeCurrency: 'USD',
  },
];

// Generate daily funding fees for perpetual positions on Binance (BTC and SOL)
// Funding is paid every 8h; we record one aggregated daily entry per position
function generateFundingFees(): FundingFee[] {
  const fees: FundingFee[] = [];
  const now = new Date('2026-03-17T00:00:00Z');

  // BTC perp on Binance — 90 days
  for (let i = 90; i >= 1; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const btcPrice = 65000 + Math.sin(i * 0.1) * 5000;
    const positionSize = 0.25 * btcPrice;
    // funding rate varies around 0.01% per 8h, slightly negative sometimes
    const rate = 0.0001 + Math.sin(i * 0.2) * 0.00005;
    const amount = parseFloat((positionSize * rate * 3).toFixed(4)); // 3× per day

    fees.push({
      id: `ff-btc-${i}`,
      positionId: 'pos-3',
      exchangeId: 'binance',
      exchangeName: 'Binance',
      asset: 'Bitcoin',
      symbol: 'BTC',
      date: date.toISOString(),
      amount,
      rate: parseFloat((rate * 3).toFixed(6)),
      positionSize: parseFloat(positionSize.toFixed(2)),
    });
  }

  // SOL perp on Binance — 90 days
  for (let i = 90; i >= 1; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(8, 0, 0, 0);

    const solPrice = 170 + Math.sin(i * 0.15) * 20;
    const positionSize = 35 * solPrice;
    const rate = 0.00008 + Math.sin(i * 0.3) * 0.00003;
    const amount = parseFloat((positionSize * rate * 3).toFixed(4));

    fees.push({
      id: `ff-sol-${i}`,
      positionId: 'pos-4',
      exchangeId: 'binance',
      exchangeName: 'Binance',
      asset: 'Solana',
      symbol: 'SOL',
      date: date.toISOString(),
      amount,
      rate: parseFloat((rate * 3).toFixed(6)),
      positionSize: parseFloat(positionSize.toFixed(2)),
    });
  }

  return fees;
}

export const fundingFees: FundingFee[] = generateFundingFees();

// Generate weekly staking rewards for ETH (Coinbase, 3.5% APY) and SOL (Binance, 7% APY)
function generateStakingRewards(): StakingReward[] {
  const rewards: StakingReward[] = [];
  const now = new Date('2026-03-17T00:00:00Z');

  // ETH staking on Coinbase — 52 weeks, 3.5% APY on 4.2 ETH
  const ethWeeklyBase = (4.2 * 0.035) / 52; // ≈ 0.002827 ETH/week
  for (let i = 52; i >= 1; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 7);
    const ethPrice = 3200 + Math.sin(i * 0.18) * 400;
    const quantity = parseFloat((ethWeeklyBase * (1 + Math.sin(i * 0.25) * 0.05)).toFixed(6));
    const valueUSD = parseFloat((quantity * ethPrice).toFixed(2));
    rewards.push({
      id: `sr-eth-${i}`,
      exchangeId: 'coinbase',
      exchangeName: 'Coinbase',
      asset: 'Ethereum',
      symbol: 'ETH',
      date: date.toISOString(),
      quantity,
      valueUSD,
      priceAtReceipt: parseFloat(ethPrice.toFixed(2)),
    });
  }

  // SOL staking on Binance — 52 weeks, 7% APY on 35 SOL
  const solWeeklyBase = (35 * 0.07) / 52; // ≈ 0.04712 SOL/week
  for (let i = 52; i >= 1; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 7);
    date.setHours(12, 0, 0, 0);
    const solPrice = 170 + Math.sin(i * 0.22) * 25;
    const quantity = parseFloat((solWeeklyBase * (1 + Math.sin(i * 0.3) * 0.05)).toFixed(6));
    const valueUSD = parseFloat((quantity * solPrice).toFixed(2));
    rewards.push({
      id: `sr-sol-${i}`,
      exchangeId: 'binance',
      exchangeName: 'Binance',
      asset: 'Solana',
      symbol: 'SOL',
      date: date.toISOString(),
      quantity,
      valueUSD,
      priceAtReceipt: parseFloat(solPrice.toFixed(2)),
    });
  }

  return rewards;
}

export const stakingRewards: StakingReward[] = generateStakingRewards();
