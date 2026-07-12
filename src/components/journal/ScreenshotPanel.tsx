"use client";

import { useEffect, useRef, useState } from "react";
import { UploadIcon, PlusIcon } from "../icons";
import { cleanErrorMessage } from "@/lib/errors";
import ImageLightbox from "../notebook/ImageLightbox";

type Kind = "BEFORE" | "AFTER";
type Shots = { before: string | null; after: string | null };

// Downscale + compress an image file to a JPEG data URL so it fits within the
// request body limit and the database stores something reasonable.
async function compress(file: File, max = 1600, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
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

function Slot({
  kind,
  label,
  sub,
  src,
  busy,
  onPick,
  onRemove,
  onView,
}: {
  kind: Kind;
  label: string;
  sub: string;
  src: string | null;
  busy: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
  onView: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="rounded bg-gradient-to-br from-accent to-[#9d7bff] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          {label}
        </span>
        <span className="text-[12px] text-muted">{sub}</span>
        {src && (
          <button
            onClick={onRemove}
            className="ml-auto text-[12px] text-faint hover:text-loss"
          >
            Remove
          </button>
        )}
      </div>

      {src ? (
        // Uploaded: click the image to view it full-screen; hover to replace.
        <div className="group relative aspect-[16/10] overflow-hidden rounded-xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`${label} screenshot`}
            onClick={onView}
            title="Click to view full size"
            className="h-full w-full cursor-zoom-in object-cover"
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 rounded-md bg-[rgba(0,0,0,0.6)] px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            Replace
          </button>
          {busy && (
            <span className="absolute inset-0 grid place-items-center bg-[rgba(0,0,0,0.55)] text-[12px] text-white">
              Uploading…
            </span>
          )}
        </div>
      ) : (
        <button
          data-screenshot-slot
          onClick={() => inputRef.current?.click()}
          onPaste={(e) => {
            const file = Array.from(e.clipboardData.items)
              .find((it) => it.type.startsWith("image/"))
              ?.getAsFile();
            if (file) {
              e.preventDefault();
              onPick(file);
            }
          }}
          title="Click to upload, or paste an image (Ctrl/⌘+V)"
          className="group relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-black/[0.015] transition-colors hover:border-accent/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        >
          <span className="flex flex-col items-center gap-1.5 text-faint group-hover:text-accent">
            <PlusIcon size={20} />
            <span className="text-[12px]">
              {busy ? "Uploading…" : "Add or paste screenshot"}
            </span>
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function ScreenshotPanel({
  tradeId,
  screenshots,
  onChange,
}: {
  tradeId: string;
  screenshots: Shots;
  onChange: (s: Shots) => void;
}) {
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const upload = async (kind: Kind, file: File) => {
    setBusy(kind);
    setError(null);
    try {
      const dataUrl = await compress(file);
      const res = await fetch(`/api/trades/${tradeId}/screenshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, dataUrl }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Upload failed");
      }
      onChange({ ...screenshots, [kind.toLowerCase()]: dataUrl });
    } catch (e) {
      setError(cleanErrorMessage(e, "Upload failed."));
    } finally {
      setBusy(null);
    }
  };

  // Paste an image anywhere on the page (outside the notes editor / inputs) and
  // it drops into the first empty screenshot slot — no need to click first.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest?.(
          '.tiptap-content, input, textarea, [contenteditable="true"], [data-screenshot-slot]',
        )
      ) {
        return; // handled by the editor or the focused slot itself
      }
      const file = Array.from(e.clipboardData?.items ?? [])
        .find((it) => it.type.startsWith("image/"))
        ?.getAsFile();
      if (!file) return;
      e.preventDefault();
      const kind: Kind = !screenshots.before
        ? "BEFORE"
        : !screenshots.after
          ? "AFTER"
          : "BEFORE";
      upload(kind, file);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenshots]);

  const remove = async (kind: Kind) => {
    onChange({ ...screenshots, [kind.toLowerCase()]: null });
    await fetch(`/api/trades/${tradeId}/screenshot?kind=${kind}`, {
      method: "DELETE",
    });
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="mb-1 kicker">Screenshots</div>
      <h2 className="mb-4 text-[15px] font-semibold">Before &amp; after</h2>

      {error && (
        <p className="mb-3 rounded-lg bg-loss-soft px-3 py-2 text-[12px] text-loss">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Slot
          kind="BEFORE"
          label="Before"
          sub="Pre-trade · entry plan"
          src={screenshots.before}
          busy={busy === "BEFORE"}
          onPick={(f) => upload("BEFORE", f)}
          onRemove={() => remove("BEFORE")}
          onView={() => screenshots.before && setLightbox(screenshots.before)}
        />
        <Slot
          kind="AFTER"
          label="After"
          sub="Post-trade · outcome"
          src={screenshots.after}
          busy={busy === "AFTER"}
          onPick={(f) => upload("AFTER", f)}
          onRemove={() => remove("AFTER")}
          onView={() => screenshots.after && setLightbox(screenshots.after)}
        />
      </div>

      {lightbox && (
        <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />
      )}

      <p className="mt-4 flex items-center gap-1.5 text-[12px] text-faint">
        <UploadIcon size={13} /> Just paste an image (Ctrl/⌘+V) — it fills the
        next empty slot — or click a slot to upload.
      </p>
    </section>
  );
}
