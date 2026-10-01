// PriceChart.jsx — ArtVault Market Component
// Simple SVG-based price history chart — no external chart library needed

export function PriceChart({ data = [], height = 120, showLabels = true }) {
  if (!data || data.length < 2) return null;

  const prices = data.map(d => d.price);
  const dates = data.map(d => d.date);
  const min = Math.min(...prices) * 0.95;
  const max = Math.max(...prices) * 1.05;
  const range = max - min;

  const w = 400;
  const h = height;
  const pad = { top: 10, right: 10, bottom: showLabels ? 24 : 10, left: showLabels ? 32 : 10 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  const getX = (i) => pad.left + (i / (prices.length - 1)) * chartW;
  const getY = (price) => pad.top + chartH - ((price - min) / range) * chartH;

  const pathD = prices.map((p, i) => `${i === 0 ? 'M' : 'L'}${getX(i)},${getY(p)}`).join(' ');
  const areaD = `${pathD} L${getX(prices.length - 1)},${pad.top + chartH} L${getX(0)},${pad.top + chartH} Z`;

  const isPositive = prices[prices.length - 1] >= prices[0];
  const lineColor = isPositive ? 'var(--color-positive)' : 'var(--color-negative)';
  const areaColorStart = isPositive ? 'rgba(107,175,140,0.2)' : 'rgba(196,97,74,0.2)';

  return (
    <div className="price-chart" role="img" aria-label="Price history chart">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={areaColorStart} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line
            key={t}
            x1={pad.left} y1={pad.top + chartH * t}
            x2={pad.left + chartW} y2={pad.top + chartH * t}
            stroke="var(--color-border)"
            strokeWidth="1"
            strokeDasharray={t === 1 ? '0' : '3,4'}
            opacity="0.5"
          />
        ))}

        {/* Y labels */}
        {showLabels && [0, 0.5, 1].map(t => {
          const price = max - t * range;
          return (
            <text
              key={t}
              x={pad.left - 4}
              y={pad.top + chartH * t + 4}
              textAnchor="end"
              fill="var(--color-text-tertiary)"
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              ₹{Math.round(price)}
            </text>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#areaGrad)" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {prices.map((p, i) => (
          <circle
            key={i}
            cx={getX(i)}
            cy={getY(p)}
            r="3"
            fill={lineColor}
            opacity={i === 0 || i === prices.length - 1 ? 1 : 0.5}
          />
        ))}

        {/* X labels (first and last date) */}
        {showLabels && (
          <>
            <text
              x={getX(0)}
              y={h - 4}
              textAnchor="middle"
              fill="var(--color-text-tertiary)"
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              {dates[0]?.slice(5)}
            </text>
            <text
              x={getX(prices.length - 1)}
              y={h - 4}
              textAnchor="middle"
              fill="var(--color-text-tertiary)"
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              {dates[dates.length - 1]?.slice(5)}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

export default PriceChart;
