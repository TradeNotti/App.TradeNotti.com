"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { TrashIcon, CloseIcon } from "./icons";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

/**
 * App-wide branded confirmation dialog. Replaces native window.confirm() so
 * "are you sure?" prompts match the app. Usage:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Delete this?", tone: "danger" }))) return;
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <ConfirmDialog
          opts={opts}
          onCancel={() => close(false)}
          onConfirm={() => close(true)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

function ConfirmDialog({
  opts,
  onCancel,
  onConfirm,
}: {
  opts: ConfirmOptions;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const danger = opts.tone !== "default";

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 scrim" onClick={onCancel} aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-2xl sm:p-6"
      >
        <button
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-faint hover:bg-black/[0.04] hover:text-ink"
        >
          <CloseIcon size={16} />
        </button>

        <div className="flex gap-4">
          <span
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              danger ? "bg-loss-soft text-loss" : "bg-accent-bg text-accent"
            }`}
          >
            <TrashIcon size={18} />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">
              {opts.title}
            </h2>
            {opts.message && (
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                {opts.message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-line px-4 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-black/[0.03]"
          >
            {opts.cancelLabel ?? "Cancel"}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 ${
              danger ? "bg-loss" : "bg-accent"
            }`}
          >
            {opts.confirmLabel ?? "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
