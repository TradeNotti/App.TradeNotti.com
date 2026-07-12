"use client";

import { useCallback, useState } from "react";
import type { MonthGrid, HabitStat, DayStatus } from "@/lib/habits";
import { PlusIcon, ChevronIcon, CheckIcon, TrashIcon, CloseIcon } from "../icons";

const cycleStatus = (s: DayStatus): DayStatus =>
  s === null ? "done" : s === "done" ? "missed" : null;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const COLORS = [
  "#5b4ef5", "#0d9d66", "#e23b3b", "#f59e0b", "#0ea5e9",
  "#ec4899", "#8b5cf6", "#14b8a6", "#0e0f13",
];

const EMOJI_SUGGESTIONS = [
  "✅", "🌅", "💧", "📖", "🏋️", "🧘", "🚭", "😴", "📈", "📝",
  "🎯", "🚫", "🧠", "💪", "☕", "🍎", "📵", "🔥",
];

// Sample habits a trader might track — one-tap to add when starting fresh.
const STARTERS = [
  { name: "Follow my trading plan", emoji: "🎯", color: "#5b4ef5" },
  { name: "Journal every trade", emoji: "📝", color: "#0d9d66" },
  { name: "No revenge trading", emoji: "🚫", color: "#e23b3b" },
  { name: "Review at end of day", emoji: "📈", color: "#0ea5e9" },
  { name: "Wake up 6:30", emoji: "🌅", color: "#f59e0b" },
];

function milestone(streak: number): string | null {
  if (streak >= 100) return "💯 Legendary";
  if (streak >= 60) return "🏆 Unstoppable";
  if (streak >= 30) return "⭐ 30-day";
  if (streak >= 14) return "🚀 2 weeks";
  if (streak >= 7) return "🔥 1 week";
  return null;
}

const pad = (n: number) => String(n).padStart(2, "0");

export default function HabitTracker({ initial }: { initial: MonthGrid }) {
  const [grid, setGrid] = useState<MonthGrid>(initial);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<HabitStat | null>(null);
  const [adding, setAdding] = useState(false);

  const reload = useCallback(async (year: number, month: number) => {
    const res = await fetch(`/api/habits?year=${year}&month=${month}`, { cache: "no-store" });
    if (res.ok) setGrid(await res.json());
  }, []);

  const changeMonth = async (delta: number) => {
    const d = new Date(Date.UTC(grid.year, grid.month + delta, 1));
    setBusy(true);
    await reload(d.getUTCFullYear(), d.getUTCMonth());
    setBusy(false);
  };

  // Optimistic cell cycle (none → done → missed → none), then refetch to
  // refresh streaks + completion.
  const toggle = async (habit: HabitStat, dayIdx: number) => {
    const date = `${grid.year}-${pad(grid.month + 1)}-${pad(dayIdx + 1)}`;
    setGrid((g) => ({
      ...g,
      habits: g.habits.map((h) =>
        h.id === habit.id
          ? { ...h, days: h.days.map((v, i) => (i === dayIdx ? cycleStatus(v) : v)) }
          : h,
      ),
    }));
    await fetch(`/api/habits/${habit.id}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    reload(grid.year, grid.month);
  };

  const saveHabit = async (
    data: { id?: string; name: string; emoji: string; color: string },
  ) => {
    if (data.id) {
      await fetch(`/api/habits/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, emoji: data.emoji, color: data.color }),
      });
    } else {
      await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setEditing(null);
    setAdding(false);
    reload(grid.year, grid.month);
  };

  const removeHabit = async (id: string) => {
    if (!window.confirm("Delete this habit and its history?")) return;
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
    setEditing(null);
    reload(grid.year, grid.month);
  };

  const days = Array.from({ length: grid.daysInMonth }, (_, i) => i + 1);

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-black/[0.03]"
            aria-label="Previous month"
          >
            <span className="rotate-90">
              <ChevronIcon size={16} />
            </span>
          </button>
          <div className="min-w-[9.5rem] text-center text-[15px] font-semibold tracking-tight">
            {MONTHS[grid.month]} {grid.year}
          </div>
          <button
            onClick={() => changeMonth(1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-black/[0.03]"
            aria-label="Next month"
          >
            <span className="-rotate-90">
              <ChevronIcon size={16} />
            </span>
          </button>
        </div>

        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-accent/90"
        >
          <PlusIcon size={15} /> Add habit
        </button>
      </div>

      {/* Completion summary */}
      <div className="mb-5 flex items-center gap-4 rounded-xl bg-accent-bg/60 px-4 py-3">
        <ProgressRing pct={grid.completionPct} />
        <div>
          <div className="text-[13px] font-semibold text-ink">
            {grid.completionPct}% consistency this month
          </div>
          <div className="text-[12px] text-muted">
            {grid.habits.length} habit{grid.habits.length === 1 ? "" : "s"} ·
            keep the streak alive 🔥
          </div>
        </div>
      </div>

      {grid.habits.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-faint">
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-accent text-white">
              <CheckIcon size={10} />
            </span>
            Done
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-line bg-black/[0.05] text-faint">
              <CloseIcon size={10} />
            </span>
            Missed
          </span>
          <span>Tap a day to cycle: done → missed → clear</span>
        </div>
      )}

      {grid.habits.length === 0 ? (
        <EmptyState onAdd={() => setAdding(true)} onQuickAdd={saveHabit} />
      ) : (
        <div className="overflow-x-auto pb-1">
          <div className="min-w-max">
            {/* Day header */}
            <div className="flex items-end gap-1">
              <div className="sticky left-0 z-10 w-44 shrink-0 bg-surface" />
              {days.map((d) => {
                const isToday = grid.todayDay === d;
                return (
                  <div
                    key={d}
                    className={`w-7 shrink-0 text-center text-[10px] font-medium ${
                      isToday ? "text-accent" : "text-faint"
                    }`}
                  >
                    {d}
                  </div>
                );
              })}
            </div>

            {/* Habit rows */}
            <div className="mt-1.5 flex flex-col gap-1.5">
              {grid.habits.map((h) => (
                <div key={h.id} className="flex items-center gap-1">
                  <button
                    onClick={() => setEditing(h)}
                    className="sticky left-0 z-10 flex w-44 shrink-0 items-center gap-2 rounded-lg bg-surface px-1.5 py-1 text-left hover:bg-black/[0.03]"
                    title="Edit habit"
                  >
                    <span className="text-[15px] leading-none">{h.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-ink">
                        {h.name}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10.5px]">
                        {h.currentStreak > 0 && (
                          <span className="font-bold text-[#d9650a]">
                            🔥 {h.currentStreak}d
                          </span>
                        )}
                        {h.longestStreak > 0 && (
                          <span className="text-faint">best {h.longestStreak}d</span>
                        )}
                      </span>
                    </span>
                  </button>

                  {h.days.map((status, i) => {
                    const day = i + 1;
                    const isFuture =
                      grid.relation === "future" ||
                      (grid.relation === "current" &&
                        grid.todayDay != null &&
                        day > grid.todayDay);
                    const isToday = grid.todayDay === day;
                    const done = status === "done";
                    const missed = status === "missed";
                    return (
                      <button
                        key={i}
                        disabled={isFuture}
                        onClick={() => toggle(h, i)}
                        style={done ? { backgroundColor: h.color, borderColor: h.color } : undefined}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          done
                            ? "text-white"
                            : missed
                              ? "border-line bg-black/[0.05] text-faint"
                              : isFuture
                                ? "cursor-default border-line/50 bg-black/[0.015]"
                                : "border-line hover:bg-black/[0.05]"
                        } ${isToday ? "ring-2 ring-accent ring-offset-1" : ""}`}
                        aria-label={`Mark ${h.name} day ${day}`}
                        title="Tap: done → missed → clear"
                      >
                        {done && <CheckIcon size={13} />}
                        {missed && <CloseIcon size={12} />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reward badges */}
      {grid.habits.some((h) => milestone(h.currentStreak)) && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          {grid.habits
            .filter((h) => milestone(h.currentStreak))
            .map((h) => (
              <span
                key={h.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 text-[12px] font-medium text-ink"
              >
                <span>{h.emoji}</span>
                <span className="text-muted">{h.name}</span>
                <span className="font-semibold text-accent">{milestone(h.currentStreak)}</span>
              </span>
            ))}
        </div>
      )}

      {busy && <p className="mt-3 text-[11px] text-faint">Loading…</p>}

      {(editing || adding) && (
        <HabitModal
          habit={editing}
          onClose={() => {
            setEditing(null);
            setAdding(false);
          }}
          onSave={saveHabit}
          onDelete={editing ? () => removeHabit(editing.id) : undefined}
        />
      )}
    </section>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0 -rotate-90">
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--color-line)" strokeWidth="4" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

function EmptyState({
  onAdd,
  onQuickAdd,
}: {
  onAdd: () => void;
  onQuickAdd: (d: { name: string; emoji: string; color: string }) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <span className="text-3xl">🔥</span>
      <div>
        <p className="text-[15px] font-semibold text-ink">Build your discipline streak</p>
        <p className="mt-1 text-[13px] text-muted">
          Track the habits that make you a consistent trader. Tap a day to mark it done.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {STARTERS.map((s) => (
          <button
            key={s.name}
            onClick={() => onQuickAdd(s)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1.5 text-[12.5px] font-medium text-ink-soft hover:border-accent/40 hover:bg-accent-bg"
          >
            <span>{s.emoji}</span> {s.name}
          </button>
        ))}
      </div>
      <button
        onClick={onAdd}
        className="mt-1 flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent/90"
      >
        <PlusIcon size={15} /> Create your own
      </button>
    </div>
  );
}

function HabitModal({
  habit,
  onClose,
  onSave,
  onDelete,
}: {
  habit: HabitStat | null;
  onClose: () => void;
  onSave: (d: { id?: string; name: string; emoji: string; color: string }) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(habit?.name ?? "");
  const [emoji, setEmoji] = useState(habit?.emoji ?? "✅");
  const [color, setColor] = useState(habit?.color ?? COLORS[0]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center scrim p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-bold tracking-tight">
            {habit ? "Edit habit" : "New habit"}
          </h3>
          <button onClick={onClose} className="text-faint hover:text-ink">
            <CloseIcon size={18} />
          </button>
        </div>

        <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. No revenge trading"
          autoFocus
          className="mb-4 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />

        <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">Icon</label>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {EMOJI_SUGGESTIONS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[15px] ${
                emoji === e ? "border-accent bg-accent-bg" : "border-line hover:bg-black/[0.03]"
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">Color</label>
        <div className="mb-5 flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`h-7 w-7 rounded-full ring-offset-2 transition-transform ${
                color === c ? "ring-2 ring-ink" : "hover:scale-110"
              }`}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          {onDelete ? (
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-loss hover:bg-loss-soft"
            >
              <TrashIcon size={15} /> Delete
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={() =>
              name.trim() && onSave({ id: habit?.id, name: name.trim(), emoji, color })
            }
            disabled={!name.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {habit ? "Save changes" : "Create habit"}
          </button>
        </div>
      </div>
    </div>
  );
}
