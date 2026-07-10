"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRightIcon, RefreshIcon } from "../icons";
import type { TradeView } from "@/lib/trades";
import {
  formatPrice,
  formatMoney,
  formatR,
  formatTradeTime,
} from "@/lib/format";
import { cleanErrorMessage } from "@/lib/errors";

const POLL_MS = 30_000;

function DirBadge({ direction }: { direction: TradeView["direction"] }) {
  const long = direction === "LONG";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[13px] ${
        long ? "text-profit" : "text-loss"
      }`}
    >
      <span aria-hidden className="text-[10px]">
        {long ? "▲" : "▼"}
      </span>
      {long ? "Long" : "Short"}
    </span>
  );
}

function GradePill({ grade }: { grade: TradeView["grade"] }) {
  if (!grade) return <span className="text-faint">—</span>;
  const high = grade === "HIGH_PROBABILITY";
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[11.5px] font-medium ${
        high
          ? "bg-grade-high-bg text-grade-high"
          : "bg-grade-low-bg text-grade-low"
      }`}
    >
      {high ? "High probability" : "Low probability"}
    </span>
  );
}

function signedClass(n: number | null): string {
  if (n == null) return "text-faint";
  return n > 0 ? "text-profit" : n < 0 ? "text-loss" : "text-ink-soft";
}

export default function TodaysTrades({
  initialTrades,
  accountId,
}: {
  initialTrades: TradeView[];
  accountId: string;
}) {
  const router = useRouter();
  const [trades, setTrades] = useState(initialTrades);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // Read-only refresh of open trades from the DB (no broker deploy — cheap).
  const refetch = async () => {
    try {
      const res = await fetch(
        `/api/trades?status=open&accountId=${accountId}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { trades: TradeView[] };
      setTrades(data.trades);
    } catch {
      /* keep last-known on transient errors */
    }
  };

  // Light poll of the DB so a background (cron) sync shows up without reload.
  // This does NOT hit the broker — actual broker syncs are twice-daily + manual.
  useEffect(() => {
    const id = setInterval(refetch, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  // Manual on-demand broker sync (cooldowned server-side).
  const syncNow = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`/api/sync?accountId=${accountId}`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Sync failed");
      await refetch();
      router.refresh();
      setSyncMsg("Synced");
      setTimeout(() => setSyncMsg(null), 2500);
    } catch (e) {
      setSyncMsg(cleanErrorMessage(e, "Sync failed. Please try again."));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="kicker mb-1">Logged today</div>
          <h2 className="text-[15px] font-semibold">Today&apos;s trades</h2>
        </div>
        <div className="flex items-center gap-3">
          {syncMsg && <span className="text-[12px] text-faint">{syncMsg}</span>}
          <button
            onClick={syncNow}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-black/[0.04] disabled:opacity-60"
          >
            <RefreshIcon size={14} /> {syncing ? "Syncing…" : "Sync now"}
          </button>
          <Link
            href="/journal"
            className="flex items-center gap-1.5 text-[13px] text-muted hover:text-ink"
          >
            Open journal <ArrowRightIcon size={14} />
          </Link>
        </div>
      </div>

      {trades.length === 0 ? (
        <p className="py-6 text-sm text-faint">
          No open positions right now.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="kicker border-b border-line [&>th]:px-3 [&>th]:pb-2 [&>th]:font-semibold">
                <th className="!pl-0">Pair</th>
                <th>Dir.</th>
                <th className="text-right">Entry</th>
                <th className="text-right">SL</th>
                <th className="text-right">TP</th>
                <th className="text-right">P&amp;L</th>
                <th className="text-right">R</th>
                <th>Grade</th>
                <th>Tags</th>
                <th className="!pr-0 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="text-[13.5px]">
              {trades.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => router.push(`/journal/${t.id}`)}
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
                  <td className={`num text-right font-medium ${signedClass(t.pnl)}`}>
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
                        t.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md border border-line px-2 py-0.5 text-[11.5px] text-ink-soft"
                          >
                            {tag}
                          </span>
                        ))
                      )}
                    </span>
                  </td>
                  <td className="num !pr-0 whitespace-nowrap text-right text-[12px] text-muted">
                    {formatTradeTime(t.openedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
