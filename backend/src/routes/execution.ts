import { Router, Request, Response } from 'express';
import { getExchanges, isLiveMode } from '../services/liveData';
import { exchangeFeeStructures, positions } from '../services/mockData';
import { fetchPrices, getPrice } from '../services/prices';
import { fetchTickersForSymbol } from '../services/exchangeAdapters';
import { BrokerQuote } from '../types';

const router = Router();

// GET /api/execution/quotes?asset=BTC&quantity=0.5&side=buy
router.get('/quotes', (req: Request, res: Response) => {
  const { asset, quantity: quantityStr, side } = req.query;

  if (!asset || !quantityStr || !side) {
    return res.status(400).json({ error: 'asset, quantity, and side are required' });
  }

  const symbol = String(asset).toUpperCase();
  const quantity = parseFloat(String(quantityStr));
  const tradeSide = String(side).toLowerCase();

  if (isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'quantity must be a positive number' });
  }

  if (!['buy', 'sell'].includes(tradeSide)) {
    return res.status(400).json({ error: 'side must be buy or sell' });
  }

  // Resolve base price — prefer live CoinGecko price, fall back to static list
  let basePrice: number = getPrice(symbol) || 0;
  if (!basePrice) {
    const fallback = getPriceForSymbol(symbol);
    if (fallback) basePrice = fallback;
  }
  if (!basePrice) {
    return res.status(404).json({ error: `No price data found for ${symbol}` });
  }
  const tradeValue = basePrice * quantity;

  const exchangeList = getExchanges();
  const quotes: BrokerQuote[] = exchangeList.map(exchange => {
    const feeStructure = exchangeFeeStructures.find(f => f.exchangeId === exchange.id);
    if (!feeStructure) return null;

    const annualizationFactor = (24 / feeStructure.fundingInterval) * 365;
    const fundingRateAnnualized = feeStructure.fundingRate * annualizationFactor * 100;

    if (!exchange.connected) {
      return {
        exchangeId: exchange.id,
        exchangeName: exchange.name,
        connected: false,
        spotPrice: 0,
        estimatedFillPrice: 0,
        slippagePct: 0,
        tradingFee: 0,
        tradingFeePct: 0,
        fundingRate: feeStructure.fundingRate,
        fundingRateAnnualized,
        totalCost: 0,
        netCostPerUnit: 0,
        recommendation: 'poor' as const,
        available: false,
      };
    }

    // Simulate slight price variation per exchange (each exchange has a different mid)
    const seed = exchange.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const priceVariationPct = ((seed % 7) - 3) * 0.0008; // -0.24% to +0.24%
    const spotPrice = basePrice * (1 + priceVariationPct);

    // Market-order slippage: scales with trade size vs. typical liquidity
    const liquidityBase: Record<string, number> = {
      coinbase: 2_000_000,
      binance: 10_000_000,
      kraken: 3_000_000,
      gemini: 1_500_000,
      kucoin: 4_000_000,
    };
    const liquidity = liquidityBase[exchange.id] ?? 2_000_000;
    const volumeImpact = Math.min(tradeValue / liquidity, 0.003); // up to 0.3%
    const baseSlippage = feeStructure.takerFee * 0.5; // half taker fee as base slippage
    const slippagePct = (baseSlippage + volumeImpact) * (tradeSide === 'buy' ? 1 : -1) * 100;
    const estimatedFillPrice = spotPrice * (1 + slippagePct / 100);

    const tradingFeePct = feeStructure.takerFee * 100;
    const tradingFee = estimatedFillPrice * quantity * feeStructure.takerFee;

    const fillValue = estimatedFillPrice * quantity;
    const totalCost = tradeSide === 'buy'
      ? fillValue + tradingFee
      : fillValue - tradingFee;

    const netCostPerUnit = totalCost / quantity;

    return {
      exchangeId: exchange.id,
      exchangeName: exchange.name,
      connected: true,
      spotPrice: parseFloat(spotPrice.toFixed(2)),
      estimatedFillPrice: parseFloat(estimatedFillPrice.toFixed(2)),
      slippagePct: parseFloat(slippagePct.toFixed(4)),
      tradingFee: parseFloat(tradingFee.toFixed(2)),
      tradingFeePct,
      fundingRate: feeStructure.fundingRate,
      fundingRateAnnualized: parseFloat(fundingRateAnnualized.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      netCostPerUnit: parseFloat(netCostPerUnit.toFixed(2)),
      recommendation: 'good' as const, // set below
      available: true,
    };
  }).filter(Boolean) as BrokerQuote[];

  // Rank connected brokers — buy: lowest total cost is best; sell: highest proceeds is best
  const available = quotes.filter(q => q.available);
  if (available.length > 0) {
    const sorted = [...available].sort((a, b) =>
      tradeSide === 'buy' ? a.totalCost - b.totalCost : b.totalCost - a.totalCost
    );
    sorted[0].recommendation = 'best';
    sorted.slice(1).forEach((q, idx) => {
      q.recommendation = idx === sorted.length - 2 && sorted.length > 2 ? 'poor' : 'good';
    });
  }

  return res.json({
    asset: symbol,
    quantity,
    side: tradeSide,
    basePrice,
    quotes: quotes.sort((a, b) => {
      if (!a.available && b.available) return 1;
      if (a.available && !b.available) return -1;
      return 0;
    }),
  });
});

// Extended tradeable assets list with real-world prices
const TRADEABLE_ASSETS = [
  { symbol: 'BTC',  asset: 'Bitcoin',        currentPrice: 67420.00 },
  { symbol: 'ETH',  asset: 'Ethereum',       currentPrice: 3580.00  },
  { symbol: 'SOL',  asset: 'Solana',         currentPrice: 178.50   },
  { symbol: 'BNB',  asset: 'BNB',            currentPrice: 592.00   },
  { symbol: 'XRP',  asset: 'XRP',            currentPrice: 0.52     },
  { symbol: 'ADA',  asset: 'Cardano',        currentPrice: 0.48     },
  { symbol: 'AVAX', asset: 'Avalanche',      currentPrice: 36.20    },
  { symbol: 'DOGE', asset: 'Dogecoin',       currentPrice: 0.165    },
  { symbol: 'DOT',  asset: 'Polkadot',       currentPrice: 7.45     },
  { symbol: 'LINK', asset: 'Chainlink',      currentPrice: 14.80    },
  { symbol: 'MATIC',asset: 'Polygon',        currentPrice: 0.88     },
  { symbol: 'UNI',  asset: 'Uniswap',       currentPrice: 9.60     },
  { symbol: 'LTC',  asset: 'Litecoin',       currentPrice: 83.50    },
  { symbol: 'ATOM', asset: 'Cosmos',         currentPrice: 8.10     },
  { symbol: 'XLM',  asset: 'Stellar',        currentPrice: 0.125    },
  { symbol: 'ALGO', asset: 'Algorand',       currentPrice: 0.198    },
  { symbol: 'NEAR', asset: 'NEAR Protocol',  currentPrice: 7.30     },
  { symbol: 'FTM',  asset: 'Fantom',         currentPrice: 0.82     },
  { symbol: 'SAND', asset: 'The Sandbox',    currentPrice: 0.44     },
  { symbol: 'MANA', asset: 'Decentraland',   currentPrice: 0.39     },
  { symbol: 'APE',  asset: 'ApeCoin',        currentPrice: 1.25     },
  { symbol: 'ARB',  asset: 'Arbitrum',       currentPrice: 1.08     },
  { symbol: 'OP',   asset: 'Optimism',       currentPrice: 2.35     },
  { symbol: 'INJ',  asset: 'Injective',      currentPrice: 24.60    },
  { symbol: 'SUI',  asset: 'Sui',            currentPrice: 1.45     },
  { symbol: 'SEI',  asset: 'Sei',            currentPrice: 0.54     },
  { symbol: 'TIA',  asset: 'Celestia',       currentPrice: 8.90     },
  { symbol: 'JUP',  asset: 'Jupiter',        currentPrice: 0.92     },
  { symbol: 'WIF',  asset: 'Dogwifhat',      currentPrice: 2.78     },
  { symbol: 'PEPE', asset: 'Pepe',           currentPrice: 0.0000115 },
];

// GET /api/execution/assets — tradeable assets with current prices
router.get('/assets', (_req: Request, res: Response) => {
  return res.json(TRADEABLE_ASSETS);
});

// Helper to get price for any symbol
function getPriceForSymbol(symbol: string): number | null {
  const asset = TRADEABLE_ASSETS.find(a => a.symbol === symbol);
  if (asset) return asset.currentPrice;
  const pos = positions.find(p => p.symbol === symbol);
  return pos ? pos.currentPrice : null;
}

export default router;
