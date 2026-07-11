"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { DayTrade } from "@/lib/analytics";
import {
  formatPrice,
  formatMoney,
  formatR,
  formatLots,
  formatDuration,
  notesToText,
} from "@/lib/format";
import { DirBadge, GradePill, TagChip, signedClass } from "../journal/cells";
import { CloseIcon, ArrowRightIcon } from "../icons";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="kicker mb-0.5">{label}</div>
      <div className="num whitespace-nowrap text-[12.5px] font-medium text-ink-soft">
        {value}
      </div>
    </div>
  );
}

function JournalField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <div>
      <span className="text-faint">{label}: </span>
      <span className="text-ink-soft">{value}</span>
    </div>
  );
}

function TradeBlock({ t }: { t: DayTrade }) {
  const notesText = notesToText(t.notes);
  const hasJournal =
    notesText ||
    t.marketDirection ||
    t.phaseOfMarket ||
    t.stopLossNote ||
    t.tags.length > 0 ||
    t.screenshots.before ||
    t.screenshots.after;

  return (
    <div className="rounded-xl border border-line p-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span
          className={`h-2 w-2 rounded-full ${
            (t.pnl ?? 0) >= 0 ? "bg-profit" : "bg-loss"
          }`}
        />
        <span className="text-[15px] font-semibold">{t.symbol}</span>
        <DirBadge direction={t.direction} />
        <GradePill grade={t.grade} />
        <span className="ml-auto flex items-center gap-3">
          <span className={`num text-[14px] font-semibold ${signedClass(t.pnl)}`}>
            {formatMoney(t.pnl)}
          </span>
          <span className={`num text-[12px] ${signedClass(t.rMultiple)}`}>
            {formatR(t.rMultiple)}
          </span>
        </span>
      </div>

      <div className="mb-3 grid grid-cols-5 gap-2.5">
        <Fact label="Entry" value={formatPrice(t.entry)} />
        <Fact label="Stop" value={formatPrice(t.stopLoss)} />
        <Fact label="Target" value={formatPrice(t.takeProfit)} />
        <Fact label="Size" value={formatLots(t.volume)} />
        <Fact label="Hold" value={formatDuration(t.openedAt, t.closedAt)} />
      </div>

      {hasJournal && (
        <div className="space-y-2.5 border-t border-line/70 pt-3">
          {(t.marketDirection || t.phaseOfMarket || t.stopLossNote) && (
            <div className="flex flex-col gap-1 text-[12.5px]">
              <JournalField label="Stop loss" value={t.stopLossNote} />
              <JournalField label="Market direction" value={t.marketDirection} />
              <JournalField label="Phase of market" value={t.phaseOfMarket} />
            </div>
          )}

          {notesText && (
            <p className="whitespace-pre-wrap rounded-lg bg-black/[0.02] px-3 py-2 text-[13px] leading-relaxed text-ink-soft">
              {notesText}
            </p>
          )}

          {t.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {t.tags.map((tag) => (
                <TagChip key={tag}>{tag}</TagChip>
              ))}
            </div>
          )}

          {(t.screenshots.before || t.screenshots.after) && (
            <div className="grid grid-cols-2 gap-2">
              {(["before", "after"] as const).map((k) =>
                t.screenshots[k] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={k}
                    src={t.screenshots[k] as string}
                    alt={`${k} screenshot`}
                    className="aspect-[16/10] w-full rounded-lg border border-line object-cover"
                  />
                ) : null,
              )}
            </div>
          )}
        </div>
      )}

      <Link
        href={`/journal/${t.id}`}
        className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent hover:underline"
      >
        Open full entry <ArrowRightIcon size={13} />
      </Link>
    </div>
  );
}

export default function DayTradesModal({
  title,
  totalPnl,
  trades,
  loading,
  onClose,
}: {
  title: string;
  totalPnl: number;
  trades: DayTrade[];
  loading: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 scrim" onClick={onClose} aria-hidden />

      <div className="relative flex max-h-[88vh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-xl sm:max-w-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <div className="kicker mb-0.5">{title}</div>
            <h2 className="text-[15px] font-semibold">
              {trades.length} {trades.length === 1 ? "trade" : "trades"}
              {!loading && (
                <span className={`ml-2 num font-bold ${signedClass(totalPnl)}`}>
                  {formatMoney(totalPnl)}
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-black/[0.04]"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto p-5">
          {loading ? (
            <p className="py-8 text-center text-sm text-faint">Loading…</p>
          ) : trades.length === 0 ? (
            <p className="py-8 text-center text-sm text-faint">
              No trades on this day.
            </p>
          ) : (
            trades.map((t) => <TradeBlock key={t.id} t={t} />)
          )}
        </div>
      </div>
    </div>
  );
}
