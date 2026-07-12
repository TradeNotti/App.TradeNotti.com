"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { CloseIcon } from "./icons";

interface ToastAction {
  label: string;
  onClick: () => void;
}
interface ToastItem {
  id: number;
  message: string;
  action?: ToastAction;
}
interface ToastOptions {
  action?: ToastAction;
  duration?: number;
}

const ToastContext = createContext<(message: string, opts?: ToastOptions) => void>(
  () => {},
);

/**
 * Gmail-style toasts: a dark pill at the bottom of the screen with an optional
 * inline action (e.g. "Undo"). Auto-dismisses after a few seconds.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const tm = timers.current.get(id);
    if (tm) clearTimeout(tm);
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    (message: string, opts?: ToastOptions) => {
      const id = (idRef.current += 1);
      setToasts((t) => [...t, { id, message, action: opts?.action }]);
      const tm = setTimeout(() => dismiss(id), opts?.duration ?? 6000);
      timers.current.set(id, tm);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 rounded-xl bg-[#1c1e26] px-4 py-3 text-[13px] text-white shadow-2xl ring-1 ring-white/10"
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
                className="font-semibold text-[#a99bff] hover:text-white"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="text-white/45 hover:text-white"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
