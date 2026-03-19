# CryptoTax Hub

A professional crypto portfolio and tax management platform supporting multiple exchanges, with features that go beyond what most commercial tools offer.

## Features

### Portfolio Management
- **Exchange Connections** — Connect Coinbase, Binance, Kraken, Gemini, KuCoin via API keys
- **Portfolio Dashboard** — Real-time overview of all positions, P&L, and unrealized gains
- **Positions** — Per-exchange and consolidated views with weighted average cost basis across exchanges
- **Trade History** — Filterable trade log with pagination (by exchange, asset, type, year)

### Execution & Trading
- **Best Execution** — Compare which broker fills closest to market price with least total fees (including funding fees)
- **Arbitrage Radar** — Cross-exchange arbitrage scanner showing net profit after all fees and break-even quantities

### Tax Tools
- **Tax Report** — Capital gains/losses with FIFO, LIFO, HIFO cost basis methods + CSV export
- **Cost Basis Method Optimizer** — Side-by-side FIFO/LIFO/HIFO comparison with recommendation and one-click method switching
- **Tax-Loss Harvesting Engine** — Identifies harvest opportunities, enforces wash-sale rule (30-day window), calculates tax savings per lot
- **"What If I Sell?" Preview** — Instant tax impact per position with smart insight if waiting flips a lot to long-term

### Income Tracking
- **Funding Fees Tracker** — Per-position and cumulative funding fees, deductible as investment expenses (IRC §212)
- **Staking & Yield Income** — Tracks ETH and SOL staking rewards as ordinary income with full IRS tax treatment

### Analytics & Planning
- **Risk Analytics** — Sharpe ratio, 1-day 95% VaR, HHI concentration, correlation matrix, diversification score
- **Portfolio Rebalancer** — Tax-aware rebalancing to target allocations with drift detection and trade suggestions

## Getting Started

### Install dependencies
```bash
npm run install:all
```

### Run in development
```bash
# Run both backend (port 3001) and frontend (port 5173) together
npm run dev

# Or separately
npm run dev:backend
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173)

## Architecture

```
CEX-UI/
├── backend/                  # Express + TypeScript API (port 3001)
│   └── src/
│       ├── routes/           # One file per feature endpoint
│       │   ├── exchanges.ts
│       │   ├── positions.ts
│       │   ├── trades.ts
│       │   ├── taxes.ts      # /report, /years, /compare
│       │   ├── execution.ts  # Best execution quotes
│       │   ├── funding.ts    # Funding fee tracking
│       │   ├── harvest.ts    # Tax-loss harvesting
│       │   ├── taxpreview.ts # "What if I sell?" preview
│       │   ├── arbitrage.ts  # Cross-exchange arb scanner
│       │   ├── analytics.ts  # Risk analytics
│       │   ├── income.ts     # Staking/yield income
│       │   └── rebalance.ts  # Portfolio rebalancer
│       ├── services/
│       │   ├── mockData.ts   # Deterministic mock data (Math.sin-based)
│       │   └── taxCalculator.ts  # FIFO/LIFO/HIFO engine
│       └── types/            # Shared TypeScript types
└── frontend/                 # React 18 + TypeScript + Vite + Tailwind CSS (port 5173)
    └── src/
        ├── pages/            # One page per feature
        ├── components/       # Layout, sidebar nav
        ├── services/         # API client
        └── types/            # Shared TypeScript types
```

## Tax Calculation Methods

| Method | Description |
|--------|-------------|
| FIFO   | First In, First Out — oldest lots sold first (most common) |
| LIFO   | Last In, First Out — newest lots sold first |
| HIFO   | Highest In, First Out — highest cost lots sold first (minimises gains) |

## Extending with Real Exchange APIs

Replace the mock data in `backend/src/services/mockData.ts` with real API calls:

- **Coinbase**: `coinbase-advanced-trade` npm package
- **Binance**: `binance` npm package
- **Kraken**: `kraken-api` npm package
