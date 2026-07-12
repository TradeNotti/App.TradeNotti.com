"use client";

import { useState } from "react";
import type { RuleView } from "@/lib/rules";
import { PlusIcon, TrashIcon } from "../icons";
import { useConfirm } from "../ConfirmDialog";

export default function RulebookView({
  initialRules,
}: {
  initialRules: RuleView[];
}) {
  const [rules, setRules] = useState<RuleView[]>(initialRules);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const confirm = useConfirm();

  const addRule = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const { rule } = await res.json();
      setRules((prev) => [...prev, rule]);
    }
  };

  const removeRule = async (id: string) => {
    if (!(await confirm({ title: "Delete this rule?" }))) return;
    setRules((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/rules/${id}`, { method: "DELETE" });
  };

  const saveEdit = async (id: string) => {
    const text = editText.trim();
    setEditingId(null);
    if (!text) return;
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, text } : r)));
    await fetch(`/api/rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">Rules</h1>

        <section className="rounded-2xl border border-line bg-surface p-6">
          <div className="kicker mb-1">Personal rulebook</div>
          <h2 className="mb-5 text-[18px] font-semibold">
            Trade only what you wrote down.
          </h2>

          {/* Rules list */}
          {rules.length === 0 ? (
            <p className="py-6 text-sm text-faint">
              No rules yet. Add your first rule below.
            </p>
          ) : (
            <ul className="flex flex-col">
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className="group flex items-center gap-3 border-b border-line/60 py-3 last:border-0"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {editingId === rule.id ? (
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => saveEdit(rule.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(rule.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 bg-transparent text-[14px] text-ink outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(rule.id);
                        setEditText(rule.text);
                      }}
                      className="flex-1 text-left text-[14px] text-ink-soft hover:text-ink"
                    >
                      {rule.text}
                    </button>
                  )}
                  <button
                    onClick={() => removeRule(rule.id)}
                    aria-label="Delete rule"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-faint opacity-0 transition-opacity hover:bg-loss-soft hover:text-loss group-hover:opacity-100"
                  >
                    <TrashIcon size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add new rule — at the bottom */}
          <div className="mt-3 flex items-center gap-3 border-t border-line pt-4">
            <span className="text-faint">
              <PlusIcon size={16} />
            </span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRule()}
              placeholder="Write a new rule and press Enter…"
              className="flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
