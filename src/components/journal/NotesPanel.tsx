"use client";

import { useEffect, useRef, useState } from "react";
import {
  MicIcon,
  StopIcon,
  TemplateIcon,
  PlusIcon,
  TrashIcon,
  ChevronIcon,
} from "../icons";
import BlockEditor, { type BlockEditorHandle } from "../editor/BlockEditor";
import { cleanErrorMessage } from "@/lib/errors";
import { useConfirm } from "../ConfirmDialog";
import type { TemplateData } from "@/lib/notebook";

// Notes are stored as a stringified TipTap doc. Legacy notes are plain text.
function parseContent(notes: string | null): object | string {
  if (!notes) return "";
  const t = notes.trim();
  if (t.startsWith("{")) {
    try {
      return JSON.parse(t) as object;
    } catch {
      /* fall through to plain text */
    }
  }
  return notes;
}

export default function NotesPanel({
  tradeId,
  notes,
  onChange,
}: {
  tradeId: string;
  notes: string | null;
  onChange: (notes: string) => void;
}) {
  const editor = useRef<BlockEditorHandle>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const confirm = useConfirm();

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load the user's saved templates (shared with the notebook).
  useEffect(() => {
    fetch("/api/notebook/templates")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.templates && setTemplates(d.templates))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      recorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const persist = async () => {
    const text = JSON.stringify(editor.current?.getJSON() ?? {});
    setStatus("saving");
    try {
      const res = await fetch(`/api/trades/${tradeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: text }),
      });
      if (!res.ok) throw new Error();
      onChange(text);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("idle");
      setError("Could not save note.");
    }
  };

  const scheduleSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, 900);
  };

  // ---- voice ----
  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        await transcribe(blob);
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError("Microphone access was denied.");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const transcribe = async (blob: Blob) => {
    setTranscribing(true);
    setError(null);
    try {
      // Name the upload by its real type (Safari records mp4, Chrome webm) so
      // the server / OpenAI can decode it.
      const ext = (blob.type.split("/")[1] || "webm").split(";")[0];
      const form = new FormData();
      form.append("audio", blob, `note.${ext}`);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Transcription failed");
      const text = (j.text || "").trim();
      if (text) {
        editor.current?.insertText(text);
        scheduleSave();
      } else {
        setError("Nothing was transcribed — try again.");
      }
    } catch (e) {
      setError(cleanErrorMessage(e, "Transcription failed."));
    } finally {
      setTranscribing(false);
    }
  };

  // ---- templates ----
  const applyTemplate = (t: TemplateData) => {
    editor.current?.setContent((t.content as object) ?? "");
    setMenuOpen(false);
    scheduleSave();
  };

  const saveAsTemplate = async () => {
    setMenuOpen(false);
    const name = window.prompt("Template name", "Post-trade review");
    if (!name?.trim()) return;
    const res = await fetch("/api/notebook/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), content: editor.current?.getJSON() }),
    });
    if (res.ok) {
      const { template } = await res.json();
      setTemplates((prev) => [template, ...prev]);
    }
  };

  const removeTemplate = async (id: string) => {
    if (!(await confirm({ title: "Delete this template?" }))) return;
    await fetch(`/api/notebook/templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="kicker mb-1">Notes</div>
          <h2 className="text-[15px] font-semibold">What happened</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Templates */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-black/[0.04]"
            >
              <TemplateIcon size={15} /> Templates
              <span className="text-faint">
                <ChevronIcon size={14} />
              </span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-xl shadow-black/10">
                <div className="kicker px-2 py-1.5">Apply template</div>
                {templates.length === 0 ? (
                  <p className="px-2 py-2 text-[12px] text-faint">No templates yet.</p>
                ) : (
                  templates.map((t) => (
                    <div
                      key={t.id}
                      className="group flex items-center rounded-lg hover:bg-black/[0.03]"
                    >
                      <button
                        onClick={() => applyTemplate(t)}
                        className="flex-1 truncate px-2.5 py-1.5 text-left text-[13px] text-ink"
                      >
                        {t.name}
                      </button>
                      <button
                        onClick={() => removeTemplate(t.id)}
                        aria-label="Delete template"
                        className="px-2 text-faint opacity-0 hover:text-loss group-hover:opacity-100"
                      >
                        <TrashIcon size={13} />
                      </button>
                    </div>
                  ))
                )}
                <div className="my-1 border-t border-line" />
                <button
                  onClick={saveAsTemplate}
                  className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium text-accent hover:bg-accent-bg"
                >
                  <PlusIcon size={14} /> Save note as template
                </button>
              </div>
            )}
          </div>

          {/* Voice */}
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={transcribing}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors disabled:opacity-60 ${
              recording
                ? "border-loss/40 bg-loss-soft text-loss"
                : "border-accent/40 bg-accent-bg text-accent hover:bg-accent-bg/70"
            }`}
          >
            {recording ? <StopIcon size={15} /> : <MicIcon size={15} />}
            {recording ? "Stop" : transcribing ? "Transcribing…" : "Record note"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-loss-soft px-3 py-2 text-[12px] text-loss">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-line bg-black/[0.01] px-4 py-3">
        <BlockEditor
          ref={editor}
          initialContent={parseContent(notes)}
          onUpdate={scheduleSave}
          contentClassName="tiptap-compact"
          placeholder="Write what happened — type '/' for blocks, or tap Record note to dictate…"
        />
      </div>

      <div className="mt-2 text-[12px] text-faint">
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Notes save automatically."}
      </div>
    </section>
  );
}
