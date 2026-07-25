"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NoteData, TemplateData } from "@/lib/notebook";
import BlockEditor, { type BlockEditorHandle } from "../editor/BlockEditor";
import { useConfirm } from "../ConfirmDialog";
import {
  ArrowLeftIcon,
  TemplateIcon,
  ChevronIcon,
  TrashIcon,
  PlusIcon,
  CalendarIcon,
} from "../icons";

type Status = "idle" | "saving" | "saved";

const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function NoteEditor({
  note,
  templates: initialTemplates,
}: {
  note: NoteData;
  templates: TemplateData[];
}) {
  const router = useRouter();
  const [date, setDate] = useState(note.date);
  const [title, setTitle] = useState(note.title ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [templates, setTemplates] = useState<TemplateData[]>(initialTemplates);
  const confirm = useConfirm();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [movingDate, setMovingDate] = useState(false);

  const titleRef = useRef(title);
  titleRef.current = title;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const body = useRef<BlockEditorHandle>(null);

  const doSave = useCallback(async () => {
    setStatus("saving");
    try {
      const res = await fetch(`/api/notebook/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleRef.current,
          content: body.current?.getJSON(),
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch {
      setStatus("idle");
    }
  }, [note.id]);

  const scheduleSave = useCallback(() => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(doSave, 900);
  }, [doSave]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const applyTemplate = (t: TemplateData) => {
    body.current?.setContent((t.content as object) ?? "");
    if (!titleRef.current) setTitle(t.name);
    setMenuOpen(false);
    scheduleSave();
  };

  const saveAsTemplate = async () => {
    const name = window.prompt("Template name", title || "My template");
    if (!name?.trim()) return;
    const res = await fetch("/api/notebook/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), content: body.current?.getJSON() }),
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

  // Move this page to a different day, without losing its title/content.
  const changeDate = async (nextDate: string) => {
    setEditingDate(false);
    if (!VALID_DATE.test(nextDate) || nextDate === date) return;
    setMovingDate(true);
    try {
      const res = await fetch(`/api/notebook/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: nextDate }),
      });
      if (res.ok) {
        setDate(nextDate);
        router.replace(`/notebook/${nextDate}/${note.id}`);
      }
    } finally {
      setMovingDate(false);
    }
  };

  const deletePage = async () => {
    if (timer.current) clearTimeout(timer.current);
    if (
      !(await confirm({
        title: "Delete this page?",
        message: "This can't be undone.",
      }))
    )
      return;
    await fetch(`/api/notebook/notes/${note.id}`, { method: "DELETE" });
    router.push(`/notebook/${date}`);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/notebook/${date}`}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
            >
              <ArrowLeftIcon size={15} /> {dayLabel(date)}
            </Link>

            {editingDate ? (
              <input
                type="date"
                defaultValue={date}
                autoFocus
                onChange={(e) => changeDate(e.target.value)}
                onBlur={() => setEditingDate(false)}
                className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[12px] text-ink-soft outline-none focus:border-accent/40"
              />
            ) : (
              <button
                onClick={() => setEditingDate(true)}
                title="Move page to a different day"
                aria-label="Move page to a different day"
                className="flex h-6 w-6 items-center justify-center rounded-md text-faint hover:bg-black/[0.04] hover:text-ink-soft"
              >
                <CalendarIcon size={13} />
              </button>
            )}
            {movingDate && <span className="text-[11px] text-faint">Moving…</span>}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-faint">
              {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
            </span>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[13px] font-medium text-ink-soft hover:bg-black/[0.04]"
              >
                <TemplateIcon size={15} /> Templates
                <ChevronIcon size={14} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-lg shadow-black/5">
                  <div className="kicker px-2 py-1.5">Apply template</div>
                  {templates.length === 0 ? (
                    <p className="px-2 py-2 text-[12px] text-faint">No templates yet.</p>
                  ) : (
                    templates.map((t) => (
                      <div key={t.id} className="group flex items-center">
                        <button
                          onClick={() => applyTemplate(t)}
                          className="flex-1 truncate rounded-md px-2 py-1.5 text-left text-[13px] text-ink-soft hover:bg-black/[0.04]"
                        >
                          {t.name}
                        </button>
                        <button
                          onClick={() => removeTemplate(t.id)}
                          aria-label="Delete template"
                          className="mr-1 hidden h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-loss-soft hover:text-loss group-hover:flex"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    ))
                  )}
                  <div className="my-1 h-px bg-line" />
                  <button
                    onClick={() => {
                      saveAsTemplate();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-accent hover:bg-accent-bg/60"
                  >
                    <PlusIcon size={14} /> Save current page as template
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={deletePage}
              title="Delete page"
              aria-label="Delete page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-loss/40 hover:bg-loss-soft hover:text-loss"
            >
              <TrashIcon size={15} />
            </button>
          </div>
        </div>

        {/* Title */}
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave();
          }}
          placeholder="Untitled"
          className="mb-2 w-full bg-transparent text-[32px] font-bold leading-tight tracking-tight outline-none placeholder:text-faint/60"
        />

        <BlockEditor ref={body} initialContent={note.content as object} onUpdate={scheduleSave} />
      </div>
    </div>
  );
}
