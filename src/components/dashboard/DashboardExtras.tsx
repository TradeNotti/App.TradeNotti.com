"use client";

import { useEffect, useState } from "react";
import type { DashboardExtras as Extras } from "@/lib/dashboard";
import { formatMoney } from "@/lib/format";

export interface LeaderRow {
  name: string;
  winRate: number | null;
  isMe: boolean;
  note?: string;
}

const money = (n: number) => formatMoney(n);
const compact = (n: number) => {
  const s = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${s}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};
const tone = (n: number) => (n > 0 ? "text-profit" : n < 0 ? "text-loss" : "text-muted");

function Card({
  label,
  right,
  children,
  className = "",
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="kicker">{label}</div>
        {right && <div className="text-[11px] text-faint">{right}</div>}
      </div>
      {children}
    </section>
  );
}

// Horizontal win/loss split bar.
function SplitBar({ wins, total }: { wins: number; total: number }) {
  const pct = total ? (wins / total) * 100 : 0;
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-loss/70">
      <div className="bg-profit" style={{ width: `${pct}%` }} />
    </div>
  );
}

function RDistribution({ data }: { data: Extras["rDistribution"] }) {
  const max = Math.max(1, ...data.map((b) => b.count));
  const total = data.reduce((s, b) => s + b.count, 0);
  return (
    <Card label="R-multiple distribution" right="This month">
      {total === 0 ? (
        <Empty>No closed trades yet</Empty>
      ) : (
        <div className="flex h-36 items-end gap-2">
          {data.map((b) => (
            <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="num text-[11px] text-faint">{b.count || ""}</span>
              <div
                className={`w-full rounded-md ${b.positive ? "bg-accent" : "bg-loss"}`}
                style={{ height: `${(b.count / max) * 100}%`, minHeight: b.count ? 4 : 0 }}
              />
              <span className="text-[10px] text-faint">{b.label}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function dayShort(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function DailyPnl({ data }: { data: Extras["dailyPnl"] }) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d.pnl)));
  const total = data.reduce((s, d) => s + d.pnl, 0);
  return (
    <Card
      label="Net daily P&L"
      right={
        <span className={tone(total)}>
          {compact(total)} · {data.length} days
        </span>
      }
    >
      {data.length === 0 ? (
        <Empty>No closed trades yet</Empty>
      ) : (
        <>
          <div className="relative h-40">
            {/* Zero baseline */}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-line" />
            <div className="relative flex h-full items-stretch gap-[3px]">
              {data.map((d) => {
                const h = (Math.abs(d.pnl) / max) * 48; // % of half-height, leaves headroom
                const up = d.pnl >= 0;
                return (
                  <div
                    key={d.date}
                    title={`${dayShort(d.date)}: ${money(d.pnl)} · ${d.trades} trade${d.trades === 1 ? "" : "s"}`}
                    className="group flex h-full flex-1 flex-col justify-center"
                  >
                    <div className="flex h-1/2 items-end">
                      {up && (
                        <div
                          className="w-full rounded-t-[3px] bg-profit transition-opacity group-hover:opacity-80"
                          style={{ height: `${h * 2}%`, minHeight: 2 }}
                        />
                      )}
                    </div>
                    <div className="flex h-1/2 items-start">
                      {!up && (
                        <div
                          className="w-full rounded-b-[3px] bg-loss transition-opacity group-hover:opacity-80"
                          style={{ height: `${h * 2}%`, minHeight: d.pnl < 0 ? 2 : 0 }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[10.5px] text-faint">
            <span>{dayShort(data[0].date)}</span>
            <span>{dayShort(data[data.length - 1].date)}</span>
          </div>
        </>
      )}
    </Card>
  );
}

function DirCompare({ ls }: { ls: Extras["longShort"] }) {
  const rows: { label: string; d: Extras["longShort"]["long"] }[] = [
    { label: "Long", d: ls.long },
    { label: "Short", d: ls.short },
  ];
  return (
    <Card label="Long vs short" right="This month">
      <div className="flex flex-col gap-4">
        {rows.map(({ label, d }) => (
          <div key={label}>
            <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
              <span className="font-medium text-ink">
                {d.count} {label.toLowerCase()}
                {d.count === 1 ? "" : "s"}
              </span>
              <span className="num text-[12.5px]">
                <span className="text-muted">
                  {d.count ? Math.round((d.wins / d.count) * 100) : 0}% win
                </span>{" "}
                · <span className={tone(d.pnl)}>{compact(d.pnl)}</span>
              </span>
            </div>
            <SplitBar wins={d.wins} total={d.count} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function MostTraded({ data }: { data: Extras["mostTraded"] }) {
  const max = Math.max(1, ...data.map((s) => Math.abs(s.pnl)));
  return (
    <Card label="Most traded" right="This month">
      {data.length === 0 ? (
        <Empty>No closed trades yet</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((s) => (
            <div key={s.symbol}>
              <div className="mb-1 flex items-baseline justify-between text-[13px]">
                <span className="font-medium">{s.symbol}</span>
                <span className="num text-[12.5px]">
                  <span className={tone(s.pnl)}>{compact(s.pnl)}</span>{" "}
                  <span className="text-faint">· {s.count}</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className={s.pnl >= 0 ? "h-full bg-accent" : "h-full bg-loss"}
                  style={{ width: `${(Math.abs(s.pnl) / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function PhaseDirection({ phase }: { phase: Extras["phase"] }) {
  const rows = [
    { label: "With trend", d: phase.withTrend },
    { label: "Counter-trend", d: phase.counter },
  ];
  return (
    <Card label="Market phase & direction" right="from trade notes">
      {phase.tagged === 0 ? (
        <Empty>
          Tag trades with “Main trend” or “Countertrend” to see this
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map(({ label, d }) => (
            <div key={label}>
              <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                <span className="font-medium text-ink">{label}</span>
                <span className="num text-[12.5px]">
                  <span className="text-muted">
                    {d.count ? Math.round((d.wins / d.count) * 100) : 0}% win
                  </span>{" "}
                  · <span className={tone(d.pnl)}>{compact(d.pnl)}</span>
                </span>
              </div>
              <SplitBar wins={d.wins} total={d.count} />
            </div>
          ))}
          <p className="text-[11.5px] text-faint">
            Tagged on {phase.tagged} of {phase.total} trades this month.
          </p>
        </div>
      )}
    </Card>
  );
}

const SESSIONS = [
  { name: "Tokyo", open: 0, close: 9 },
  { name: "London", open: 7, close: 16 },
  { name: "New York", open: 12, close: 21 },
];
const pad = (n: number) => String(n).padStart(2, "0");
const hms = (sec: number) => `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;

function MarketSessions() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <Card label="Market sessions" right="UTC">
      <div className="flex flex-col gap-3">
        {SESSIONS.map((s) => {
          let open = false;
          let count = "";
          if (now) {
            const sod =
              now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
            const o = s.open * 3600;
            const c = s.close * 3600;
            open = sod >= o && sod < c;
            const target = open ? c : sod < o ? o : o + 86400;
            count = hms(target - sod);
          }
          return (
            <div key={s.name} className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${open ? "bg-profit" : "bg-faint/50"}`}
                />
                <span className="font-medium">{s.name}</span>
              </span>
              <span className="num text-[12.5px]">
                {open ? (
                  <span className="text-profit">Open · closes {count}</span>
                ) : (
                  <span className="text-muted">opens {count}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function OpenPositions({ extras }: { extras: Extras }) {
  return (
    <Card
      label="Open positions · live"
      right={
        <span className={tone(extras.openFloating)}>
          Floating {compact(extras.openFloating)}
        </span>
      }
    >
      <div className="flex flex-col divide-y divide-line/70">
        {extras.openPositions.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-2 text-[13px]">
            <span className="flex items-center gap-2.5">
              <span className="font-semibold">{p.symbol}</span>
              <span
                className={`num text-[11.5px] ${p.direction === "LONG" ? "text-profit" : "text-loss"}`}
              >
                {p.direction === "LONG" ? "▲ Long" : "▼ Short"}
              </span>
            </span>
            <span className={`num text-[12.5px] ${tone(p.pnl ?? 0)}`}>
              {p.pnl == null ? "—" : money(p.pnl)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Leaderboard({ rows }: { rows: LeaderRow[] }) {
  return (
    <Card label="Partners leaderboard" right="win rate">
      <div className="flex flex-col divide-y divide-line/70">
        {rows.map((r, i) => (
          <div
            key={`${r.name}-${i}`}
            className={`flex items-center gap-3 py-2.5 ${r.isMe ? "-mx-2 rounded-lg bg-accent-bg/50 px-2" : ""}`}
          >
            <span className="num w-5 text-[12px] text-faint">{i + 1}</span>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent"
              aria-hidden
            >
              {r.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium">
                {r.name}
                {r.isMe && <span className="ml-1.5 text-[11px] text-accent">You</span>}
              </span>
              {r.note && <span className="block text-[11px] text-faint">{r.note}</span>}
            </span>
            <span className="num text-[14px] font-semibold text-profit">
              {r.winRate == null ? "—" : `${Math.round(r.winRate)}%`}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-36 place-items-center text-center text-[12.5px] text-faint">
      {children}
    </div>
  );
}

export default function DashboardExtras({
  extras,
  leaderboard,
}: {
  extras: Extras;
  leaderboard: LeaderRow[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <RDistribution data={extras.rDistribution} />
        <DailyPnl data={extras.dailyPnl} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <DirCompare ls={extras.longShort} />
        <MostTraded data={extras.mostTraded} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PhaseDirection phase={extras.phase} />
        <MarketSessions />
      </div>

      {extras.openPositions.length > 0 && <OpenPositions extras={extras} />}
      {leaderboard.length > 1 && <Leaderboard rows={leaderboard} />}
    </div>
  );
}
