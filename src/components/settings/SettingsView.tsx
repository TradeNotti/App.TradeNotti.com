"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ProfileData, ManagedAccount } from "@/lib/settings";
import AccountModal from "./AccountModal";
import ConnectBrokerModal from "./ConnectBrokerModal";
import { PlusIcon, ChevronIcon, TrashIcon, ImageIcon, LogoutIcon } from "../icons";
import ClerkSignOutButton from "./ClerkSignOutButton";
import { cleanErrorMessage } from "@/lib/errors";
import { useConfirm } from "../ConfirmDialog";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

async function compress(file: File, max = 400, quality = 0.85): Promise<string> {
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

function badge(broker: string): string {
  return (
    broker
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AC"
  );
}

function money(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

function syncedLabel(iso: string | null): string {
  if (!iso) return "Never synced";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "Synced just now";
  if (m < 60) return `Synced ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Synced ${h}h ago`;
  return `Synced ${Math.floor(h / 24)}d ago`;
}

export default function SettingsView({
  profile: initialProfile,
  accounts: initialAccounts,
}: {
  profile: ProfileData;
  accounts: ManagedAccount[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialProfile.name);
  const [avatar, setAvatar] = useState<string | null>(initialProfile.avatarUrl);
  const [profileStatus, setProfileStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [profileError, setProfileError] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const [accounts, setAccounts] = useState<ManagedAccount[]>(initialAccounts);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; account?: ManagedAccount } | null>(null);
  const [connectState, setConnectState] = useState<
    { mode: "create" } | { mode: "link"; account: ManagedAccount } | null
  >(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<Record<string, string>>({});

  const signOut = () => router.push("/signin");

  const patchAccount = (id: string, patch: Partial<ManagedAccount>) =>
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const syncNow = async (a: ManagedAccount) => {
    setSyncingId(a.id);
    setSyncMsg((m) => ({ ...m, [a.id]: "" }));
    try {
      const res = await fetch(`/api/sync?accountId=${a.id}`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Sync failed.");
      patchAccount(a.id, { lastSyncedAt: new Date().toISOString(), syncStatus: "idle" });
      setSyncMsg((m) => ({
        ...m,
        [a.id]: `Synced · ${j.imported ?? 0} imported, ${j.open ?? 0} open`,
      }));
    } catch (e) {
      setSyncMsg((m) => ({ ...m, [a.id]: cleanErrorMessage(e, "Sync failed.") }));
    } finally {
      setSyncingId(null);
    }
  };

  const disconnectBroker = async (a: ManagedAccount) => {
    setMenuOpen(null);
    patchAccount(a.id, { connected: false, lastSyncedAt: null });
    await fetch("/api/broker/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: a.id }),
    });
  };

  const saveProfile = async (patch: { name?: string; avatarUrl?: string | null }) => {
    setProfileStatus("saving");
    setProfileError(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not save.");
      setProfileStatus("saved");
      setTimeout(() => setProfileStatus("idle"), 1500);
    } catch (e) {
      setProfileStatus("idle");
      setProfileError(cleanErrorMessage(e, "Could not save."));
    }
  };

  const pickAvatar = async (file: File) => {
    const dataUrl = await compress(file);
    setAvatar(dataUrl);
    saveProfile({ avatarUrl: dataUrl });
  };

  const archive = async (a: ManagedAccount) => {
    setMenuOpen(null);
    setAccounts((prev) =>
      prev.map((x) => (x.id === a.id ? { ...x, archived: !x.archived } : x)),
    );
    await fetch(`/api/accounts/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !a.archived }),
    });
  };

  const confirm = useConfirm();

  const remove = async (a: ManagedAccount) => {
    setMenuOpen(null);
    if (
      !(await confirm({
        title: `Delete "${a.label}"?`,
        message: "This permanently removes the account and all its trades.",
        confirmLabel: "Delete account",
      }))
    )
      return;
    setAccounts((prev) => prev.filter((x) => x.id !== a.id));
    await fetch(`/api/accounts/${a.id}`, { method: "DELETE" });
  };

  const onSaved = (account: ManagedAccount) => {
    setAccounts((prev) => {
      const exists = prev.some((a) => a.id === account.id);
      return exists ? prev.map((a) => (a.id === account.id ? account : a)) : [...prev, account];
    });
    setModal(null);
  };

  const initial = (name || "T").charAt(0).toUpperCase();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="kicker mb-1">Account</div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>

        {/* Profile */}
        <section className="mb-5 rounded-2xl border border-line bg-surface p-6">
          <div className="kicker mb-4">Profile</div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative">
              <span className="block h-20 w-20 overflow-hidden rounded-full">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#9d7bff] text-2xl font-semibold text-white">
                    {initial}
                  </span>
                )}
              </span>
              <button
                onClick={() => avatarRef.current?.click()}
                aria-label="Change photo"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-ink-soft shadow-sm transition-colors hover:text-accent"
              >
                <ImageIcon size={15} />
              </button>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) pickAvatar(f);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="flex-1">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="kicker mb-1 block">Display name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => name !== initialProfile.name && saveProfile({ name })}
                    className="w-full rounded-lg border border-line px-3 py-2.5 text-[14px] outline-none focus:border-accent/40"
                  />
                </label>
                <label className="block">
                  <span className="kicker mb-1 block">Email</span>
                  <input
                    value={initialProfile.email}
                    readOnly
                    disabled
                    title="Email can't be changed"
                    className="w-full cursor-not-allowed rounded-lg border border-line bg-black/[0.02] px-3 py-2.5 text-[14px] text-muted outline-none"
                  />
                </label>
              </div>
              <div className="mt-2 flex items-center gap-3 text-[12px]">
                <span className="text-faint">@{initialProfile.username}</span>
                {avatar && (
                  <button
                    onClick={() => {
                      setAvatar(null);
                      saveProfile({ avatarUrl: null });
                    }}
                    className="text-muted hover:text-loss"
                  >
                    Remove photo
                  </button>
                )}
                <span className="ml-auto text-faint">
                  {profileStatus === "saving" ? "Saving…" : profileStatus === "saved" ? "Saved" : ""}
                </span>
              </div>
              {profileError && <p className="mt-1 text-[12px] text-loss">{profileError}</p>}
            </div>
          </div>
        </section>

        {/* Trading accounts */}
        <section className="rounded-2xl border border-line bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="kicker mb-1">Trading accounts</div>
              <h2 className="text-[15px] font-semibold">Connected</h2>
            </div>
            <button
              onClick={() => setConnectState({ mode: "create" })}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[13px] font-medium text-white hover:bg-accent/90"
            >
              <PlusIcon size={15} /> Add account
            </button>
          </div>

          <ul className="flex flex-col">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 border-b border-line/60 py-3.5 last:border-0"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[12px] font-semibold ${
                    a.archived ? "bg-black/[0.05] text-faint" : "bg-accent text-white"
                  }`}
                >
                  {badge(a.broker)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`text-[14px] font-semibold ${a.archived ? "text-faint" : "text-ink"}`}>
                      {a.type === "LIVE" ? "Live" : "Demo"} · {a.label}
                    </span>
                    {a.archived && (
                      <span className="rounded bg-black/[0.05] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-faint">
                        Archived
                      </span>
                    )}
                  </span>
                  <span className="block text-[12px] text-faint">
                    {a.broker} · {a.currency} · {money(a.balance, a.currency)}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px]">
                    {a.connected ? (
                      <>
                        <span className="inline-flex items-center gap-1 text-profit">
                          <span className="h-1.5 w-1.5 rounded-full bg-profit" /> Connected
                        </span>
                        <span className="text-faint">
                          ·{" "}
                          {syncingId === a.id
                            ? "Syncing…"
                            : syncMsg[a.id] || syncedLabel(a.lastSyncedAt)}
                        </span>
                        <button
                          onClick={() => syncNow(a)}
                          disabled={syncingId === a.id}
                          className="font-medium text-accent hover:underline disabled:opacity-50"
                        >
                          Sync now
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConnectState({ mode: "link", account: a })}
                        className="font-medium text-accent hover:underline"
                      >
                        Connect MetaTrader
                      </button>
                    )}
                  </span>
                </span>

                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === a.id ? null : a.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-ink-soft hover:bg-black/[0.04]"
                  >
                    Manage <ChevronIcon size={14} />
                  </button>
                  {menuOpen === a.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-line bg-surface p-1.5 shadow-lg shadow-black/5">
                        <button
                          onClick={() => {
                            setModal({ mode: "edit", account: a });
                            setMenuOpen(null);
                          }}
                          className="block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-ink-soft hover:bg-black/[0.04]"
                        >
                          Edit details
                        </button>
                        {a.connected ? (
                          <button
                            onClick={() => disconnectBroker(a)}
                            className="block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-ink-soft hover:bg-black/[0.04]"
                          >
                            Disconnect broker
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setConnectState({ mode: "link", account: a });
                              setMenuOpen(null);
                            }}
                            className="block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-ink-soft hover:bg-black/[0.04]"
                          >
                            Connect broker
                          </button>
                        )}
                        <button
                          onClick={() => archive(a)}
                          className="block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-ink-soft hover:bg-black/[0.04]"
                        >
                          {a.archived ? "Unarchive" : "Archive"}
                        </button>
                        <button
                          onClick={() => remove(a)}
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium text-loss hover:bg-loss-soft"
                        >
                          <TrashIcon size={14} /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {accounts.length === 0 && (
            <p className="py-6 text-center text-sm text-faint">
              No accounts yet. Add your first trading account.
            </p>
          )}
        </section>

        {/* Sign out */}
        <div className="mt-5 flex justify-end">
          {clerkEnabled ? (
            <ClerkSignOutButton />
          ) : (
            <button
              onClick={signOut}
              className="flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:border-loss/40 hover:bg-loss-soft hover:text-loss"
            >
              <LogoutIcon size={16} /> Sign out
            </button>
          )}
        </div>
      </div>

      {modal && (
        <AccountModal
          mode={modal.mode}
          account={modal.account}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}

      {connectState && (
        <ConnectBrokerModal
          mode={connectState.mode}
          account={connectState.mode === "link" ? connectState.account : undefined}
          onClose={() => setConnectState(null)}
          onDone={(account) => {
            setAccounts((prev) =>
              prev.some((a) => a.id === account.id)
                ? prev.map((a) => (a.id === account.id ? account : a))
                : [...prev, account],
            );
            setConnectState(null);
            syncNow(account);
          }}
        />
      )}
    </div>
  );
}
