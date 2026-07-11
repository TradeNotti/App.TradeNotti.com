"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon, PlusIcon, MinusIcon } from "../icons";

const MIN = 0.5;
const MAX = 5;

// Fullscreen image viewer: zoom in/out (buttons, scroll, +/- keys) and pan.
export default function ImageLightbox({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  const clamp = (s: number) => Math.min(MAX, Math.max(MIN, s));
  const zoomIn = () => setScale((s) => clamp(s + 0.25));
  const zoomOut = () => setScale((s) => clamp(s - 0.25));
  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-" || e.key === "_") zoomOut();
      else if (e.key === "0") reset();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center scrim-strong backdrop-blur-sm"
      onClick={onClose}
      onWheel={(e) => setScale((s) => clamp(s + (e.deltaY < 0 ? 0.15 : -0.15)))}
    >
      {/* Controls */}
      <div
        className="absolute right-4 top-4 flex items-center gap-1 rounded-xl bg-white/10 p-1 text-white backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={zoomOut} aria-label="Zoom out" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/15">
          <MinusIcon size={18} />
        </button>
        <button onClick={reset} className="min-w-14 rounded-lg px-2 text-[13px] font-medium tabular-nums hover:bg-white/15">
          {Math.round(scale * 100)}%
        </button>
        <button onClick={zoomIn} aria-label="Zoom in" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/15">
          <PlusIcon size={18} />
        </button>
        <span className="mx-1 h-5 w-px bg-white/20" />
        <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/15">
          <CloseIcon size={18} />
        </button>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Preview"
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => {
          if (scale <= 1) return;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          drag.current = { sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setPos({
            x: drag.current.px + (e.clientX - drag.current.sx),
            y: drag.current.py + (e.clientY - drag.current.sy),
          });
        }}
        onPointerUp={() => (drag.current = null)}
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          cursor: scale > 1 ? "grab" : "default",
          transition: drag.current ? "none" : "transform 0.12s ease-out",
        }}
        className="max-h-[88vh] max-w-[90vw] select-none object-contain"
      />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[12px] text-white/60">
        Scroll or +/− to zoom · drag to pan · Esc to close
      </div>
    </div>
  );
}
