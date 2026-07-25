"use client";

import { useState } from "react";
import type { Range } from "@/lib/analytics";
import DateRangePicker from "../DateRangePicker";
import { CalendarIcon } from "../icons";

const RANGES: { id: Range; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "ytd", label: "YTD" },
  { id: "all", label: "All" },
];

// Shared time-range control for the Dashboard — governs Net P&L, Profit
// factor, Win rate (MetricsBar) and the Analytics section below it.
export default function RangeSwitcher({
  range,
  periodLabel,
  loading = false,
  onChange,
}: {
  range: Range;
  periodLabel: string;
  loading?: boolean;
  onChange: (range: Range, custom?: { from: string; to: string }) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);

  return (
    <div className={`flex items-center justify-end gap-2 ${loading ? "opacity-60" : ""}`}>
      <div className="inline-flex rounded-lg bg-black/[0.04] p-0.5">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              setShowPicker(false);
              onChange(r.id);
            }}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              range === r.id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
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
          {range === "custom" && custom ? periodLabel : "Custom"}
        </button>
        {showPicker && (
          <div className="absolute right-0 z-30 mt-2 rounded-xl border border-line bg-surface shadow-lg shadow-black/5">
            <DateRangePicker
              from={custom?.from ?? null}
              to={custom?.to ?? null}
              onApply={(from, to) => {
                setShowPicker(false);
                setCustom({ from, to });
                onChange("custom", { from, to });
              }}
              onClear={() => {
                setCustom(null);
                setShowPicker(false);
                onChange("month");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
