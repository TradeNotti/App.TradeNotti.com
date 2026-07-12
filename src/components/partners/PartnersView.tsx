"use client";

import { useState } from "react";
import type {
  PartnerCard,
  IncomingRequest,
  OutgoingRequest,
} from "@/lib/partners";
import { formatMoney } from "@/lib/format";
import Sparkline from "./Sparkline";
import { EyeIcon, CheckIcon, CloseIcon, PartnersIcon, TrashIcon } from "../icons";

const PALETTE = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-500",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
function colorFor(username: string): string {
  let h = 0;
  for (const c of username) h = (h + c.charCodeAt(0)) % PALETTE.length;
  return PALETTE[h];
}
function sinceLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function Avatar({ name, username, size = 40 }: { name: string; username: string; size?: number }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white ${colorFor(username)}`}
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  );
}

export default function PartnersView({
  initial,
}: {
  initial: {
    partners: PartnerCard[];
    incoming: IncomingRequest[];
    outgoing: OutgoingRequest[];
  };
}) {
  const [data, setData] = useState(initial);
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const refresh = async () => {
    const res = await fetch("/api/partners", { cache: "no-store" });
    if (res.ok) setData(await res.json());
  };

  const invite = async () => {
    if (!handle.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/partners/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: handle }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not send invite.");
      setHandle("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send invite.");
    } finally {
      setSending(false);
    }
  };

  const respond = async (id: string, accept: boolean) => {
    await fetch(`/api/partners/${id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    });
    await refresh();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Remove this partner?")) return;
    await fetch(`/api/partners/${id}`, { method: "DELETE" });
    await refresh();
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Partners</h1>
        <p className="mt-1 max-w-2xl text-[13.5px] text-muted">
          Share your stats with a trusted trader and keep each other honest. They
          see your performance numbers and can nudge you when you slip.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Main column */}
          <div className="flex flex-col gap-5">
            {/* Add a partner */}
            <section className="rounded-2xl border border-line bg-surface p-6">
              <div className="kicker mb-1">Add a partner</div>
              <h2 className="mb-4 text-[15px] font-semibold">Invite by @username</h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && invite()}
                  placeholder="@username"
                  className="flex-1 rounded-lg border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-accent/40"
                />
                <button
                  onClick={invite}
                  disabled={sending}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-medium text-white hover:bg-accent/90 disabled:opacity-60"
                >
                  <PartnersIcon size={15} /> {sending ? "Sending…" : "Send invite"}
                </button>
              </div>
              {error && <p className="mt-2 text-[12.5px] text-loss">{error}</p>}
            </section>

            {/* Pending requests */}
            {data.incoming.length > 0 && (
              <section className="rounded-2xl border border-line bg-surface p-6">
                <div className="kicker mb-4">Pending requests</div>
                <ul className="flex flex-col gap-4">
                  {data.incoming.map((r) => (
                    <li key={r.partnershipId} className="flex items-center gap-3">
                      <Avatar name={r.name} username={r.username} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold text-ink">
                          {r.name}
                        </span>
                        <span className="block text-[12px] text-faint">
                          @{r.username} · {r.mutual} mutual{" "}
                          {r.mutual === 1 ? "partner" : "partners"}
                        </span>
                      </span>
                      <button
                        onClick={() => respond(r.partnershipId, false)}
                        className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted hover:bg-black/[0.04]"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => respond(r.partnershipId, true)}
                        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-accent to-[#9d7bff] px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90"
                      >
                        <CheckIcon size={14} /> Accept
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Partner cards */}
            {data.partners.length === 0 ? (
              <section className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-faint">
                No partners yet. Invite a trader by their @username above.
              </section>
            ) : (
              data.partners.map((p) => (
                <section
                  key={p.partnershipId}
                  className="rounded-2xl border border-line bg-surface"
                >
                  <div className="flex flex-wrap items-center gap-3 p-5">
                    <Avatar name={p.name} username={p.username} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-ink">
                        {p.name}
                      </span>
                      <span className="flex items-center gap-2 text-[12px] text-faint">
                        @{p.username} <span>·</span>
                        <span className="inline-flex items-center gap-1 font-medium text-accent">
                          <EyeIcon size={13} /> Stats
                        </span>
                        <span>·</span> Partners since {sinceLabel(p.since)}
                      </span>
                    </span>
                    <button
                      onClick={() => remove(p.partnershipId)}
                      aria-label="Remove partner"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-faint hover:bg-loss-soft hover:text-loss"
                    >
                      <TrashIcon size={15} />
                    </button>
                  </div>

                  <div className="flex items-center gap-6 border-t border-line/70 px-5 py-4">
                    <Stat
                      label="Week net"
                      value={formatMoney(p.stats.weekNet)}
                      tone={p.stats.weekNet >= 0 ? "up" : "down"}
                      sub={
                        p.stats.netChangePct != null ? (
                          <span className={p.stats.netChangePct >= 0 ? "text-profit" : "text-loss"}>
                            {p.stats.netChangePct >= 0 ? "▲" : "▼"}{" "}
                            {Math.abs(p.stats.netChangePct).toFixed(1)}% vs last wk
                          </span>
                        ) : undefined
                      }
                    />
                    <Stat
                      label="Win rate"
                      value={p.stats.winRate == null ? "—" : `${Math.round(p.stats.winRate)}%`}
                      sub={
                        p.stats.winRatePrev != null && p.stats.winRate != null ? (
                          <span
                            className={
                              p.stats.winRate >= p.stats.winRatePrev ? "text-profit" : "text-loss"
                            }
                          >
                            {p.stats.winRate >= p.stats.winRatePrev ? "▲" : "▼"}{" "}
                            {Math.abs(Math.round(p.stats.winRate - p.stats.winRatePrev))}% vs last wk
                          </span>
                        ) : undefined
                      }
                    />
                    <Stat label="Trades" value={String(p.stats.trades)} />
                    <span className="ml-auto">
                      <Sparkline points={p.stats.spark} positive={p.stats.weekNet >= 0} />
                    </span>
                  </div>

                  <div className="border-t border-line/70 bg-black/[0.015] px-5 py-2.5 text-[12px] text-faint">
                    {p.stats.lastActive ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-profit" />
                        Logged {p.stats.lastActive}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        No trades logged this week
                      </span>
                    )}
                  </div>
                </section>
              ))
            )}
          </div>

          {/* Right column — invites you've sent */}
          <div>
            <section className="rounded-2xl border border-line bg-surface p-5">
              <div className="kicker mb-3">Invites sent</div>
              {data.outgoing.length === 0 ? (
                <p className="text-[13px] text-faint">
                  Invites you send appear here until accepted.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {data.outgoing.map((o) => (
                    <li key={o.partnershipId} className="flex items-center gap-2.5">
                      <Avatar name={o.name} username={o.username} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {o.name}
                        </span>
                        <span className="block text-[11.5px] text-faint">
                          @{o.username} · pending
                        </span>
                      </span>
                      <button
                        onClick={() => remove(o.partnershipId)}
                        aria-label="Cancel invite"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-black/[0.05] hover:text-ink"
                      >
                        <CloseIcon size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
  sub?: React.ReactNode;
}) {
  return (
    <span>
      <span className="kicker block">{label}</span>
      <span
        className={`num text-[15px] font-semibold ${
          tone === "up" ? "text-profit" : tone === "down" ? "text-loss" : "text-ink"
        }`}
      >
        {value}
      </span>
      {sub && <span className="mt-0.5 block text-[11px]">{sub}</span>}
    </span>
  );
}
