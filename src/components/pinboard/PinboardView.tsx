"use client";

import { useRef, useState } from "react";
import type { PinData } from "@/lib/pinboard";
import PinViewer from "./PinViewer";
import { ImageIcon, UploadIcon } from "../icons";

// Downscale + compress an image File to a JPEG data URL.
async function compress(file: File, max = 1400, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new window.Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function PinboardView({ initial }: { initial: PinData[] }) {
  const [pins, setPins] = useState<PinData[]>(initial);
  const [viewer, setViewer] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Upload images straight to the board — no details needed (Pinterest-style).
  const handleFiles = async (files: FileList | File[]) => {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setUploading(true);
    try {
      for (const file of images) {
        const image = await compress(file);
        const res = await fetch("/api/pinboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image }),
        });
        if (res.ok) {
          const { pin } = await res.json();
          setPins((prev) => [pin, ...prev]);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const deletePin = async (id: string) => {
    if (!window.confirm("Delete this pin?")) return;
    setPins((prev) => prev.filter((p) => p.id !== id));
    setViewer(null);
    await fetch(`/api/pinboard/${id}`, { method: "DELETE" });
  };

  return (
    <div
      className="flex-1 overflow-y-auto"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pinboard</h1>
            <p className="mt-1 max-w-xl text-[13.5px] text-muted">
              Drag in chart screenshots from MetaTrader 4 / 5 — or any platform.
              Keep the setups you&apos;d repeat in a heartbeat front and centre.
            </p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white hover:bg-accent/90 disabled:opacity-60"
          >
            <UploadIcon size={15} /> {uploading ? "Uploading…" : "Upload screenshot"}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Masonry board */}
        <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
          {pins.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setViewer(i)}
              className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-md sm:mb-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt="Chart" className="w-full object-cover" />
            </button>
          ))}

          {/* Drop tile */}
          <button
            onClick={() => fileRef.current?.click()}
            className={`mb-3 flex aspect-[4/3] w-full break-inside-avoid flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-faint transition-colors sm:mb-4 ${
              dragOver ? "border-accent bg-accent-bg/40 text-accent" : "border-line hover:border-accent/50"
            }`}
          >
            <ImageIcon size={22} />
            <span className="text-[13px] font-medium">Drop screenshot</span>
            <span className="text-[11.5px]">PNG, JPG from MT4 / MT5 / TradingView</span>
          </button>
        </div>
      </div>

      {viewer !== null && (
        <PinViewer
          pins={pins}
          index={viewer}
          setIndex={setViewer}
          onClose={() => setViewer(null)}
          onDelete={deletePin}
        />
      )}
    </div>
  );
}
