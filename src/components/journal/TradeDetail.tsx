"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { JournalDetail } from "@/lib/journal";
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
import { ArrowLeftIcon } from "../icons";
import ScreenshotPanel from "./ScreenshotPanel";
import NotesPanel from "./NotesPanel";
import OutcomePanel from "./OutcomePanel";
import TagsPanel from "./TagsPanel";

export default function TradeDetail({ trade }: { trade: JournalDetail }) {
  // Local copy so edits reflect immediately without a full reload.
  const [detail, setDetail] = useState<JournalDetail>(trade);
  const router = useRouter();
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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/journal"
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
        >
          <ArrowLeftIcon size={15} /> Journal · {formatTradeTime(detail.openedAt)}
        </Link>

        <div className="mb-7 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {detail.symbol}
          </h1>
          <DirBadge direction={detail.direction} size="lg" />
          <GradePill grade={detail.grade} />
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
