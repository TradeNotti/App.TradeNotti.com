"use client";

import { useEffect } from "react";
import type { PinData } from "@/lib/pinboard";
import { CloseIcon, ChevronIcon, TrashIcon } from "../icons";

export default function PinViewer({
  pins,
  index,
  setIndex,
  onClose,
  onDelete,
}: {
  pins: PinData[];
  index: number;
  setIndex: (i: number) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const prev = () => setIndex((index - 1 + pins.length) % pins.length);
  const next = () => setIndex((index + 1) % pins.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, pins.length]);

  const pin = pins[index];
  if (!pin) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center scrim-strong backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="absolute right-4 top-4 flex items-center gap-1 rounded-xl bg-white/10 p-1 text-white backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="px-2 text-[13px] font-medium tabular-nums">
          {index + 1} / {pins.length}
        </span>
        <button
          onClick={() => onDelete(pin.id)}
          aria-label="Delete pin"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/15"
        >
          <TrashIcon size={17} />
        </button>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/15"
        >
          <CloseIcon size={18} />
        </button>
      </div>

      {/* Prev */}
      {pins.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          aria-label="Previous"
          className="absolute left-3 flex h-11 w-11 rotate-90 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6"
        >
          <ChevronIcon size={22} />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={pin.image}
        alt="Chart"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-[86vw] rounded-lg object-contain"
      />

      {/* Next */}
      {pins.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          aria-label="Next"
          className="absolute right-3 flex h-11 w-11 -rotate-90 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6"
        >
          <ChevronIcon size={22} />
        </button>
      )}
    </div>
  );
}
