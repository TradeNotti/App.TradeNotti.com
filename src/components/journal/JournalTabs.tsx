"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { JournalRow } from "@/lib/journal";
import JournalView from "./JournalView";
import ManualTradeModal from "./ManualTradeModal";
import { PlusIcon } from "../icons";

type View = "live" | "backtest";
type Options = { symbols: string[]; tags: string[] };

export default function JournalTabs({
  live,
  liveOptions,
  backtest,
  backtestOptions,
  initialView,
}: {
  live: JournalRow[];
  liveOptions: Options;
  backtest: JournalRow[];
  backtestOptions: Options;
  initialView: View;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>(initialView);
  const [modalFor, setModalFor] = useState<View | null>(null);

  const setTab = (v: View) => {
    setView(v);
    const params = new URLSearchParams(searchParams.toString());
    if (v === "backtest") params.set("view", "backtest");
    else params.delete("view");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const isBacktest = view === "backtest";
  const trades = isBacktest ? backtest : live;
  const options = isBacktest ? backtestOptions : liveOptions;

  const tabs = (
    <div className="mb-5 inline-flex rounded-lg bg-black/[0.04] p-0.5">
      {(
        [
          ["live", "Journal", live.length],
          ["backtest", "Backtesting", backtest.length],
        ] as [View, string, number][]
      ).map(([id, label, count]) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            view === id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {label}
          <span
            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
              view === id ? "bg-accent-bg text-accent" : "bg-black/[0.05] text-faint"
            }`}
          >
            {count}
          </span>
        </button>
      ))}
    </div>
  );

  const newButton = (
    <button
      onClick={() => setModalFor(view)}
      className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-accent/90"
    >
      <PlusIcon size={15} /> {isBacktest ? "New backtest" : "Log trade"}
    </button>
  );

  return (
    <>
      <JournalView
        trades={trades}
        options={options}
        title="Journal"
        basePath="/journal"
        headerRight={newButton}
        belowHeader={tabs}
        emptyLabel={
          isBacktest
            ? "No backtest trades yet — log your first one."
            : "No trades yet — log one, or connect a broker to auto-import."
        }
      />
      {modalFor !== null && (
        <ManualTradeModal
          isBacktest={modalFor === "backtest"}
          onClose={() => setModalFor(null)}
          onSaved={(id) => {
            setModalFor(null);
            router.push(`/journal/${id}`);
          }}
        />
      )}
    </>
  );
}
