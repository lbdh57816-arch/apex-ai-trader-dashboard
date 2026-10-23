# Apex AI Trader Dashboard

Pure client-side React trading dashboard for Vercel deployment.

## Features
- Live market data via client-side fetch to Binance, Metals.live and Frankfurter
- Manual analysis mode for BTC/USD, ETH/USD, XAUUSD and EUR/USD
- Timeframe selector: 1m, 5m, 15m, 30m, 1h, 4h
- Signal engine using RSI, EMA, MACD, Bollinger Bands and Price Action
- Trade output includes entry, TP1/TP2/TP3, stop loss, break-even and trailing stop

## Run locally

```bash
npm install
npm run dev
```

## Build for production

```bash
npm run build
```
