# CryptoTax Hub

A central UI for managing crypto portfolios and calculating taxes across multiple exchanges.

## Features

- **Exchange Connections** — Connect Coinbase, Binance, Kraken, Gemini, KuCoin via API keys
- **Portfolio Dashboard** — Real-time overview of all positions, P&L, and unrealized gains
- **Open Positions** — View current holdings across all exchanges in one table
- **Trade History** — Filterable trade log with pagination (by exchange, asset, type, year)
- **Tax Report** — Capital gains/losses with FIFO, LIFO, HIFO cost basis methods + CSV export

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
crypto-tax-hub/
├── backend/          # Express + TypeScript API
│   └── src/
│       ├── routes/   # /api/exchanges, /api/positions, /api/trades, /api/taxes
│       ├── services/ # Mock data + tax calculator (FIFO/LIFO/HIFO)
│       └── types/    # Shared TypeScript types
└── frontend/         # React + TypeScript + Tailwind CSS
    └── src/
        ├── pages/    # Dashboard, Exchanges, Positions, TradeHistory, TaxReport
        ├── services/ # API client
        └── types/    # Shared TypeScript types
```

## Extending with Real Exchange APIs

Each exchange in the backend can be extended to use real API clients:

- **Coinbase**: `coinbase-advanced-trade` npm package
- **Binance**: `binance` npm package
- **Kraken**: `kraken-api` npm package

Replace the mock data in `backend/src/services/mockData.ts` with real API calls per exchange.

## Tax Calculation Methods

| Method | Description |
|--------|-------------|
| FIFO   | First In, First Out — oldest lots sold first (most common) |
| LIFO   | Last In, First Out — newest lots sold first |
| HIFO   | Highest In, First Out — highest cost lots sold first (minimizes gains) |
