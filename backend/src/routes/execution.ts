import { Router, Request, Response } from 'express';
import { exchanges, exchangeFeeStructures, positions } from '../services/mockData';
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

  // Resolve base price from any position holding this symbol
  const position = positions.find(p => p.symbol === symbol);
  if (!position) {
    return res.status(404).json({ error: `No price data found for ${symbol}` });
  }

  const basePrice = position.currentPrice;
  const tradeValue = basePrice * quantity;

  const quotes: BrokerQuote[] = exchanges.map(exchange => {
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

// GET /api/execution/assets — tradeable assets with current prices
router.get('/assets', (_req: Request, res: Response) => {
  const seen = new Set<string>();
  const assets = positions
    .filter(p => {
      if (seen.has(p.symbol)) return false;
      seen.add(p.symbol);
      return true;
    })
    .map(p => ({ symbol: p.symbol, asset: p.asset, currentPrice: p.currentPrice }));
  return res.json(assets);
});

export default router;
