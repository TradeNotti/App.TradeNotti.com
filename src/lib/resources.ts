import { prisma, accountWhere, type AccountScope } from "./db";
import { Prisma } from "@prisma/client";

// --- user documents --------------------------------------------------------

export interface DocSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface DocData extends DocSummary {
  content: Prisma.JsonValue | null;
}

export async function listDocs(userId: string): Promise<DocSummary[]> {
  const rows = await prisma.resourceDoc.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });
  return rows.map((d) => ({ id: d.id, title: d.title, updatedAt: d.updatedAt.toISOString() }));
}

export async function getDoc(userId: string, id: string): Promise<DocData | null> {
  const d = await prisma.resourceDoc.findFirst({ where: { id, userId } });
  if (!d) return null;
  return { id: d.id, title: d.title, content: d.content, updatedAt: d.updatedAt.toISOString() };
}

export async function createDoc(
  userId: string,
  title = "Untitled",
): Promise<DocData> {
  const d = await prisma.resourceDoc.create({ data: { userId, title } });
  return { id: d.id, title: d.title, content: d.content, updatedAt: d.updatedAt.toISOString() };
}

export async function updateDoc(
  userId: string,
  id: string,
  data: { title?: string; content?: Prisma.InputJsonValue | null },
): Promise<DocData | null> {
  const existing = await prisma.resourceDoc.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return null;
  const content =
    data.content === null
      ? Prisma.JsonNull
      : (data.content as Prisma.InputJsonValue | undefined);
  const d = await prisma.resourceDoc.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(content !== undefined ? { content } : {}),
    },
  });
  return { id: d.id, title: d.title, content: d.content, updatedAt: d.updatedAt.toISOString() };
}

export async function deleteDoc(userId: string, id: string): Promise<void> {
  await prisma.resourceDoc.deleteMany({ where: { id, userId } });
}

// --- live trading performance (computed from the journal) ------------------

export type Period = "weekly" | "monthly" | "quarterly" | "yearly";

export interface PerformanceRow {
  key: string;
  period: string; // display label
  trades: number;
  wins: number;
  losses: number;
  winRate: number; // 0–100
  avgR: number | null;
  net: number;
  avgWin: number | null; // mean P&L of winning trades
  avgLoss: number | null; // mean P&L of losing trades (<= 0)
}

export interface PerformanceData {
  period: Period;
  summary: {
    net: number;
    winRate: number | null;
    wins: number;
    losses: number;
    avgR: number | null;
    trades: number;
  };
  rows: PerformanceRow[];
}

function periodKeyLabel(d: Date, period: Period): { key: string; label: string } {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  if (period === "yearly") return { key: `${y}`, label: `${y}` };
  if (period === "quarterly") {
    const q = Math.floor(m / 3) + 1;
    return { key: `${y}-Q${q}`, label: `Q${q} ${y}` };
  }
  if (period === "weekly") {
    // bucket by the Monday of the week
    const day = (d.getUTCDay() + 6) % 7;
    const monday = new Date(Date.UTC(y, m, d.getUTCDate() - day));
    const key = `${monday.getUTCFullYear()}-${monday.getUTCMonth()}-${monday.getUTCDate()}`;
    const label = `Wk of ${monday.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })}`;
    return { key, label };
  }
  // monthly
  const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  return { key: `${y}-${String(m + 1).padStart(2, "0")}`, label };
}

/** Trading performance grouped by period, computed from closed trades. */
export async function getPerformance(
  account: AccountScope,
  period: Period,
): Promise<PerformanceData> {
  const trades = await prisma.trade.findMany({
    where: { accountId: accountWhere(account), status: "CLOSED", isBacktest: false },
    orderBy: { closedAt: "asc" },
    select: { pnl: true, rMultiple: true, closedAt: true },
  });

  interface Bucket {
    key: string;
    label: string;
    order: number;
    trades: number;
    wins: number;
    losses: number;
    net: number;
    rSum: number;
    rCount: number;
    winSum: number;
    lossSum: number;
  }
  const buckets = new Map<string, Bucket>();

  // Summary (all-time) accumulators.
  let sNet = 0;
  let sWins = 0;
  let sLosses = 0;
  let sRSum = 0;
  let sRCount = 0;

  for (const t of trades) {
    if (!t.closedAt) continue;
    const pnl = Number(t.pnl) || 0;
    const r = t.rMultiple == null ? null : Number(t.rMultiple);
    const { key, label } = periodKeyLabel(t.closedAt, period);

    let b = buckets.get(key);
    if (!b) {
      b = {
        key,
        label,
        order: t.closedAt.getTime(),
        trades: 0,
        wins: 0,
        losses: 0,
        net: 0,
        rSum: 0,
        rCount: 0,
        winSum: 0,
        lossSum: 0,
      };
      buckets.set(key, b);
    }
    b.trades++;
    b.net += pnl;
    if (pnl > 0) {
      b.wins++;
      b.winSum += pnl;
    } else if (pnl < 0) {
      b.losses++;
      b.lossSum += pnl;
    }
    if (r != null) {
      b.rSum += r;
      b.rCount++;
    }

    sNet += pnl;
    if (pnl > 0) sWins++;
    else if (pnl < 0) sLosses++;
    if (r != null) {
      sRSum += r;
      sRCount++;
    }
  }

  const rows: PerformanceRow[] = [...buckets.values()]
    .sort((a, b) => b.order - a.order)
    .slice(0, 8)
    .map((b) => ({
      key: b.key,
      period: b.label,
      trades: b.trades,
      wins: b.wins,
      losses: b.losses,
      winRate: b.trades ? (b.wins / b.trades) * 100 : 0,
      avgR: b.rCount ? b.rSum / b.rCount : null,
      net: b.net,
      avgWin: b.wins ? b.winSum / b.wins : null,
      avgLoss: b.losses ? b.lossSum / b.losses : null,
    }));

  return {
    period,
    summary: {
      net: sNet,
      winRate: sWins + sLosses ? (sWins / (sWins + sLosses)) * 100 : null,
      wins: sWins,
      losses: sLosses,
      avgR: sRCount ? sRSum / sRCount : null,
      trades: trades.length,
    },
    rows,
  };
}
