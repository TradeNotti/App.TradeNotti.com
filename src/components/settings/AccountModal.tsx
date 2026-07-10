"use client";

import { useEffect, useState } from "react";
import type { ManagedAccount } from "@/lib/settings";
import type { AccountType } from "@prisma/client";
import { CloseIcon } from "../icons";
import { cleanErrorMessage } from "@/lib/errors";

const input =
  "w-full rounded-lg border border-line px-3 py-2.5 text-[14px] outline-none focus:border-accent/40";

export default function AccountModal({
  mode,
  account,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  account?: ManagedAccount;
  onClose: () => void;
  onSaved: (account: ManagedAccount) => void;
}) {
  const [label, setLabel] = useState(account?.label ?? "");
  const [broker, setBroker] = useState(account?.broker ?? "MetaTrader 5");
  const [currency, setCurrency] = useState(account?.currency ?? "USD");
  const [type, setType] = useState<AccountType>(account?.type ?? "LIVE");
  const [balance, setBalance] = useState(String(account?.balance ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    setSaving(true);
    setError(null);
    const payload = {
      label,
      broker,
      currency,
      type,
      balance: Number(balance) || 0,
    };
    try {
      const res = await fetch(
        mode === "create" ? "/api/accounts" : `/api/accounts/${account!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not save account.");
      onSaved(j.account);
    } catch (e) {
      setError(cleanErrorMessage(e, "Could not save account."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative w-full rounded-t-2xl border border-line bg-surface p-6 shadow-xl sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">
            {mode === "create" ? "Add trading account" : "Edit account"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-black/[0.04]"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="kicker mb-1 block">Account name</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="FTMO 100k" className={input} />
          </label>
          <label className="block">
            <span className="kicker mb-1 block">Broker / platform</span>
            <input value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="MetaTrader 5" className={input} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="kicker mb-1 block">Currency</span>
              <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" className={input} />
            </label>
            <label className="block">
              <span className="kicker mb-1 block">Balance</span>
              <input
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                inputMode="decimal"
                placeholder="100000"
                className={input}
              />
            </label>
          </div>
          <label className="block">
            <span className="kicker mb-1 block">Type</span>
            <div className="inline-flex rounded-lg bg-black/[0.04] p-0.5">
              {(["LIVE", "DEMO"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-md px-4 py-1.5 text-[13px] font-medium transition-colors ${
                    type === t ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
                  }`}
                >
                  {t === "LIVE" ? "Live" : "Demo"}
                </button>
              ))}
            </div>
          </label>

          {error && <p className="text-[12.5px] text-loss">{error}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="mt-1 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-medium text-white hover:bg-accent/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : mode === "create" ? "Add account" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
