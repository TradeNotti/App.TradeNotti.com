"use client";

import { useState } from "react";
import type {
  AnalyticsData,
  CalendarData,
  DayTrade,
  Range,
} from "@/lib/analytics";
import type { PerformanceData } from "@/lib/resources";
import { formatMoney, formatR } from "@/lib/format";
import EquityCurve from "./EquityCurve";
import WinLossDonut from "./WinLossDonut";
import PerformanceCalendar from "./PerformanceCalendar";
import DayTradesModal from "./DayTradesModal";
import PerformancePanel from "../resources/PerformancePanel";
import DateRangePicker from "../DateRangePicker";
import { ArrowRightIcon, CalendarIcon } from "../icons";

const RANGES: { id: Range; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "ytd", label: "YTD" },
  { id: "all", label: "All" },
];

function compactMoney(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function Delta({ up, children }: { up: boolean; children: React.ReactNode }) {
  return (
    <span className={up ? "text-profit" : "text-loss"}>
      <span aria-hidden>{up ? "▲" : "▼"}</span> {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  delta,
  note,
}: {
  label: string;
  value: string;
  delta?: React.ReactNode;
  note?: string;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="kicker mb-2">{label}</div>
      <div className="text-[30px] font-bold leading-none tracking-tight">{value}</div>
      <div className="mt-3 flex flex-col gap-0.5 text-[12px]">
        {delta && <span>{delta}</span>}
        {note && <span className="text-faint">{note}</span>}
      </div>
    </section>
  );
}

const legendDot = (color: string) => (
  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
);

export default function AnalyticsView({
  initial,
  initialCalendar,
  performance,
  accountId,
}: {
  initial: AnalyticsData;
  initialCalendar: CalendarData;
  performance: PerformanceData;
  accountId: string;
}) {
  const [data, setData] = useState<AnalyticsData>(initial);
  const [range, setRange] = useState<Range>(initial.range);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);

  // Setup-detail modal (trades carrying a given tag in the current range).
  const [openSetup, setOpenSetup] = useState<string | null>(null);
  const [setupTrades, setSetupTrades] = useState<DayTrade[]>([]);
  const [setupTotal, setSetupTotal] = useState(0);
  const [setupLoading, setSetupLoading] = useState(false);

  const showSetup = async (name: string) => {
    setOpenSetup(name);
    setSetupLoading(true);
    setSetupTrades([]);
    try {
      const res = await fetch(
        `/api/analytics/setup?tag=${encodeURIComponent(name)}&range=${range}&accountId=${accountId}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const json = await res.json();
        setSetupTrades(json.trades);
        setSetupTotal(json.totalPnl);
      }
    } finally {
      setSetupLoading(false);
    }
  };

  const changeRange = async (next: Range) => {
    setShowPicker(false);
    if (next === range && next !== "custom") return;
    setRange(next);
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?range=${next}&accountId=${accountId}`, {
        cache: "no-store",
      });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const applyCustom = async (from: string, to: string) => {
    setShowPicker(false);
    setRange("custom");
    setCustom({ from, to });
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics?range=custom&from=${from}&to=${to}&accountId=${accountId}`,
        { cache: "no-store" },
      );
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const d = data.distribution;
  const rangeNote =
    range === "month" ? "vs last mo." : range === "week" ? "vs last wk." : "vs prev.";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="kicker mb-1">Performance · {data.periodLabel}</div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analytics</h1>
          </div>
          <div className={`flex items-center gap-2 ${loading ? "opacity-60" : ""}`}>
            <div className="inline-flex rounded-lg bg-black/[0.04] p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => changeRange(r.id)}
                  className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    range === r.id
                      ? "bg-surface text-ink shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Custom date range */}
            <div className="relative">
              <button
                onClick={() => setShowPicker((s) => !s)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  range === "custom"
                    ? "border-accent/40 bg-accent-bg text-accent"
                    : "border-line text-ink-soft hover:bg-black/[0.04]"
                }`}
              >
                <CalendarIcon size={14} />
                {range === "custom" && custom ? data.periodLabel : "Custom"}
              </button>
              {showPicker && (
                <div className="absolute right-0 z-30 mt-2 rounded-xl border border-line bg-surface shadow-lg shadow-black/5">
                  <DateRangePicker
                    from={custom?.from ?? null}
                    to={custom?.to ?? null}
                    onApply={applyCustom}
                    onClear={() => {
                      setCustom(null);
                      setShowPicker(false);
                      changeRange("month");
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Net P&L"
            value={compactMoney(data.netPnl)}
            delta={
              data.netPnlDeltaPct != null && (
                <Delta up={data.netPnlDeltaPct >= 0}>
                  {Math.abs(data.netPnlDeltaPct).toFixed(1)}% {rangeNote}
                </Delta>
              )
            }
          />
          <StatCard
            label="Win rate"
            value={data.winRate == null ? "—" : `${Math.round(data.winRate)}%`}
            delta={
              data.winRatePrev != null &&
              data.winRate != null && (
                <Delta up={data.winRate >= data.winRatePrev}>
                  prev {Math.round(data.winRatePrev)}%
                </Delta>
              )
            }
            note={`${data.wins} of ${data.closedCount} closed`}
          />
          <StatCard
            label="Avg RR"
            value={formatR(data.avgRR)}
            delta={
              data.avgRRPrev != null &&
              data.avgRR != null && (
                <Delta up={data.avgRR >= data.avgRRPrev}>
                  prev {formatR(data.avgRRPrev)}
                </Delta>
              )
            }
          />
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="kicker mb-2">Avg win / loss</div>
            <div className="flex items-baseline gap-2">
              <span className="num text-[22px] font-bold leading-none text-profit">
                {data.avgWin == null ? "—" : compactMoney(data.avgWin)}
              </span>
              <span className="text-faint">/</span>
              <span className="num text-[22px] font-bold leading-none text-loss">
                {data.avgLoss == null ? "—" : compactMoney(data.avgLoss)}
              </span>
            </div>
            <div className="mt-3 text-[12px] text-faint">avg win vs avg loss</div>
          </section>
        </div>

        {/* Equity + distribution */}
        <div className="mb-5 grid gap-5 lg:grid-cols-3">
          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6 lg:col-span-2">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="kicker mb-1">Equity curve · {data.periodLabel}</div>
                <h2 className="text-[15px] font-semibold">Account equity</h2>
              </div>
            </div>
            <EquityCurve points={data.equityCurve} />
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div className="kicker mb-1">Distribution</div>
            <h2 className="mb-4 text-[15px] font-semibold">Win / loss</h2>
            <div className="flex items-center gap-5">
              <WinLossDonut winRate={data.winRate} />
              <ul className="flex-1 space-y-2.5 text-[13px]">
                {[
                  ["Wins", d.wins, "rgb(22,163,74)"],
                  ["Losses", d.losses, "rgb(239,68,68)"],
                  ["Open", d.open, "rgb(148,163,184)"],
                  ["Break-even", d.breakeven, "rgb(203,213,225)"],
                ].map(([label, count, color]) => (
                  <li key={label as string} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-ink-soft">
                      {legendDot(color as string)}
                      {label}
                    </span>
                    <span className="font-semibold">{count as number}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        {/* Best & worst setups */}
        <section className="mb-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="kicker mb-1">Edge</div>
          <h2 className="mb-4 text-[15px] font-semibold">Best &amp; worst setups</h2>
          {data.setups.length === 0 ? (
            <p className="py-6 text-sm text-faint">
              No tagged trades in this period yet.
            </p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {data.setups.map((s) => (
                <li key={s.name} className="border-b border-line/60 last:border-0">
                  <button
                    type="button"
                    onClick={() => showSetup(s.name)}
                    className="group flex w-full items-center justify-between gap-4 rounded-lg px-2 py-3 text-left transition-colors hover:bg-black/[0.025]"
                  >
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-[14px] font-medium">
                      {s.name}
                      {s.symbol && (
                        <span className="font-normal text-muted"> · {s.symbol}</span>
                      )}
                      <ArrowRightIcon
                        size={13}
                        className="shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </span>
                    <span className="flex shrink-0 items-center gap-5">
                      <span className="text-[12px] text-faint">
                        {Math.round(s.winRate)}% WR · {s.wins}/{s.count}
                      </span>
                      <span
                        className={`num w-24 text-right text-[13.5px] font-semibold ${
                          s.pnl >= 0 ? "text-profit" : "text-loss"
                        }`}
                      >
                        {formatMoney(s.pnl)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <PerformanceCalendar initial={initialCalendar} accountId={accountId} />

        <div className="mt-5">
          <PerformancePanel accountId={accountId} initial={performance} />
        </div>
      </div>

      {openSetup && (
        <DayTradesModal
          title={openSetup}
          totalPnl={setupTotal}
          trades={setupTrades}
          loading={setupLoading}
          onClose={() => setOpenSetup(null)}
        />
      )}
    </div>
  );
}
