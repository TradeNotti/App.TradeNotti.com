"use client";

import { useState } from "react";
import type { JournalDetail, CustomProp } from "@/lib/journal";
import type { TradeGrade } from "@prisma/client";
import { signedClass } from "./cells";
import {
  formatPrice,
  formatMoney,
  formatLots,
  formatR,
  formatPercent,
} from "@/lib/format";
import InlineSelect, { type SelectOption } from "./InlineSelect";
import { CloseIcon, PlusIcon } from "../icons";

const GRADE_OPTIONS: SelectOption[] = [
  { value: "HIGH_PROBABILITY", label: "High probability" },
  { value: "LOW_PROBABILITY", label: "Low probability" },
];

const DIRECTION_OPTIONS: SelectOption[] = [
  { value: "Main trend", label: "Main trend" },
  { value: "Countertrend", label: "Countertrend" },
];

function newPropId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `p_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

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

// Read-only value (broker-fed fields). Formats a number or shows a faint dash.
function ReadOnly({
  value,
  format,
  className,
}: {
  value: number | null;
  format: (n: number) => string;
  className?: string;
}) {
  if (value == null) return <span className="text-faint">—</span>;
  return <span className={className}>{format(value)}</span>;
}

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

// Click-to-edit date (date only). Commits on blur / Enter. Empty clears it.
function EditableDate({
  iso,
  placeholder,
  onSave,
}: {
  iso: string | null;
  placeholder: string;
  onSave: (nextIso: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const pad = (n: number) => String(n).padStart(2, "0");
  const localValue = iso
    ? (() => {
        const d = new Date(iso);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      })()
    : "";
  const display = iso
    ? new Date(iso).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  if (editing) {
    const commit = (val: string) => {
      setEditing(false);
      if (!val) return onSave(null);
      const d = new Date(`${val}T12:00:00`);
      if (!Number.isNaN(d.getTime())) onSave(d.toISOString());
    };
    return (
      <input
        type="date"
        autoFocus
        defaultValue={localValue}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setEditing(false);
        }}
        className="rounded-md bg-black/[0.03] px-1.5 py-0.5 text-right text-[13.5px] font-medium text-ink outline-none focus:ring-2 focus:ring-accent/20"
      />
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="rounded-md px-1.5 py-0.5 text-right text-[13.5px] font-medium hover:bg-black/[0.04]"
    >
      {display ?? <span className="text-faint">{placeholder}</span>}
    </button>
  );
}

// One user-defined property: editable name + value, committed on blur.
function PropRow({
  prop,
  onSave,
  onRemove,
}: {
  prop: CustomProp;
  onSave: (next: CustomProp) => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(prop.name);
  const [value, setValue] = useState(prop.value);
  const commit = () => {
    if (name !== prop.name || value !== prop.value) onSave({ ...prop, name, value });
  };
  return (
    <div className="group flex items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        placeholder="Property"
        className="w-[40%] rounded-md bg-black/[0.02] px-2 py-1.5 text-[12.5px] font-medium text-ink-soft outline-none placeholder:text-faint focus:bg-black/[0.04]"
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        placeholder="Value"
        className="flex-1 rounded-md bg-black/[0.02] px-2 py-1.5 text-[12.5px] text-ink outline-none placeholder:text-faint focus:bg-black/[0.04]"
      />
      <button
        onClick={onRemove}
        aria-label="Remove property"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-faint opacity-0 transition-opacity hover:text-loss group-hover:opacity-100"
      >
        <CloseIcon size={13} />
      </button>
    </div>
  );
}

function CustomProps({
  props,
  onChange,
}: {
  props: CustomProp[];
  onChange: (next: CustomProp[]) => void;
}) {
  const save = (updated: CustomProp) =>
    onChange(props.map((p) => (p.id === updated.id ? updated : p)));
  const remove = (id: string) => onChange(props.filter((p) => p.id !== id));
  const add = () => onChange([...props, { id: newPropId(), name: "", value: "" }]);

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="kicker mb-2.5">Properties</div>
      {props.length > 0 && (
        <div className="mb-2 flex flex-col gap-1.5">
          {props.map((p) => (
            <PropRow
              key={p.id}
              prop={p}
              onSave={save}
              onRemove={() => remove(p.id)}
            />
          ))}
        </div>
      )}
      <button
        onClick={add}
        className="flex items-center gap-1 text-[12.5px] font-medium text-accent hover:underline"
      >
        <PlusIcon size={13} /> Add property
      </button>
    </div>
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
  const [showSetup, setShowSetup] = useState(false);

  const patch = async (body: Partial<JournalDetail>) => {
    onChange(body);
    setSaving(true);
    try {
      const res = await fetch(`/api/trades/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
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

  // Plain number (no forced decimals / FX padding) for hand-entered fields.
  const plainNum = (n: number) =>
    n.toLocaleString("en-US", { maximumFractionDigits: 6 });

  const gradeRow = (
    <Row label="Trade grade">
      <InlineSelect
        value={detail.grade ?? null}
        options={GRADE_OPTIONS}
        onChange={(v) => patch({ grade: (v || null) as TradeGrade | null })}
        renderTrigger={gradeTrigger}
      />
    </Row>
  );
  const marketDirRow = (
    <Row label="Market direction">
      <InlineSelect
        value={detail.marketDirection ?? null}
        options={DIRECTION_OPTIONS}
        onChange={(v) => patch({ marketDirection: v || null })}
      />
    </Row>
  );
  const phaseRow = (
    <Row label="Phase of market">
      <EditableText
        value={detail.phaseOfMarket}
        placeholder="e.g. Correction"
        onSave={(phaseOfMarket) => patch({ phaseOfMarket })}
      />
    </Row>
  );

  // ---- Backtest: trimmed field set + user-defined properties ----
  if (detail.isBacktest) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-6">
        <div className="kicker mb-3">Outcome</div>
        <div className="flex flex-col">
          <Row label="Stop loss">
            <EditableNum
              value={detail.stopLoss}
              format={plainNum}
              onSave={(stopLoss) => patch({ stopLoss })}
            />
          </Row>
          <Row label="Entry date">
            <EditableDate
              iso={detail.openedAt}
              placeholder="Set date"
              onSave={(openedAt) => openedAt && patch({ openedAt })}
            />
          </Row>
          <Row label="Exit date">
            <EditableDate
              iso={detail.closedAt}
              placeholder="Set date"
              onSave={(closedAt) => patch({ closedAt })}
            />
          </Row>
          <Row label="ROI">
            <EditableNum
              value={detail.roi}
              format={(n) => formatPercent(n)}
              onSave={(roi) => patch({ roi })}
            />
          </Row>
          {marketDirRow}
          {phaseRow}
          {gradeRow}
        </div>

        <CustomProps
          props={detail.customProps ?? []}
          onChange={(customProps) => patch({ customProps })}
        />

        {saving && <p className="mt-3 text-[11px] text-faint">Saving…</p>}
      </section>
    );
  }

  // ---- Live / journaled trade: full editable panel ----
  const hasSetup = Boolean(
    detail.grade || detail.marketDirection || detail.phaseOfMarket,
  );
  const setupVisible = hasSetup || showSetup;

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
        {/* Entry, exit, P&L and size come straight from the broker feed — shown,
            not edited. Stop loss and Target RR stay editable for annotation. */}
        <Row label="Entry price">
          <ReadOnly value={detail.entry} format={(n) => formatPrice(n)} />
        </Row>
        <Row label="Exit price">
          <ReadOnly value={detail.exitPrice} format={(n) => formatPrice(n)} />
        </Row>
        <Row label="Stop loss">
          <EditableNum
            value={detail.stopLoss}
            format={plainNum}
            onSave={(stopLoss) => patch({ stopLoss })}
          />
        </Row>
        <Row label="Target RR">
          <EditableNum
            value={detail.takeProfit}
            format={plainNum}
            onSave={(takeProfit) => patch({ takeProfit })}
          />
        </Row>
        <Row label="P&amp;L ($)">
          <ReadOnly
            value={detail.pnl}
            format={(n) => formatMoney(n)}
            className={signedClass(detail.pnl)}
          />
        </Row>
        <Row label="Position size">
          <ReadOnly value={detail.volume} format={(n) => formatLots(n)} />
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
            {gradeRow}
            {marketDirRow}
            {phaseRow}
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
