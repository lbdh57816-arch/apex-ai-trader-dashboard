import { useEffect, useMemo, useState } from 'react';

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h'];
const MARKET_OPTIONS = [
  { label: 'BTC/USD', value: 'BTCUSD' },
  { label: 'ETH/USD', value: 'ETHUSD' },
  { label: 'XAUUSD', value: 'XAUUSD' },
  { label: 'EUR/USD', value: 'EURUSD' }
];

function cleanNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatMoney(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '$0.00';
  if (number >= 1000) return `$${number.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (number >= 1) return `$${number.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
  return `$${number.toFixed(4)}`;
}

function formatPercent(value) {
  const number = Number(value || 0);
  return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%`;
}

function getDisplaySymbol(symbol) {
  switch (symbol) {
    case 'BTCUSD':
      return 'BTC/USD';
    case 'ETHUSD':
      return 'ETH/USD';
    case 'XAUUSD':
      return 'XAUUSD';
    case 'EURUSD':
      return 'EUR/USD';
    default:
      return symbol;
  }
}

function buildSyntheticHistory(basePrice, direction = 1, points = 120) {
  const output = [];
  let current = Number(basePrice) || 100;

  for (let index = 0; index < points; index += 1) {
    const wave = Math.sin(index / 7) * (current * 0.008);
    const drift = (index / points) * current * 0.02 * direction;
    const noise = (Math.random() - 0.5) * current * 0.004;
    current = current + wave * 0.35 + drift * 0.12 + noise;
    output.push(Number(current.toFixed(4)));
  }

  return output;
}

function calculateEMA(values, period) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const multiplier = 2 / (period + 1);
  let ema = Number(values[0]);

  for (let index = 1; index < values.length; index += 1) {
    ema = Number(values[index]) * multiplier + ema * (1 - multiplier);
  }

  return ema;
}

function calculateRSI(values, period = 14) {
  if (!Array.isArray(values) || values.length <= period) return 50;

  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const delta = Number(values[index]) - Number(values[index - 1]);
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }

  const averageGain = gains / period;
  const averageLoss = losses / period;

  if (averageLoss === 0) return 100;
  const relativeStrength = averageGain / averageLoss;
  return 100 - 100 / (1 + relativeStrength);
}

function calculateMACD(values) {
  if (!Array.isArray(values) || values.length < 26) return 0;
  const fast = calculateEMA(values, 12);
  const slow = calculateEMA(values, 26);
  return fast - slow;
}

function calculateBollinger(values, period = 20) {
  const slice = values.slice(-period);
  if (!slice.length) return { upper: 0, lower: 0, middle: 0 };

  const middle = slice.reduce((sum, value) => sum + Number(value), 0) / slice.length;
  const variance = slice.reduce((sum, value) => sum + (Number(value) - middle) ** 2, 0) / slice.length;
  const stdDev = Math.sqrt(variance);

  return {
    upper: middle + stdDev * 2,
    lower: middle - stdDev * 2,
    middle
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

async function fetchBitcoinPrice() {
  try {
    const data = await fetchJson('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
    return {
      price: cleanNumber(data.lastPrice, 0),
      changePercent: cleanNumber(data.priceChangePercent, 0),
      high: cleanNumber(data.highPrice, 0),
      low: cleanNumber(data.lowPrice, 0),
      source: 'live'
    };
  } catch (error) {
    return {
      price: 0,
      changePercent: 0,
      high: 0,
      low: 0,
      source: 'offline'
    };
  }
}

async function fetchEthereumPrice() {
  try {
    const data = await fetchJson('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT');
    return {
      price: cleanNumber(data.lastPrice, 0),
      changePercent: cleanNumber(data.priceChangePercent, 0),
      high: cleanNumber(data.highPrice, 0),
      low: cleanNumber(data.lowPrice, 0),
      source: 'live'
    };
  } catch (error) {
    return {
      price: 0,
      changePercent: 0,
      high: 0,
      low: 0,
      source: 'offline'
    };
  }
}

async function fetchGoldPrice() {
  try {
    const payload = await fetchJson('https://api.metals.live/v1/spot');
    const gold = Array.isArray(payload)
      ? payload.find((item) => item?.name?.toLowerCase() === 'gold' || item?.symbol?.toUpperCase() === 'XAU' || item?.code?.toUpperCase() === 'XAU') || payload[0]
      : null;

    if (gold) {
      const price = cleanNumber(gold.price ?? gold.gold ?? gold.value ?? gold.ask ?? 0, 0);
      const change = cleanNumber(gold.change ?? gold.percentChange ?? 0, 0);
      return {
        price,
        changePercent: change,
        high: cleanNumber(gold.high ?? price * 1.01, price),
        low: cleanNumber(gold.low ?? price * 0.99, price),
        source: 'live'
      };
    }
  } catch (error) {
    // fallback is handled below
  }

  return {
    price: 0,
    changePercent: 0,
    high: 0,
    low: 0,
    source: 'offline'
  };
}

async function fetchEuroDollarPrice() {
  try {
    const data = await fetchJson('https://api.frankfurter.app/latest?from=EUR&to=USD');
    const rate = cleanNumber(data?.rates?.USD, 0);
    return {
      price: rate,
      changePercent: 0,
      high: rate * 1.003,
      low: rate * 0.997,
      source: 'live'
    };
  } catch (error) {
    return {
      price: 0,
      changePercent: 0,
      high: 0,
      low: 0,
      source: 'offline'
    };
  }
}

async function fetchMarketSnapshot(symbols) {
  const tasks = symbols.map(async (symbol) => {
    let market = { price: 0, changePercent: 0, high: 0, low: 0, source: 'offline' };

    if (symbol === 'BTCUSD') {
      market = await fetchBitcoinPrice();
    } else if (symbol === 'ETHUSD') {
      market = await fetchEthereumPrice();
    } else if (symbol === 'XAUUSD') {
      market = await fetchGoldPrice();
    } else if (symbol === 'EURUSD') {
      market = await fetchEuroDollarPrice();
    }

    return {
      symbol: getDisplaySymbol(symbol),
      normalizedSymbol: symbol,
      price: Number(market.price || 0),
      changePercent: Number(market.changePercent || 0),
      high: Number(market.high || market.price || 0),
      low: Number(market.low || market.price || 0),
      source: market.source || 'offline'
    };
  });

  return Promise.all(tasks);
}

async function fetchSeriesForSymbol(symbol, timeframe, basePrice = 100) {
  const intervalMap = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '4h': '4h'
  };

  const interval = intervalMap[timeframe] || '1h';

  if (symbol === 'BTCUSD') {
    try {
      const data = await fetchJson(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=120`);
      const closes = data.map((entry) => cleanNumber(entry[4], 0)).filter((value) => value > 0);
      return closes.length ? closes : buildSyntheticHistory(basePrice || 100, 1, 120);
    } catch (error) {
      return buildSyntheticHistory(basePrice || 100, 1, 120);
    }
  }

  if (symbol === 'ETHUSD') {
    try {
      const data = await fetchJson(`https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=${interval}&limit=120`);
      const closes = data.map((entry) => cleanNumber(entry[4], 0)).filter((value) => value > 0);
      return closes.length ? closes : buildSyntheticHistory(basePrice || 100, 1, 120);
    } catch (error) {
      return buildSyntheticHistory(basePrice || 100, 1, 120);
    }
  }

  if (symbol === 'XAUUSD') {
    return buildSyntheticHistory(basePrice || 2500, 1, 120);
  }

  if (symbol === 'EURUSD') {
    return buildSyntheticHistory(basePrice || 1.08, 1, 120);
  }

  return buildSyntheticHistory(basePrice || 100, 1, 120);
}

function buildSignalFromMetrics(symbol, price, series, timeframe) {
  const closes = Array.isArray(series) && series.length ? series : buildSyntheticHistory(price || 100, 1, 120);
  const latest = Number(closes[closes.length - 1] || price || 0);
  const previous = Number(closes[closes.length - 2] || latest || 0);
  const deltaPercent = previous === 0 ? 0 : ((latest - previous) / previous) * 100;

  const rsi = calculateRSI(closes);
  const emaFast = calculateEMA(closes, 9);
  const emaSlow = calculateEMA(closes, 21);
  const macd = calculateMACD(closes);
  const bollinger = calculateBollinger(closes);

  let direction = 'buy';
  if (latest < emaFast && latest < emaSlow && rsi < 45) direction = 'sell';
  else if (latest > emaFast && latest > emaSlow && rsi > 55) direction = 'buy';
  else if (deltaPercent < -0.45 && macd < 0 && latest < bollinger.lower) direction = 'sell';
  else if (deltaPercent > 0.45 && macd > 0 && latest > bollinger.upper) direction = 'buy';

  const isBuy = direction === 'buy';
  const volatility = Math.max(0.0015, Math.abs(bollinger.upper - bollinger.lower) / (latest || 1));
  const risk = (latest || 1) * volatility * (symbol === 'BTCUSD' ? 0.9 : symbol === 'XAUUSD' ? 0.7 : 1.2);
  const stopLoss = isBuy ? latest - risk * 1.4 : latest + risk * 1.35;
  const takeProfit1 = isBuy ? latest + risk * 1.8 : latest - risk * 2.1;
  const takeProfit2 = isBuy ? latest + risk * 2.8 : latest - risk * 3.2;
  const takeProfit3 = isBuy ? latest + risk * 4.2 : latest - risk * 4.6;
  const breakEven = isBuy ? latest + risk * 0.35 : latest - risk * 0.35;
  const trailingStop = isBuy ? latest + risk * 0.7 : latest - risk * 0.7;
  const confidence = clamp(Math.round(72 + Math.abs(rsi - 50) * 0.6 + (isBuy ? 8 : 0) + Math.abs(macd) * 80), 72, 96);
  const lotSize = clamp((Math.abs(deltaPercent) * 4 + 0.25) * (symbol === 'BTCUSD' ? 0.9 : symbol === 'XAUUSD' ? 0.7 : 1.2), 0.01, 10).toFixed(2);

  const notes = [
    `RSI: ${rsi.toFixed(1)} — ${rsi > 70 ? 'المنطقة تشهد شراء مفرط' : rsi < 30 ? 'المنطقة تشهد بيع مفرط' : 'الزخم متوازن'}`,
    `EMA 9 / EMA 21: ${emaFast.toFixed(4)} / ${emaSlow.toFixed(4)} — ${latest >= emaFast && latest >= emaSlow ? 'السعر أعلى المتوسطات' : 'السعر تحت المتوسطات'}`,
    `MACD: ${macd.toFixed(4)} — ${macd > 0 ? 'تأكيد صعودي' : 'تأكيد هبوطي'}`,
    `Bollinger Bands: ${latest > bollinger.upper ? 'السعر فوق النطاق العلوي' : latest < bollinger.lower ? 'السعر تحت النطاق السفلي' : 'السعر داخل النطاق'}`,
    `الفريم ${timeframe} يُظهر ${isBuy ? 'قوة صعودية مستدامة مع إشارات شراء' : 'قوة هبوطية واضحة مع إشارات بيع'} بناءً على السعر المباشر الحالي.`
  ];

  return {
    symbol: getDisplaySymbol(symbol),
    normalizedSymbol: symbol,
    timeframe,
    direction,
    entry: latest,
    tp1: takeProfit1,
    tp2: takeProfit2,
    tp3: takeProfit3,
    stopLoss,
    breakEven,
    trailingStop,
    confidence,
    lotSize,
    riskReward: Number((Math.abs(takeProfit1 - latest) / Math.abs(latest - stopLoss || 1)).toFixed(2)),
    priceDelta: Number(deltaPercent.toFixed(3)),
    metrics: {
      rsi: Number(rsi.toFixed(1)),
      macd: Number(macd.toFixed(4)),
      emaFast: Number(emaFast.toFixed(4)),
      emaSlow: Number(emaSlow.toFixed(4)),
      bollingerUpper: Number(bollinger.upper.toFixed(4)),
      bollingerLower: Number(bollinger.lower.toFixed(4))
    },
    notes
  };
}

function App() {
  const [markets, setMarkets] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  const selectedMarket = useMemo(
    () => markets.find((market) => market.normalizedSymbol === selectedSymbol) || markets[0],
    [markets, selectedSymbol]
  );

  const refreshMarkets = async () => {
    try {
      const snapshot = await fetchMarketSnapshot(['BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD']);
      setMarkets(snapshot);
    } catch (error) {
      setMarkets([
        { symbol: 'BTC/USD', normalizedSymbol: 'BTCUSD', price: 0, changePercent: 0, high: 0, low: 0, source: 'offline' },
        { symbol: 'ETH/USD', normalizedSymbol: 'ETHUSD', price: 0, changePercent: 0, high: 0, low: 0, source: 'offline' },
        { symbol: 'XAUUSD', normalizedSymbol: 'XAUUSD', price: 0, changePercent: 0, high: 0, low: 0, source: 'offline' },
        { symbol: 'EUR/USD', normalizedSymbol: 'EURUSD', price: 0, changePercent: 0, high: 0, low: 0, source: 'offline' }
      ]);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await refreshMarkets();
      setLoading(false);
    };

    init();
    const interval = setInterval(() => {
      refreshMarkets();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const runManualAnalysis = async (symbol = selectedSymbol, timeframe = selectedTimeframe) => {
    setLoading(true);

    try {
      const currentMarket = markets.find((item) => item.normalizedSymbol === symbol) || selectedMarket;
      const series = await fetchSeriesForSymbol(symbol, timeframe, Number(currentMarket?.price || 0));
      const signal = buildSignalFromMetrics(symbol, Number(currentMarket?.price || 0), series, timeframe);
      setAnalysis(signal);
    } catch (error) {
      const currentMarket = markets.find((item) => item.normalizedSymbol === symbol) || selectedMarket;
      const fallbackSeries = buildSyntheticHistory(Number(currentMarket?.price || 0), 1, 90);
      setAnalysis(buildSignalFromMetrics(symbol, Number(currentMarket?.price || 0), fallbackSeries, timeframe));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMarket && (!analysis || analysis.normalizedSymbol !== selectedSymbol || analysis.timeframe !== selectedTimeframe)) {
      runManualAnalysis(selectedSymbol, selectedTimeframe);
    }
  }, [selectedMarket, selectedSymbol, selectedTimeframe]);

  const currentPrice = Number(selectedMarket?.price || 0);
  const chartData = useMemo(() => {
    const values = buildSyntheticHistory(currentPrice || 100, currentPrice > 100 ? 1 : -1, 60);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return values.map((value, index) => {
      const x = 20 + (index * (760 - 40)) / (values.length - 1);
      const y = 220 - ((value - min) / range) * 180;
      return { x, y };
    });
  }, [currentPrice]);

  const chartPoints = chartData.map((point) => `${point.x},${point.y}`).join(' ');
  const chartArea = `${chartPoints} 740,220 20,220`;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">A</div>
          <div>
            <div className="brand-name">Apex AI Trader</div>
            <small>AI Trading Intelligence Suite</small>
          </div>
        </div>

        <nav className="nav">
          <button type="button" className="nav-pill active">لوحة التداول</button>
          <button type="button" className="nav-pill">الاستراتيجيات</button>
          <button type="button" className="nav-pill">الأداء</button>
          <button type="button" className="nav-pill">المحفظة</button>
        </nav>

        <div className="profile-box">
          <div className="avatar">M</div>
          <div>
            <div className="profile-name">محمد</div>
            <div className="profile-role">VIP Signal</div>
          </div>
        </div>
      </header>

      <main className="dashboard">
        <aside className="panel side-panel">
          <div className="section-head">
            <h3>الأسواق</h3>
            <span className="live-badge">Live</span>
          </div>

          <div className="market-list">
            {markets.map((market) => {
              const isActive = market.normalizedSymbol === selectedSymbol;
              return (
                <button
                  key={market.normalizedSymbol}
                  type="button"
                  className={`market-item ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedSymbol(market.normalizedSymbol)}
                >
                  <div className="market-top">
                    <span>{market.symbol}</span>
                    <span className="pair-tag">{market.source === 'live' ? 'Live' : 'Offline'}</span>
                  </div>
                  <div className="market-meta">
                    <strong>{formatMoney(market.price)}</strong>
                    <span className={Number(market.changePercent || 0) >= 0 ? 'positive' : 'negative'}>
                      {formatPercent(Number(market.changePercent || 0))}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="panel center-panel">
          <div className="market-header">
            <div className="market-title-group">
              <div className="pair-title">{getDisplaySymbol(selectedSymbol)}</div>
              <div className="price-row">
                <div className="price-value">{formatMoney(currentPrice)}</div>
                <div className={`trend-pill ${Number(selectedMarket?.changePercent || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercent(Number(selectedMarket?.changePercent || 0))}
                </div>
              </div>
            </div>
            <div className={`market-direction ${analysis?.direction === 'buy' ? 'buy' : 'sell'}`}>
              {analysis?.direction === 'buy' ? 'صعودي' : 'هبوطي'}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-top">
              <span>مؤشرات الذكاء الاصطناعي</span>
              <div className="time-range">
                {TIMEFRAMES.map((frame) => (
                  <button
                    key={frame}
                    type="button"
                    className={selectedTimeframe === frame ? 'timeframe-active' : ''}
                    onClick={() => setSelectedTimeframe(frame)}
                  >
                    {frame}
                  </button>
                ))}
              </div>
            </div>

            <svg className="chart-svg" viewBox="0 0 760 220" preserveAspectRatio="none">
              <defs>
                <linearGradient id="fillGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(74,164,255,0.35)" />
                  <stop offset="100%" stopColor="rgba(21,209,156,0.02)" />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="#4aa4ff" />
                  <stop offset="100%" stopColor="#15d19c" />
                </linearGradient>
              </defs>

              {[40, 80, 120, 160, 200].map((y) => (
                <line key={y} x1="20" x2="740" y1={y} y2={y} stroke="rgba(148,163,184,0.18)" strokeDasharray="6 8" />
              ))}

              <polygon points={chartArea} fill="url(#fillGradient)" />
              <polyline points={chartPoints} fill="none" stroke="url(#lineGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="analysis-card">
            <div className="analysis-box-head">
              <div className="soft-label">Manual Analysis Mode</div>
              <div className="selector-row">
                <select value={selectedSymbol} onChange={(event) => setSelectedSymbol(event.target.value)}>
                  {MARKET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select value={selectedTimeframe} onChange={(event) => setSelectedTimeframe(event.target.value)}>
                  {TIMEFRAMES.map((frame) => (
                    <option key={frame} value={frame}>{frame}</option>
                  ))}
                </select>
              </div>
            </div>

            {analysis && (
              <>
                <div className="analysis-summary">
                  <div className="signal-badge-wrap">
                    <span className={`signal-badge ${analysis.direction === 'buy' ? 'buy' : 'sell'}`}>
                      {analysis.direction === 'buy' ? 'شراء' : 'بيع'}
                    </span>
                  </div>
                  <div className="confidence-tag">الثقة {analysis.confidence}%</div>
                </div>

                <div className="signal-grid">
                  <div className="signal-card">
                    <div className="metric-label">الدخول</div>
                    <div className="metric-value">{formatMoney(analysis.entry)}</div>
                    <div className="metric-hint">Live Entry Price</div>
                  </div>
                  <div className="signal-card">
                    <div className="metric-label">TP1</div>
                    <div className="metric-value">{formatMoney(analysis.tp1)}</div>
                    <div className="metric-hint">Target 1</div>
                  </div>
                  <div className="signal-card">
                    <div className="metric-label">TP2</div>
                    <div className="metric-value">{formatMoney(analysis.tp2)}</div>
                    <div className="metric-hint">Target 2</div>
                  </div>
                  <div className="signal-card">
                    <div className="metric-label">TP3</div>
                    <div className="metric-value">{formatMoney(analysis.tp3)}</div>
                    <div className="metric-hint">Target 3</div>
                  </div>
                </div>

                <div className="signal-grid secondary-grid">
                  <div className="signal-card">
                    <div className="metric-label">ستوب</div>
                    <div className="metric-value">{formatMoney(analysis.stopLoss)}</div>
                    <div className="metric-hint">Stop Loss</div>
                  </div>
                  <div className="signal-card">
                    <div className="metric-label">Break-even</div>
                    <div className="metric-value">{formatMoney(analysis.breakEven)}</div>
                    <div className="metric-hint">حماية الأرباح</div>
                  </div>
                  <div className="signal-card">
                    <div className="metric-label">Trailing</div>
                    <div className="metric-value">{formatMoney(analysis.trailingStop)}</div>
                    <div className="metric-hint">Trailing Stop</div>
                  </div>
                  <div className="signal-card">
                    <div className="metric-label">اللوت</div>
                    <div className="metric-value">{analysis.lotSize}</div>
                    <div className="metric-hint">Lot Size</div>
                  </div>
                </div>

                <div className="insight-box">
                  <div className="soft-label">AI Analysis Summary</div>
                  <div className="insight-copy">
                    {analysis.notes?.map((note, index) => (
                      <p key={index}>{note}</p>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button type="button" className="analyze-btn" onClick={() => runManualAnalysis(selectedSymbol, selectedTimeframe)}>
              {loading ? 'جاري تحليل السوق...' : 'حلّل الآن'}
            </button>
          </div>
        </section>

        <aside className="panel right-panel">
          <div className="section-head">
            <h3>مؤشرات الحساب</h3>
            <span className="mini-pill">AI</span>
          </div>

          <div className="metric-box">
            <div className="metric-row">
              <span>الرصيد</span>
              <strong>$125,400</strong>
            </div>
            <div className="metric-row">
              <span>العائد</span>
              <strong className="positive">+$8,420</strong>
            </div>
            <div className="metric-row">
              <span>معدل الربح</span>
              <strong>{analysis?.confidence || 82}%</strong>
            </div>
          </div>

          <div className="notes-list">
            <div className="note-item">دعم: RSI, EMA, MACD, Bollinger Bands, Price Action</div>
            <div className="note-item">محرك التداول: Manual + Signal Dashboard</div>
            <div className="note-item">الخريطة: Live Market Feed + Safe Browser Fallback</div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
