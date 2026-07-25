interface Point {
  t: string;
  equity: number;
}

const W = 720;
const H = 240;
const PAD_Y = 16;

const compactMoney = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function axisLabels(points: Point[]): string[] {
  if (points.length < 2) return [];
  const fmt = (iso: string, last: boolean) =>
    last
      ? "Today"
      : new Date(iso).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });
  const first = points[0].t;
  const lastT = points[points.length - 1].t;
  const mid1 = points[Math.floor(points.length / 3)].t;
  const mid2 = points[Math.floor((2 * points.length) / 3)].t;
  return [fmt(first, false), fmt(mid1, false), fmt(mid2, false), fmt(lastT, true)];
}

export default function EquityCurve({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-faint">
        Not enough closed trades to chart equity yet.
      </div>
    );
  }

  const ts = points.map((p) => new Date(p.t).getTime());
  const eq = points.map((p) => p.equity);
  const tMin = Math.min(...ts);
  const tMax = Math.max(...ts);
  const eMin = Math.min(...eq);
  const eMax = Math.max(...eq);
  const tSpan = tMax - tMin || 1;
  const eSpan = eMax - eMin || 1;

  const x = (t: number) => ((t - tMin) / tSpan) * W;
  const y = (e: number) => H - PAD_Y - ((e - eMin) / eSpan) * (H - 2 * PAD_Y);

  const coords = points.map((p) => [x(new Date(p.t).getTime()), y(p.equity)]);
  const line = coords.map(([cx, cy], i) => `${i ? "L" : "M"}${cx.toFixed(1)} ${cy.toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const last = coords[coords.length - 1];
  const lastEquity = eq[eq.length - 1];

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-[240px] w-full overflow-visible"
        >
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-profit)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--color-profit)" stopOpacity="0" />
            </linearGradient>
            <filter id="equityGlow" x="-20%" y="-40%" width="140%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d={area} fill="url(#equityFill)" />
          <g filter="url(#equityGlow)">
            <path
              d={line}
              fill="none"
              stroke="var(--color-profit)"
              strokeWidth={2.25}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
          <circle cx={last[0]} cy={last[1]} r={4.5} fill="var(--color-profit)" vectorEffect="non-scaling-stroke" />
          <circle
            cx={last[0]}
            cy={last[1]}
            r={4.5}
            fill="none"
            stroke="var(--color-profit)"
            strokeOpacity={0.35}
            strokeWidth={5}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Callout pill showing the current equity value, pinned to the last point. */}
        <div
          className="absolute flex items-center whitespace-nowrap rounded-md px-2 py-1 text-[11.5px] font-bold shadow-lg"
          style={{
            left: `${(last[0] / W) * 100}%`,
            top: `${(last[1] / H) * 100}%`,
            transform: "translate(calc(-100% - 10px), -50%)",
            backgroundColor: "var(--color-profit)",
            color: "var(--color-canvas)",
          }}
        >
          {compactMoney(lastEquity)}
        </div>
      </div>
      <div className="mt-3 flex justify-between text-[11px] text-faint">
        {axisLabels(points).map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  );
}
