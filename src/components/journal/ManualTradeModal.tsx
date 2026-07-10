"use client";

import { useState } from "react";
import { CloseIcon } from "../icons";
import { cleanErrorMessage } from "@/lib/errors";

type Dir = "LONG" | "SHORT";

const input =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function ManualTradeModal({
  isBacktest,
  onClose,
  onSaved,
}: {
  isBacktest: boolean;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<Dir>("LONG");
  const [entry, setEntry] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [pnl, setPnl] = useState("");
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));

  const save = async () => {
    if (!symbol.trim() || entry.trim() === "") {
      setError("Symbol and entry are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/trades/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isBacktest,
          symbol: symbol.trim(),
          direction,
          entry: Number(entry),
          exitPrice: numOrNull(exitPrice),
          stopLoss: numOrNull(stopLoss),
          takeProfit: numOrNull(takeProfit),
          pnl: numOrNull(pnl),
          date,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not save.");
      onSaved(j.id);
    } catch (e) {
      setError(cleanErrorMessage(e, "Could not save."));
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-bold tracking-tight">
            {isBacktest ? "New backtest trade" : "Log a trade"}
          </h3>
          <button onClick={onClose} className="text-faint hover:text-ink">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-ink-soft">Symbol</span>
            <input
              autoFocus
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="EUR/USD"
              className={input}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-ink-soft">Direction</span>
              <div className="inline-flex rounded-lg bg-black/[0.04] p-0.5">
                {(["LONG", "SHORT"] as Dir[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium ${
                      direction === d ? "bg-surface text-ink shadow-sm" : "text-muted"
                    }`}
                  >
                    {d === "LONG" ? "Long" : "Short"}
                  </button>
                ))}
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-ink-soft">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={input}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Num label="Entry" value={entry} onChange={setEntry} />
            <Num label="Exit" value={exitPrice} onChange={setExitPrice} />
            <Num label="Stop loss" value={stopLoss} onChange={setStopLoss} />
            <Num label="Take profit" value={takeProfit} onChange={setTakeProfit} />
          </div>
          <Num label="Result / P&L ($)" value={pnl} onChange={setPnl} />

          {error && <p className="text-[12.5px] text-loss">{error}</p>}

          <div className="mt-1 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-line px-4 py-2 text-[13px] font-medium text-ink-soft hover:bg-black/[0.03]"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Log trade"}
            </button>
          </div>
          <p className="text-[11px] text-faint">
            R is auto-calculated from entry, exit and stop loss. You can add
            screenshots, notes and tags after saving.
          </p>
        </div>
      </div>
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-ink-soft">{label}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className={input}
      />
    </label>
  );
}
