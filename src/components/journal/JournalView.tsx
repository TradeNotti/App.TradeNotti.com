"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { JournalRow } from "@/lib/journal";
import { formatPrice, formatMoney, formatR, formatTradeTime } from "@/lib/format";
import { DirBadge, GradePill, TagChip, signedClass } from "./cells";
import FilterMenu, {
  EMPTY_FILTERS,
  formatRFilter,
  formatDateRange,
  type Filters,
} from "./FilterMenu";

const TABS = [
  { id: "ALL", label: "All" },
  { id: "LONG", label: "Long" },
  { id: "SHORT", label: "Short" },
] as const;

function withinRange(iso: string, range: Filters["dateRange"]): boolean {
  if (!range) return true;
  const days = range === "1d" ? 1 : range === "7d" ? 7 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(iso).getTime() >= cutoff;
}

function applyFilters(rows: JournalRow[], f: Filters): JournalRow[] {
  return rows.filter((t) => {
    if (f.direction && t.direction !== f.direction) return false;
    if (f.grade && t.grade !== f.grade) return false;
    if (f.outcome) {
      const p = t.pnl ?? 0;
      if (f.outcome === "WIN" && !(p > 0)) return false;
      if (f.outcome === "LOSS" && !(p < 0)) return false;
      if (f.outcome === "BE" && p !== 0) return false;
    }
    if (f.pairs.length && !f.pairs.includes(t.symbol)) return false;
    if (f.tags.length && !f.tags.some((tag) => t.tags.includes(tag)))
      return false;
    if (f.rMultiple) {
      if (t.rMultiple == null) return false;
      const { op, value } = f.rMultiple;
      if (op === "gte" && !(t.rMultiple >= value)) return false;
      if (op === "lte" && !(t.rMultiple <= value)) return false;
    }
    if (!withinRange(t.openedAt, f.dateRange)) return false;
    if (f.dateFrom && f.dateTo) {
      const day = t.openedAt.slice(0, 10); // yyyy-mm-dd
      if (day < f.dateFrom || day > f.dateTo) return false;
    }
    return true;
  });
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-accent-bg px-2 py-1 text-[12px] font-medium text-accent">
      {label}
      <button onClick={onRemove} aria-label={`Remove ${label}`} className="leading-none">
        ×
      </button>
    </span>
  );
}

export default function JournalView({
  trades,
  options,
  title = "Journal",
  basePath = "/journal",
  headerRight,
  emptyLabel = "No trades match these filters.",
}: {
  trades: JournalRow[];
  options: { symbols: string[]; tags: string[] };
  title?: string;
  basePath?: string;
  headerRight?: React.ReactNode;
  emptyLabel?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("ALL");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const effective: Filters = {
    ...filters,
    direction:
      tab === "ALL" ? filters.direction : (tab as "LONG" | "SHORT"),
  };

  const rows = useMemo(
    () => applyFilters(trades, effective),
    [trades, effective],
  );

  const dateLabel = { "1d": "Today", "7d": "Last 7 days", "30d": "Last 30 days" };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <div className="flex items-center gap-2">
            <FilterMenu filters={filters} setFilters={setFilters} options={options} />
            {headerRight}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex items-center gap-2 border-b border-line pb-px">
          <span className="mr-2 inline-flex items-center gap-2 text-[13px] font-medium text-ink">
            Trades
            <span className="rounded bg-accent-bg px-1.5 py-0.5 text-[11px] font-semibold text-accent">
              {rows.length}
            </span>
          </span>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-black/[0.04] p-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  tab === t.id
                    ? "bg-surface text-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Active filter chips */}
          {filters.dateRange && (
            <Chip
              label={dateLabel[filters.dateRange]}
              onRemove={() => setFilters({ ...filters, dateRange: null })}
            />
          )}
          {filters.dateFrom && filters.dateTo && (
            <Chip
              label={formatDateRange(filters.dateFrom, filters.dateTo)}
              onRemove={() => setFilters({ ...filters, dateFrom: null, dateTo: null })}
            />
          )}
          {filters.outcome && (
            <Chip
              label={
                filters.outcome === "WIN"
                  ? "Win"
                  : filters.outcome === "LOSS"
                    ? "Loss"
                    : "Breakeven"
              }
              onRemove={() => setFilters({ ...filters, outcome: null })}
            />
          )}
          {filters.grade && (
            <Chip
              label={
                filters.grade === "HIGH_PROBABILITY"
                  ? "High probability"
                  : "Low probability"
              }
              onRemove={() => setFilters({ ...filters, grade: null })}
            />
          )}
          {filters.rMultiple && (
            <Chip
              label={formatRFilter(filters.rMultiple)}
              onRemove={() => setFilters({ ...filters, rMultiple: null })}
            />
          )}
          {filters.pairs.map((p) => (
            <Chip
              key={p}
              label={p}
              onRemove={() =>
                setFilters({
                  ...filters,
                  pairs: filters.pairs.filter((x) => x !== p),
                })
              }
            />
          ))}
          {filters.tags.map((t) => (
            <Chip
              key={t}
              label={t}
              onRemove={() =>
                setFilters({
                  ...filters,
                  tags: filters.tags.filter((x) => x !== t),
                })
              }
            />
          ))}
        </div>

        <section className="rounded-2xl border border-line bg-surface p-6">
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-faint">{emptyLabel}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="kicker border-b border-line [&>th]:px-3 [&>th]:pb-2.5 [&>th]:font-semibold">
                    <th className="!pl-0">Pair</th>
                    <th>Dir.</th>
                    <th className="text-right">Entry</th>
                    <th className="text-right">SL</th>
                    <th className="text-right">TP</th>
                    <th className="text-right">P&amp;L</th>
                    <th className="text-right">R</th>
                    <th>Grade</th>
                    <th>Tags</th>
                    <th className="!pr-0 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="text-[13.5px]">
                  {rows.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`${basePath}/${t.id}`)}
                      className="cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-black/[0.02] [&>td]:px-3 [&>td]:py-3.5"
                    >
                      <td className="!pl-0">
                        <span className="flex items-center gap-2 font-medium">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              (t.pnl ?? 0) >= 0 ? "bg-profit" : "bg-loss"
                            }`}
                          />
                          {t.symbol}
                        </span>
                      </td>
                      <td>
                        <DirBadge direction={t.direction} />
                      </td>
                      <td className="num text-right">{formatPrice(t.entry)}</td>
                      <td className="num text-right text-ink-soft">
                        {formatPrice(t.stopLoss)}
                      </td>
                      <td className="num text-right text-ink-soft">
                        {formatPrice(t.takeProfit)}
                      </td>
                      <td
                        className={`num text-right font-medium ${signedClass(t.pnl)}`}
                      >
                        {formatMoney(t.pnl)}
                      </td>
                      <td className={`num text-right ${signedClass(t.rMultiple)}`}>
                        {formatR(t.rMultiple)}
                      </td>
                      <td>
                        <GradePill grade={t.grade} />
                      </td>
                      <td>
                        <span className="flex flex-wrap gap-1.5">
                          {t.tags.length === 0 ? (
                            <span className="text-faint">—</span>
                          ) : (
                            t.tags.map((tag) => <TagChip key={tag}>{tag}</TagChip>)
                          )}
                        </span>
                      </td>
                      <td className="num !pr-0 text-right text-[12px] text-muted">
                        {formatTradeTime(t.openedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
