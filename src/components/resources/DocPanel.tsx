"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DocData } from "@/lib/resources";
import BlockEditor, { type BlockEditorHandle } from "../editor/BlockEditor";
import { UploadIcon, TrashIcon } from "../icons";
import { useConfirm } from "../ConfirmDialog";

type Status = "idle" | "saving" | "saved";

// Best-effort plain-text extraction from a TipTap document for export.
function extractText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (n.text) return n.text;
  let out = "";
  if (Array.isArray(n.content)) out = n.content.map(extractText).join("");
  if (n.type && ["paragraph", "heading", "listItem", "blockquote", "codeBlock"].includes(n.type)) {
    out += "\n";
  }
  return out;
}

export default function DocPanel({
  doc,
  onSaved,
  onDelete,
}: {
  doc: DocData;
  onSaved: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [status, setStatus] = useState<Status>("idle");
  const confirm = useConfirm();
  const titleRef = useRef(title);
  titleRef.current = title;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const body = useRef<BlockEditorHandle>(null);

  // Reset local title when switching to a different doc.
  useEffect(() => {
    setTitle(doc.title);
    setStatus("idle");
  }, [doc.id, doc.title]);

  const doSave = useCallback(async () => {
    setStatus("saving");
    try {
      const res = await fetch(`/api/resources/${doc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleRef.current, content: body.current?.getJSON() }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
      onSaved(doc.id, titleRef.current);
    } catch {
      setStatus("idle");
    }
  }, [doc.id, onSaved]);

  const scheduleSave = useCallback(() => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(doSave, 900);
  }, [doSave]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const exportText = () => {
    const text = extractText(body.current?.getJSON()).trim();
    const content = `${titleRef.current}\n\n${text}`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${titleRef.current || "document"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async () => {
    if (timer.current) clearTimeout(timer.current);
    if (
      !(await confirm({
        title: "Delete this document?",
        message: "This can't be undone.",
      }))
    )
      return;
    await fetch(`/api/resources/${doc.id}`, { method: "DELETE" });
    onDelete(doc.id);
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-[12px] text-faint">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Edited"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={exportText}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-ink-soft hover:bg-black/[0.04]"
          >
            <UploadIcon size={14} /> Export
          </button>
          <button
            onClick={remove}
            aria-label="Delete document"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-loss/40 hover:bg-loss-soft hover:text-loss"
          >
            <TrashIcon size={15} />
          </button>
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          scheduleSave();
        }}
        placeholder="Untitled"
        className="mb-2 w-full bg-transparent text-[26px] font-bold leading-tight tracking-tight outline-none placeholder:text-faint/60"
      />

      <BlockEditor
        key={doc.id}
        ref={body}
        initialContent={doc.content as object}
        onUpdate={scheduleSave}
        placeholder="Write your plan, routine, or notes. Press '/' for blocks…"
      />
    </section>
  );
}
