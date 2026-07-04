"use client";

import { useEffect, useState } from "react";
import { PlusIcon, TrashIcon } from "../icons";

export default function TagsPanel({
  tradeId,
  tags,
  onChange,
}: {
  tradeId: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const [pool, setPool] = useState<string[]>([]);

  // The user's reusable tag pool (tags from all their trades).
  useEffect(() => {
    fetch("/api/tags")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.tags && setPool(d.tags))
      .catch(() => {});
  }, []);

  const save = async (next: string[]) => {
    onChange(next);
    await fetch(`/api/trades/${tradeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: next }),
    });
  };

  // Add a tag to this trade (autosaves) and keep it in the reusable pool.
  const addTag = (name: string) => {
    const n = name.trim();
    if (!n) return;
    if (!tags.includes(n)) save([...tags, n]);
    setPool((p) => (p.includes(n) ? p : [...p, n].sort()));
  };

  const removeFromTrade = (tag: string) => save(tags.filter((t) => t !== tag));

  // Delete a tag from the pool entirely (and off this trade if present).
  const deleteFromPool = async (tag: string) => {
    setPool((p) => p.filter((t) => t !== tag));
    if (tags.includes(tag)) save(tags.filter((t) => t !== tag));
    await fetch(`/api/tags?name=${encodeURIComponent(tag)}`, { method: "DELETE" });
  };

  const commitInput = () => {
    addTag(value);
    setValue("");
    setAdding(false);
  };

  const suggestions = pool.filter((t) => !tags.includes(t));

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="kicker mb-3">Tags</div>

      {/* This trade's tags */}
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent-bg/60 px-2.5 py-1 text-[12.5px] font-medium text-ink-soft"
          >
            {tag}
            <button
              onClick={() => removeFromTrade(tag)}
              aria-label={`Remove ${tag} from this trade`}
              className="leading-none text-faint hover:text-loss"
            >
              ×
            </button>
          </span>
        ))}

        {adding ? (
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commitInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitInput();
              if (e.key === "Escape") {
                setValue("");
                setAdding(false);
              }
            }}
            placeholder="New tag"
            className="w-28 rounded-md border border-accent/40 px-2 py-1 text-[12.5px] outline-none"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-line px-2.5 py-1 text-[12.5px] text-muted hover:border-accent/50 hover:text-accent"
          >
            <PlusIcon size={13} /> Add
          </button>
        )}
      </div>

      {/* Reusable pool — click to add, trash to delete */}
      {suggestions.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-faint">
            Your tags · click to add
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md border border-line text-[12.5px] text-ink-soft"
              >
                <button
                  onClick={() => addTag(tag)}
                  className="py-1 pl-2.5 pr-1.5 hover:text-accent"
                >
                  {tag}
                </button>
                <button
                  onClick={() => deleteFromPool(tag)}
                  aria-label={`Delete tag ${tag}`}
                  className="py-1 pr-1.5 text-faint hover:text-loss"
                  title="Delete this tag"
                >
                  <TrashIcon size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
