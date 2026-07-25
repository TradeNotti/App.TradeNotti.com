import type { AnalyticsData } from "@/lib/analytics";
import type { DashboardExtras as Extras } from "@/lib/dashboard";
import { formatR } from "@/lib/format";

const money = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const compact = (n: number) => {
  const s = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${s}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};
const tone = (n: number) => (n > 0 ? "text-profit" : n < 0 ? "text-loss" : "text-muted");

// Tiny inline trend line — no axes, just a shape. Colored by overall
// direction (last value vs first) to match the tile's headline color.
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const W = 100;
  const H = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / span) * H;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const rising = values[values.length - 1] >= values[0];
  const color = rising ? "var(--color-profit)" : "var(--color-loss)";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-8 w-full">
      <path d={area} fill={color} fillOpacity={0.14} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Tile({
  label,
  value,
  valueClass = "",
  sub,
  sparkValues,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: React.ReactNode;
  sparkValues?: number[];
}) {
  return (
    <section className="flex flex-col rounded-2xl border border-line bg-surface p-4">
      <div className="kicker mb-1.5">{label}</div>
      <div className={`num text-[21px] font-bold leading-none tracking-tight ${valueClass}`}>
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[11.5px] text-faint">{sub}</div>}
      {sparkValues && sparkValues.length >= 2 && (
        <div className="mt-2">
          <Sparkline values={sparkValues} />
        </div>
      )}
    </section>
  );
}

export default function MetricsBar({
  analytics,
  extras,
}: {
  analytics: AnalyticsData;
  extras: Extras;
}) {
  const pf =
    extras.profitFactor == null
      ? "—"
      : extras.profitFactor === Infinity
        ? "∞"
        : extras.profitFactor.toFixed(2);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        label="Account balance"
        value={money(extras.balance)}
        sub={
          extras.growthPct != null && (
            <span className={tone(extras.growthPct)}>
              {extras.growthPct >= 0 ? "▲" : "▼"} {Math.abs(extras.growthPct).toFixed(1)}% all-time
            </span>
          )
        }
        sparkValues={analytics.equityCurve.map((p) => p.equity)}
      />
      <Tile
        label="Net P&L · this month"
        value={compact(analytics.netPnl)}
        valueClass={tone(analytics.netPnl)}
        sub={
          analytics.netPnlDeltaPct != null && (
            <span className={tone(analytics.netPnlDeltaPct)}>
              {analytics.netPnlDeltaPct >= 0 ? "▲" : "▼"} {Math.abs(analytics.netPnlDeltaPct).toFixed(1)}% vs last mo.
            </span>
          )
        }
        sparkValues={extras.dailyPnl.map((d) => d.pnl)}
      />
      <Tile
        label="Profit factor"
        value={pf}
        sub={extras.profitFactor != null && extras.profitFactor >= 2 ? "target ≥ 2.0 ✓" : "target ≥ 2.0"}
      />
      <Tile
        label="Win rate"
        value={analytics.winRate == null ? "—" : `${Math.round(analytics.winRate)}%`}
        sub={`${analytics.wins} of ${analytics.closedCount} closed · avg ${formatR(analytics.avgRR)}`}
      />
    </div>
  );
}
