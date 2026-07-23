interface Point {
  t: string;
  equity: number;
}

const W = 720;
const H = 240;
const PAD_Y = 16;

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
  const lastColor = eq[eq.length - 1] >= eq[eq.length - 2] ? "rgb(22,163,74)" : "rgb(220,38,38)";

  // Draw the line as per-segment paths so it reads green while equity rises
  // and red while it falls, rather than one flat stroke color.
  const segments = coords.slice(1).map(([cx, cy], i) => {
    const [px, py] = coords[i];
    const rising = eq[i + 1] >= eq[i];
    return {
      d: `M${px.toFixed(1)} ${py.toFixed(1)} L${cx.toFixed(1)} ${cy.toFixed(1)}`,
      color: rising ? "rgb(22,163,74)" : "rgb(220,38,38)",
    };
  });

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-[240px] w-full"
      >
        <defs>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(99,102,241)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="rgb(99,102,241)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#equityFill)" />
        {segments.map((s, i) => (
          <path
            key={i}
            d={s.d}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <circle cx={last[0]} cy={last[1]} r={4} fill={lastColor} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-3 flex justify-between text-[11px] text-faint">
        {axisLabels(points).map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  );
}
