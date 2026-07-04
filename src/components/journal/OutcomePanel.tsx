"use client";

import { useState } from "react";
import type { JournalDetail } from "@/lib/journal";
import type { TradeGrade } from "@prisma/client";
import { signedClass } from "./cells";
import InlineSelect, { type SelectOption } from "./InlineSelect";

const GRADE_OPTIONS: SelectOption[] = [
  { value: "HIGH_PROBABILITY", label: "High probability" },
  { value: "LOW_PROBABILITY", label: "Low probability" },
];

const DIRECTION_OPTIONS: SelectOption[] = [
  { value: "Main trend", label: "Main trend" },
  { value: "Countertrend", label: "Countertrend" },
];

// Trade grade renders as a colored pill, matching the badges used elsewhere.
function gradeTrigger(opt: SelectOption | null) {
  if (!opt) return <span className="text-faint">—</span>;
  const cls =
    opt.value === "HIGH_PROBABILITY"
      ? "bg-grade-high-bg text-grade-high"
      : "bg-grade-low-bg text-grade-low";
  return (
    <span className={`rounded-md px-2 py-0.5 text-[12px] font-semibold ${cls}`}>
      {opt.label}
    </span>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/60 py-2.5 last:border-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-[13.5px] font-medium text-ink">{children}</span>
    </div>
  );
}

// A right-aligned inline text field that saves when you click away or press Enter.
function EditableText({
  value,
  placeholder,
  onSave,
}: {
  value: string | null;
  placeholder: string;
  onSave: (next: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");

  const commit = () => {
    const next = draft.trim() || null;
    if (next !== (value ?? null)) onSave(next);
  };

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setDraft(value ?? "");
      }}
      placeholder={placeholder}
      className="w-36 rounded-md bg-transparent px-1 py-0.5 text-right text-[13.5px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-faint hover:bg-black/[0.03] focus:bg-black/[0.03]"
    />
  );
}

export default function OutcomePanel({
  detail,
  metrics,
  onChange,
}: {
  detail: JournalDetail;
  metrics: {
    pnl: string;
    rMultiple: string;
    roi: string;
    positionSize: string;
    stopLoss: string;
    duration: string;
    entryAt: string;
    exitAt: string;
  };
  onChange: (patch: Partial<JournalDetail>) => void;
}) {
  const [saving, setSaving] = useState(false);

  const patch = async (body: Partial<JournalDetail>) => {
    onChange(body);
    setSaving(true);
    try {
      await fetch(`/api/trades/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="kicker mb-2">Outcome</div>
      <div className={`text-[28px] font-bold tracking-tight ${signedClass(detail.pnl)}`}>
        {metrics.pnl}
      </div>
      <div className={`mb-4 text-[14px] font-medium ${signedClass(detail.rMultiple)}`}>
        {metrics.rMultiple}
      </div>

      <div className="flex flex-col">
        <Row label="Entry date">
          {metrics.entryAt}
        </Row>
        <Row label="Exit trade">
          {detail.closedAt ? `${metrics.exitAt} · ${metrics.duration}` : "Open"}
        </Row>
        <Row label="Stop loss">
          <EditableText
            value={detail.stopLossNote}
            placeholder={metrics.stopLoss}
            onSave={(stopLossNote) => patch({ stopLossNote })}
          />
        </Row>
        <Row label="Position size">
          {metrics.positionSize}
        </Row>
        <Row label="ROI">
          <span className={signedClass(detail.roi)}>{metrics.roi}</span>
        </Row>

        <Row label="Trade grade">
          <InlineSelect
            value={detail.grade ?? null}
            options={GRADE_OPTIONS}
            onChange={(v) => patch({ grade: (v || null) as TradeGrade | null })}
            renderTrigger={gradeTrigger}
          />
        </Row>

        <Row label="Market direction">
          <InlineSelect
            value={detail.marketDirection ?? null}
            options={DIRECTION_OPTIONS}
            onChange={(v) => patch({ marketDirection: v || null })}
          />
        </Row>

        <Row label="Phase of market">
          <EditableText
            value={detail.phaseOfMarket}
            placeholder="e.g. Markup"
            onSave={(phaseOfMarket) => patch({ phaseOfMarket })}
          />
        </Row>
      </div>

      <p className="mt-3 text-[11px] text-faint">
        {saving
          ? "Saving…"
          : "Fill in any blank fields (—) to complete this trade's journal."}
      </p>
    </section>
  );
}
