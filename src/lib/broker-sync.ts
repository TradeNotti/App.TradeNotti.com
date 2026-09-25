import { prisma } from "./db";
import { brokerMode, getBrokerProvider, type BrokerPosition } from "./broker";
import type { TradeDirection } from "@prisma/client";

// Planned reward-to-risk for an open position, signed in the trade's favor.
function plannedR(p: BrokerPosition): number | null {
  if (p.stopLoss == null || p.takeProfit == null) return null;
  const risk = Math.abs(p.entry - p.stopLoss);
  if (risk === 0) return null;
  const reward = Math.abs(p.takeProfit - p.entry);
  return Math.round((reward / risk) * 100) / 100;
}

export interface SyncResult {
  open: number;
  closed: number;
  imported: number; // closed history trades inserted/updated
}

/**
 * On-demand broker sync: deploy the terminal, pull open positions + closed
 * history since the last sync, reconcile into the Trade table, then ALWAYS
 * undeploy (so MetaApi only bills for this short window).
 *
 * Only broker-sourced trades (externalId set) are reconciled — manually logged
 * trades (externalId null) are never touched.
 */
export async function syncAccountTrades(accountId: string): Promise<SyncResult> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw new Error(`Account not found: ${accountId}`);

  // In live mode, never sync an account that isn't actually broker-connected
  // (avoids mock data leaking into real accounts).
  if (brokerMode() === "metaapi" && !account.metaApiAccountId) {
    return { open: 0, closed: 0, imported: 0 };
  }

  const provider = getBrokerProvider({
    metaApiAccountId: account.metaApiAccountId,
    brokerLogin: account.brokerLogin,
    brokerServer: account.brokerServer,
  });

  // Re-entering on top of a lock the caller determined was abandoned (the
  // previous attempt's function was killed — e.g. a timeout — before it could
  // reset its own status). The terminal may still be deployed from that
  // attempt and billing; clean it up before starting a fresh one.
  if (account.syncStatus === "syncing") {
    await provider.undeploy();
  }

  await prisma.account.update({
    where: { id: accountId },
    data: { syncStatus: "syncing", syncStartedAt: new Date() },
  });

  let deployed = false;
  try {
    await provider.deploy();
    deployed = true;

    const [positions, deals, info] = await Promise.all([
      provider.getOpenPositions(),
      provider.getClosedDeals(account.lastSyncedAt ?? null),
      provider.getAccountInformation(),
    ]);

    // --- reconcile OPEN positions ---
    const seenIds = new Set(positions.map((p) => p.externalId));
    for (const p of positions) {
      const direction: TradeDirection = p.direction;
      await prisma.trade.upsert({
        where: { accountId_externalId: { accountId, externalId: p.externalId } },
        create: {
          accountId,
          externalId: p.externalId,
          symbol: p.symbol,
          direction,
          status: "OPEN",
          entry: p.entry,
          stopLoss: p.stopLoss,
          takeProfit: p.takeProfit,
          volume: p.volume,
          pnl: p.pnl,
          rMultiple: plannedR(p),
          openedAt: p.openedAt,
        },
        update: {
          pnl: p.pnl,
          stopLoss: p.stopLoss,
          takeProfit: p.takeProfit,
          status: "OPEN",
        },
      });
    }

    // --- import CLOSED history (idempotent by externalId = position id) ---
    let imported = 0;
    for (const d of deals) {
      const direction: TradeDirection = d.direction;
      await prisma.trade.upsert({
        where: { accountId_externalId: { accountId, externalId: d.externalId } },
        create: {
          accountId,
          externalId: d.externalId,
          symbol: d.symbol,
          direction,
          status: "CLOSED",
          entry: d.entry,
          exitPrice: d.exit,
          volume: d.volume,
          pnl: d.pnl,
          openedAt: d.openedAt,
          closedAt: d.closedAt,
        },
        update: {
          status: "CLOSED",
          exitPrice: d.exit,
          pnl: d.pnl,
          closedAt: d.closedAt,
        },
      });
      imported++;
    }

    // Close broker-sourced OPEN trades the broker no longer reports as open,
    // unless they were just imported as a closed deal this run.
    const staleOpen = await prisma.trade.findMany({
      where: { accountId, status: "OPEN", externalId: { not: null } },
      select: { id: true, externalId: true },
    });
    const closedIds = new Set(deals.map((d) => d.externalId));
    const toClose = staleOpen.filter(
      (t) => t.externalId && !seenIds.has(t.externalId) && !closedIds.has(t.externalId),
    );
    if (toClose.length > 0) {
      await prisma.trade.updateMany({
        where: { id: { in: toClose.map((t) => t.id) } },
        data: { status: "CLOSED", closedAt: new Date() },
      });
    }

    await prisma.account.update({
      where: { id: accountId },
      data: {
        syncStatus: "idle",
        syncStartedAt: null,
        lastSyncedAt: new Date(),
        // Store the live balance so per-trade ROI (pnl / balance) can be computed.
        ...(info?.balance != null ? { balance: info.balance } : {}),
        ...(info?.currency ? { currency: info.currency } : {}),
      },
    });

    return { open: positions.length, closed: toClose.length, imported };
  } catch (err) {
    await prisma.account.update({
      where: { id: accountId },
      data: { syncStatus: "error", syncStartedAt: null },
    });
    throw err;
  } finally {
    // Always shut the terminal down so we never leave it billing.
    if (deployed) await provider.undeploy();
  }
}
