import { NextRequest, NextResponse } from "next/server";
import { getActiveAccount } from "@/lib/account";
import { syncAccountTrades } from "@/lib/broker-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Minimum gap between manual syncs (cost control — avoids deploy churn).
const COOLDOWN_MS = 60_000;

// A "syncing" lock older than this is treated as abandoned rather than
// in-progress. Comfortably above maxDuration (120s) below, so a lock this
// old can only mean the previous attempt's function was killed (timeout,
// cold-start eviction, etc.) before it could reset its own status — not
// that it's still genuinely running.
const STALE_LOCK_MS = 3 * 60_000;

// POST /api/sync[?accountId=...] — on-demand broker sync for one account.
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId") ?? undefined;

  const account = await getActiveAccount(accountId);
  if (!account) {
    return NextResponse.json({ error: "No account found" }, { status: 404 });
  }

  if (account.syncStatus === "syncing") {
    // No timestamp (accounts stuck from before this field existed) or one
    // older than STALE_LOCK_MS -> the lock is abandoned; fall through and
    // let this request actually sync instead of bouncing forever.
    const startedAt = account.syncStartedAt?.getTime();
    const stale = !startedAt || Date.now() - startedAt > STALE_LOCK_MS;
    if (!stale) {
      return NextResponse.json({ error: "Sync already in progress." }, { status: 409 });
    }
  }
  if (
    account.lastSyncedAt &&
    Date.now() - account.lastSyncedAt.getTime() < COOLDOWN_MS
  ) {
    const wait = Math.ceil(
      (COOLDOWN_MS - (Date.now() - account.lastSyncedAt.getTime())) / 1000,
    );
    return NextResponse.json(
      { error: `Just synced — try again in ${wait}s.` },
      { status: 429 },
    );
  }

  try {
    const result = await syncAccountTrades(account.id);
    return NextResponse.json({ accountId: account.id, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 502 },
    );
  }
}
