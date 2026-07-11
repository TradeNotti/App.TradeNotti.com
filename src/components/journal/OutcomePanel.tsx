"use client";

import { useState } from "react";
import type { JournalDetail } from "@/lib/journal";
import type { TradeGrade } from "@prisma/client";
import { signedClass } from "./cells";
import {
  formatPrice,
  formatMoney,
  formatLots,
  formatPips,
  formatR,
  formatPercent,
} from "@/lib/format";
import InlineSelect, { type SelectOption } from "./InlineSelect";

const GRADE_OPTIONS: SelectOption[] = [
  { value: "HIGH_PROBABILITY", label: "High probability" },
  { value: "LOW_PROBABILITY", label: "Low probability" },
];

const DIRECTION_OPTIONS: SelectOption[] = [
  { value: "Main trend", label: "Main trend" },
  { value: "Countertrend", label: "Countertrend" },
];

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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/60 py-2.5 last:border-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-[13.5px] font-medium text-ink">{children}</span>
    </div>
  );
}

// Right-aligned inline text field that saves on blur / Enter.
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

// Right-aligned inline NUMBER field. Shows a formatted value when idle, a raw
// numeric input when focused. Saves on blur / Enter.
function EditableNum({
  value,
  format,
  onSave,
  hint,
}: {
  value: number | null;
  format: (n: number) => string;
  onSave: (next: number | null) => void;
  hint?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (editing) {
    const commit = () => {
      const t = draft.trim();
      const next = t === "" ? null : Number(t);
      setEditing(false);
      if (next != null && Number.isNaN(next)) return;
      if (next !== (value ?? null)) onSave(next);
    };
    return (
      <input
        autoFocus
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-32 rounded-md bg-black/[0.03] px-1.5 py-0.5 text-right text-[13.5px] font-medium text-ink outline-none focus:ring-2 focus:ring-accent/20"
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(value == null ? "" : String(value));
        setEditing(true);
      }}
      className="rounded-md px-1.5 py-0.5 text-right text-[13.5px] font-medium hover:bg-black/[0.04]"
    >
      {value == null ? (
        <span className="text-faint">—</span>
      ) : (
        <>
          {format(value)}
          {hint ? <span className="ml-1.5 text-[11px] text-faint">{hint}</span> : null}
        </>
      )}
    </button>
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

  const hasSetup = Boolean(
    detail.grade || detail.marketDirection || detail.phaseOfMarket,
  );
  const [showSetup, setShowSetup] = useState(false);
  const setupVisible = hasSetup || showSetup;

  const patch = async (body: Partial<JournalDetail>) => {
    onChange(body);
    setSaving(true);
    try {
      const res = await fetch(`/api/trades/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      // The server recomputes R and ROI from the new prices — reflect them.
      if (res.ok) {
        const j = (await res.json().catch(() => null)) as
          | { trade?: JournalDetail }
          | null;
        if (j?.trade) {
          onChange({
            rMultiple: j.trade.rMultiple,
            roi: j.trade.roi,
            pnl: j.trade.pnl,
          });
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const slPips =
    detail.stopLoss != null
      ? formatPips(detail.entry, detail.stopLoss, detail.symbol)
      : undefined;

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="kicker mb-2">Outcome</div>
      <div className={`text-[28px] font-bold tracking-tight ${signedClass(detail.pnl)}`}>
        {metrics.pnl}
      </div>
      <div className={`mb-4 text-[14px] font-medium ${signedClass(detail.rMultiple)}`}>
        {formatR(detail.rMultiple)}
      </div>

      <div className="flex flex-col">
        <Row label="Entry price">
          <EditableNum
            value={detail.entry}
            format={(n) => formatPrice(n)}
            onSave={(entry) => patch({ entry: entry ?? 0 })}
          />
        </Row>
        <Row label="Exit price">
          <EditableNum
            value={detail.exitPrice}
            format={(n) => formatPrice(n)}
            onSave={(exitPrice) => patch({ exitPrice })}
          />
        </Row>
        <Row label="Stop loss">
          <EditableNum
            value={detail.stopLoss}
            format={(n) => formatPrice(n)}
            hint={slPips}
            onSave={(stopLoss) => patch({ stopLoss })}
          />
        </Row>
        <Row label="Take profit">
          <EditableNum
            value={detail.takeProfit}
            format={(n) => formatPrice(n)}
            onSave={(takeProfit) => patch({ takeProfit })}
          />
        </Row>
        <Row label="P&amp;L ($)">
          <EditableNum
            value={detail.pnl}
            format={(n) => formatMoney(n)}
            onSave={(pnl) => patch({ pnl })}
          />
        </Row>
        <Row label="Position size">
          <EditableNum
            value={detail.volume}
            format={(n) => formatLots(n)}
            onSave={(volume) => patch({ volume })}
          />
        </Row>
        <Row label="ROI">
          <span className={signedClass(detail.roi)}>{formatPercent(detail.roi)}</span>
        </Row>
        <Row label="Entry date">{metrics.entryAt}</Row>
        <Row label="Exit trade">
          {detail.closedAt ? `${metrics.exitAt} · ${metrics.duration}` : "Open"}
        </Row>

        {setupVisible && (
          <>
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
                placeholder="e.g. Correction"
                onSave={(phaseOfMarket) => patch({ phaseOfMarket })}
              />
            </Row>
          </>
        )}
      </div>

      {!setupVisible && (
        <button
          onClick={() => setShowSetup(true)}
          className="mt-2 text-[12.5px] font-medium text-accent hover:underline"
        >
          + Add grade, market direction &amp; phase
        </button>
      )}

      {saving && <p className="mt-3 text-[11px] text-faint">Saving…</p>}
    </section>
  );
}
