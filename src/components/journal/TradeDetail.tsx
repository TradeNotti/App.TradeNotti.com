"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { JournalDetail } from "@/lib/journal";
import type { TradeDirection } from "@prisma/client";
import {
  formatMoney,
  formatR,
  formatPercent,
  formatPips,
  formatLots,
  formatDuration,
  formatTradeTime,
  formatAbsolute,
} from "@/lib/format";
import { DirBadge, GradePill } from "./cells";
import { ArrowLeftIcon, TrashIcon } from "../icons";
import { useTabTitle } from "../tabs/TabsProvider";
import { useConfirm } from "../ConfirmDialog";
import { useToast } from "../Toast";
import ScreenshotPanel from "./ScreenshotPanel";
import NotesPanel from "./NotesPanel";
import OutcomePanel from "./OutcomePanel";
import TagsPanel from "./TagsPanel";

export default function TradeDetail({
  trade,
  backHref = "/journal",
  backLabel = "Journal",
}: {
  trade: JournalDetail;
  backHref?: string;
  backLabel?: string;
}) {
  // Local copy so edits reflect immediately without a full reload.
  const [detail, setDetail] = useState<JournalDetail>(trade);
  // Label this page's tab with the instrument instead of a generic "Trade".
  useTabTitle(detail.symbol);
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();

  // Delete this trade, then offer a Gmail-style "Undo" that restores it.
  const deleteTrade = async () => {
    const ok = await confirm({
      title: "Delete this trade?",
      message: "It's removed from your journal. You can undo right after.",
      confirmLabel: "Delete trade",
    });
    if (!ok) return;
    const res = await fetch(`/api/trades/${detail.id}`, { method: "DELETE" });
    const j = (await res.json().catch(() => null)) as { trade?: { id: string } } | null;
    router.push(backHref);
    router.refresh();
    const snapshot = j?.trade;
    toast("Trade deleted", {
      action: snapshot
        ? {
            label: "Undo",
            onClick: async () => {
              await fetch("/api/trades/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(snapshot),
              });
              router.push(`/journal/${snapshot.id}`);
              router.refresh();
            },
          }
        : undefined,
    });
  };
  const firstRender = useRef(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When this trade is edited (grade, tags, notes, screenshots, …), invalidate
  // the client router cache (debounced) so the Journal list and Today reflect
  // the change the moment the user navigates back — no manual refresh needed.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => router.refresh(), 800);
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [detail, router]);

  // Save an edit to a core trade field and reflect the server's recomputed R /
  // ROI / P&L in place (no reload).
  const patchTrade = async (body: Partial<JournalDetail>) => {
    setDetail((d) => ({ ...d, ...body }));
    const res = await fetch(`/api/trades/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const j = (await res.json().catch(() => null)) as
        | { trade?: JournalDetail }
        | null;
      if (j?.trade)
        setDetail((d) => ({
          ...d,
          rMultiple: j.trade!.rMultiple,
          roi: j.trade!.roi,
          pnl: j.trade!.pnl,
        }));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href={backHref}
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
        >
          <ArrowLeftIcon size={15} /> {backLabel} · {formatTradeTime(detail.openedAt)}
        </Link>

        <div className="mb-7 flex flex-wrap items-center gap-x-3 gap-y-2">
          <SymbolHeading
            key={detail.id}
            value={detail.symbol}
            onSave={(symbol) => patchTrade({ symbol })}
          />
          {/* Direction is editable only on manual/backtest trades; live trades
              are pulled from the broker and shown as a read-only badge. */}
          {detail.isBacktest ? (
            <DirectionToggle
              value={detail.direction}
              onChange={(direction) => patchTrade({ direction })}
            />
          ) : (
            <DirBadge direction={detail.direction} size="lg" />
          )}
          <GradePill grade={detail.grade} />
          {detail.isBacktest && (
            <button
              onClick={deleteTrade}
              aria-label="Delete trade"
              title="Delete trade"
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-faint transition-colors hover:bg-loss-soft hover:text-loss"
            >
              <TrashIcon size={16} />
            </button>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          {/* Left column */}
          <div className="flex flex-col gap-5">
            <ScreenshotPanel
              tradeId={detail.id}
              screenshots={detail.screenshots}
              onChange={(screenshots) =>
                setDetail((d) => ({ ...d, screenshots }))
              }
            />
            <NotesPanel
              tradeId={detail.id}
              notes={detail.notes}
              onChange={(notes) => setDetail((d) => ({ ...d, notes }))}
            />
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            <OutcomePanel
              detail={detail}
              metrics={{
                pnl: formatMoney(detail.pnl),
                rMultiple: formatR(detail.rMultiple),
                roi: formatPercent(detail.roi),
                positionSize: formatLots(detail.volume),
                stopLoss: formatPips(detail.entry, detail.stopLoss, detail.symbol),
                duration: formatDuration(detail.openedAt, detail.closedAt),
                entryAt: formatAbsolute(detail.openedAt),
                exitAt: detail.closedAt ? formatAbsolute(detail.closedAt) : "Open",
              }}
              onChange={(patch) => setDetail((d) => ({ ...d, ...patch }))}
            />
            <TagsPanel
              tradeId={detail.id}
              tags={detail.tags}
              onChange={(tags) => setDetail((d) => ({ ...d, tags }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Click-to-edit instrument heading. Commits on blur / Enter.
function SymbolHeading({
  value,
  onSave,
}: {
  value: string;
  onSave: (next: string) => void;
}) {
  const initial = value === "Untitled trade" ? "" : value;
  const [draft, setDraft] = useState(initial);
  const commit = () => {
    const next = draft.trim();
    if (next && next !== value) onSave(next);
  };
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setDraft(initial);
      }}
      placeholder="Untitled trade"
      aria-label="Instrument / symbol"
      className="min-w-0 max-w-[15ch] rounded-md bg-transparent text-2xl font-bold tracking-tight outline-none placeholder:text-faint hover:bg-black/[0.03] focus:bg-black/[0.03] sm:text-3xl"
    />
  );
}

// Long / Short segmented toggle.
function DirectionToggle({
  value,
  onChange,
}: {
  value: TradeDirection;
  onChange: (next: TradeDirection) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-black/[0.04] p-0.5">
      {(["LONG", "SHORT"] as TradeDirection[]).map((d) => {
        const active = value === d;
        const long = d === "LONG";
        return (
          <button
            key={d}
            onClick={() => onChange(d)}
            className={`rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
              active
                ? long
                  ? "bg-surface text-profit shadow-sm"
                  : "bg-surface text-loss shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            {long ? "▲ Long" : "▼ Short"}
          </button>
        );
      })}
    </div>
  );
}
