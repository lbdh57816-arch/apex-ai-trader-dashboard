import { useEffect, useMemo, useState } from "react";

const MARKETS = [
  {
    symbol: "BTC/USD",
    price: 68450,
    trend: 2.84,
    sentiment: 0.82,
    volatility: 0.056,
    support: 67100,
    resistance: 69550,
    signal: "buy",
    history: [61200, 62000, 61850, 63020, 64250, 64880, 65600, 66490, 67110, 68040, 68560, 68450]
  },
  {
    symbol: "ETH/USD",
    price: 3520,
    trend: 1.96,
    sentiment: 0.74,
    volatility: 0.064,
    support: 3380,
    resistance: 3640,
    signal: "buy",
    history: [3010, 3125, 3180, 3260, 3325, 3400, 3460, 3515, 3480, 3550, 3585, 3520]
  },
  {
    symbol: "XAU/USD",
    price: 2325.4,
    trend: -0.42,
    sentiment: 0.48,
    volatility: 0.038,
    support: 2288,
    resistance: 2358,
    signal: "sell",
    history: [2375, 2368, 2385, 2362, 2348, 2340, 2335, 2331, 2328, 2322, 2328, 2325.4]
  },
  {
    symbol: "EUR/USD",
    price: 1.0846,
    trend: 0.68,
    sentiment: 0.62,
    volatility: 0.018,
    support: 1.0799,
    resistance: 1.0889,
    signal: "buy",
    history: [1.0645, 1.0688, 1.0701, 1.0739, 1.0776, 1.0812, 1.0835, 1.0841, 1.0838, 1.0856, 1.0851, 1.0846]
  },
  {
    symbol: "NAS100",
    price: 20280,
    trend: 1.48,
    sentiment: 0.71,
    volatility: 0.049,
    support: 19910,
    resistance: 20680,
    signal: "buy",
    history: [19100, 19400, 19500, 19680, 19820, 19910, 20060, 20180, 20220, 20280, 20310, 20280]
  }
];

function formatPrice(value) {
  if (value >= 1000) return `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (value >= 10) return `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${Number(value).toFixed(4)}`;
}

function generateAnalysis(pair) {
  const direction = pair.signal === "buy" ? "buy" : "sell";
  const base = pair.price;
  const volatilityFactor = pair.volatility * base;
  const stopDistance = volatilityFactor * 0.9;
  const rr = direction === "buy" ? 3.2 : 3.4;
  const entry = base;
  const target = direction === "buy" ? base + stopDistance * rr : base - stopDistance * rr;
  const stop = direction === "buy" ? base - stopDistance : base + stopDistance;
  const confidence = Math.min(94, Math.max(72, Math.round(78 + pair.sentiment * 18 + (pair.trend > 0 ? 4 : -3))));
  const riskLabel = pair.volatility > 0.05 ? "عالي" : pair.volatility > 0.03 ? "متوسط" : "منخفض";

  const insights = direction === "buy"
    ? [
        "الطلب قوي فوق مستوى الدعم الأساسي مع استقرار الاتجاه الصعودي.",
        "مؤشرات الزخم تشير إلى استمرار القوة في الأسعار مع إشارات شراء متقاربة.",
        "تدفقات السوق تدعم الدخول فوق دعم مهم مع احتمالية نمو الربح.",
        "إدارة المخاطر مناسبة عند مستوى استهداف واضح نسبيًا."
      ]
    : [
        "الضغط البيعي مستمر مع مقاومة قوية تثبِّت الاتجاه الهبوطي.",
        "مؤشرات الزخم تشير إلى احتمال استمرار الهبوط في المدى القصير.",
        "مستوى المقاومة الحالي يقيد الحركة الصعودية ويزيد احتمالية اختراق الدعم.",
        "إدارة المخاطر مناسبة مع هدف واضح وحماية رأس المال."
      ];

  return {
    direction,
    entry,
    target,
    stop,
    confidence,
    rr,
    riskLabel,
    insights
  };
}

function App() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const pair = MARKETS[selectedIndex];
  const [analysis, setAnalysis] = useState(() => generateAnalysis(pair));

  useEffect(() => {
    setAnalysis(generateAnalysis(pair));
  }, [selectedIndex, pair]);

  const chartData = useMemo(() => {
    const min = Math.min(...pair.history);
    const max = Math.max(...pair.history);
    const range = max - min || 1;

    return pair.history.map((value, index) => {
      const x = 20 + (index * (760 - 40)) / (pair.history.length - 1);
      const y = 220 - ((value - min) / range) * (180);
      return { x, y };
    });
  }, [pair]);

  const chartPoints = chartData.map((pt) => `${pt.x},${pt.y}`).join(" ");
  const chartArea = `${chartPoints} 740,220 20,220`;

  const handleAnalyze = () => {
    setAnalysis(generateAnalysis(pair));
  };

  const trendClass = pair.trend >= 0 ? "positive" : "negative";
  const trendText = `${pair.trend >= 0 ? "+" : ""}${pair.trend.toFixed(2)}%`;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <div className="brand-name">Apex AI Trader</div>
            <small>روبوت تداول ذكي</small>
          </div>
        </div>

        <nav className="nav">
          <button className="pill active">لوحة التداول</button>
          <button className="pill">الاستراتيجيات</button>
          <button className="pill">إدارة المخاطر</button>
          <button className="pill">الأداء</button>
        </nav>

        <div className="profile-box">
          <div className="avatar">M</div>
          <div>
            <div className="profile-name">محمد</div>
            <div className="profile-role">VIP Pro</div>
          </div>
        </div>
      </header>

      <main className="dashboard">
        <aside className="panel markets-panel">
          <div className="section-header">
            <h3>الأسواق</h3>
            <span className="live-chip">Live</span>
          </div>

          <div className="market-list">
            {MARKETS.map((market, index) => {
              const isActive = index === selectedIndex;
              const marketTrend = market.trend >= 0 ? "positive" : "negative";
              return (
                <button
                  key={market.symbol}
                  className={`market-item ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedIndex(index)}
                >
                  <div className="market-top">
                    <span className="pair-name">{market.symbol}</span>
                    <span className="pair-badge">{market.signal === "buy" ? "شراء" : "بيع"}</span>
                  </div>
                  <div className="market-meta">
                    <span className="pair-price">{formatPrice(market.price)}</span>
                    <span className={marketTrend}>{market.trend >= 0 ? "+" : ""}{market.trend.toFixed(2)}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="panel center-panel">
          <div className="market-header">
            <div className="market-main">
              <div className="pair-main">{pair.symbol}</div>
              <div className="price-stack">
                <div className="price-main">{formatPrice(pair.price)}</div>
                <div className={`mini-trend ${trendClass}`}>{trendText}</div>
              </div>
            </div>
            <div className={`signal-state ${analysis.direction === "buy" ? "buy" : "sell"}`}>
              {analysis.direction === "buy" ? "صعودي" : "هبوطي"}
            </div>
          </div>

          <div className="chart-wrap">
            <div className="chart-head">
              <div className="soft-label">مؤشرات الذكاء الاصطناعي</div>
              <div className="chart-scales">
                <span>H1</span>
                <span>H4</span>
                <span>D1</span>
              </div>
            </div>

            <svg viewBox="0 0 760 220" className="chart-svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4aa4ff" />
                  <stop offset="100%" stopColor="#15d19c" />
                </linearGradient>
                <linearGradient id="fillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(74,164,255,0.35)" />
                  <stop offset="100%" stopColor="rgba(21,209,156,0.02)" />
                </linearGradient>
              </defs>

              {[40, 80, 120, 160, 200].map((y) => (
                <line key={y} x1="20" x2="740" y1={y} y2={y} stroke="rgba(148,163,184,0.16)" strokeDasharray="6 8" />
              ))}

              <polygon points={chartArea} fill="url(#fillGradient)" />
              <polyline
                points={chartPoints}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="analysis-box">
            <div className="analysis-head">
              <div className="soft-label">إشارة التحليل</div>
              <span className={`signal-badge ${analysis.direction === "buy" ? "buy" : "sell"}`}>
                {analysis.direction === "buy" ? "شراء" : "بيع"}
              </span>
            </div>

            <div className="signal-grid">
              <div className="signal-card">
                <div className="label">الدخول</div>
                <div className="value">{formatPrice(analysis.entry)}</div>
                <div className="hint">نقطة الدخول</div>
              </div>

              <div className="signal-card">
                <div className="label">الهدف</div>
                <div className="value">{formatPrice(analysis.target)}</div>
                <div className="hint">نقطة جني الربح</div>
              </div>

              <div className="signal-card">
                <div className="label">الستوب</div>
                <div className="value">{formatPrice(analysis.stop)}</div>
                <div className="hint">حماية رأس المال</div>
              </div>

              <div className="signal-card">
                <div className="label">الثقة</div>
                <div className="value">{analysis.confidence}%</div>
                <div className="hint">مستوى ثقة التحليل</div>
              </div>
            </div>

            <button className="analyze-btn" onClick={handleAnalyze}>حلّل الآن</button>
          </div>
        </section>

        <aside className="panel side-panel">
          <div className="section-header">
            <h3>مؤشرات الحساب</h3>
          </div>

          <div className="metric-box">
            <div className="metric-top">
              <span className="soft-label">الرصيد</span>
              <span className="mini-chip">+4.8%</span>
            </div>
            <strong>$125,400</strong>
          </div>

          <div className="metric-box">
            <div className="metric-top">
              <span className="soft-label">العائد</span>
              <span className="mini-chip">P/L</span>
            </div>
            <strong className="positive">+$8,420</strong>
          </div>

          <div className="metric-box">
            <div className="metric-top">
              <span className="soft-label">معدل الربح</span>
              <span className="mini-chip">AI</span>
            </div>
            <strong>{analysis.confidence}%</strong>
          </div>

          <div className="section-header margin-top">
            <h3>إدارة المخاطر</h3>
          </div>

          <div className="risk-list">
            <div className="risk-row">
              <span>حجم الصفقة</span>
              <strong>{pair.symbol.includes("BTC") ? "0.50 BTC" : pair.symbol.includes("ETH") ? "1.25 ETH" : "2.0 LOT"}</strong>
            </div>
            <div className="risk-row">
              <span>نسبة المخاطرة</span>
              <strong>1:{analysis.rr.toFixed(1)}</strong>
            </div>
            <div className="risk-row">
              <span>تقلب السوق</span>
              <strong>{analysis.riskLabel}</strong>
            </div>
            <div className="risk-row">
              <span>التحليل</span>
              <strong>{analysis.direction === "buy" ? "شراء" : "بيع"}</strong>
            </div>
          </div>

          <div className="section-header margin-top">
            <h3>ملاحظات الذكاء الاصطناعي</h3>
          </div>

          <ul className="notes-list">
            {analysis.insights.map((item, i) => (
              <li key={i}>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}

export default App;
