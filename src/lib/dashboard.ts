import { prisma, accountWhere, type AccountScope } from "./db";

// Extra dashboard metrics derived from the journal, for the current month.
// These power the cards that AnalyticsData doesn't already cover.

export interface DailyPnl {
  date: string; // yyyy-mm-dd
  pnl: number;
  trades: number;
}
export interface RBucket {
  label: string;
  count: number;
  positive: boolean;
}
export interface DirStat {
  count: number;
  wins: number;
  pnl: number;
}
export interface SymbolStat {
  symbol: string;
  pnl: number;
  count: number;
}
export interface OpenPos {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  pnl: number | null;
}

export interface DashboardExtras {
  currency: string;
  balance: number;
  startBalance: number;
  growthPct: number | null;
  profitFactor: number | null;
  dayWinRate: number | null;
  tradingDays: number;
  winDays: number;
  lossDays: number;
  flatDays: number;
  dailyPnl: DailyPnl[];
  rDistribution: RBucket[];
  longShort: { long: DirStat; short: DirStat };
  mostTraded: SymbolStat[];
  phase: { withTrend: DirStat; counter: DirStat; tagged: number; total: number };
  openPositions: OpenPos[];
  openFloating: number;
}

const num = (v: unknown) => (v == null ? null : Number(v));
const mkDir = (): DirStat => ({ count: 0, wins: 0, pnl: 0 });

export async function getDashboardExtras(
  account: AccountScope,
  now = new Date(),
): Promise<DashboardExtras> {
  const accounts = await prisma.account.findMany({
    where: { id: accountWhere(account) },
    select: { balance: true, currency: true },
  });
  const balance = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const currency = accounts[0]?.currency ?? "USD";

  const trades = await prisma.trade.findMany({
    where: { accountId: accountWhere(account), isBacktest: false },
    select: {
      id: true,
      status: true,
      symbol: true,
      direction: true,
      pnl: true,
      rMultiple: true,
      openedAt: true,
      closedAt: true,
      marketDirection: true,
    },
  });

  const closedAll = trades.filter((t) => t.status === "CLOSED" && t.closedAt);
  const open = trades.filter((t) => t.status === "OPEN");

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const inMonth = closedAll.filter(
    (t) => t.closedAt! >= monthStart && t.closedAt! <= now,
  );

  // Start balance from all-time realized P&L.
  const allTimePnl = closedAll.reduce((s, t) => s + (num(t.pnl) ?? 0), 0);
  const startBalance = balance - allTimePnl;
  const growthPct =
    startBalance > 0 ? ((balance - startBalance) / startBalance) * 100 : null;

  // Profit factor (month).
  let grossProfit = 0;
  let grossLoss = 0;
  for (const t of inMonth) {
    const p = num(t.pnl) ?? 0;
    if (p > 0) grossProfit += p;
    else if (p < 0) grossLoss += Math.abs(p);
  }
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null;

  // Daily P&L (month).
  const byDay = new Map<string, { pnl: number; trades: number }>();
  for (const t of inMonth) {
    const d = t.closedAt!.toISOString().slice(0, 10);
    const e = byDay.get(d) ?? { pnl: 0, trades: 0 };
    e.pnl += num(t.pnl) ?? 0;
    e.trades++;
    byDay.set(d, e);
  }
  const dailyPnl = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, pnl: v.pnl, trades: v.trades }));
  const winDays = dailyPnl.filter((d) => d.pnl > 0).length;
  const lossDays = dailyPnl.filter((d) => d.pnl < 0).length;
  const flatDays = dailyPnl.filter((d) => d.pnl === 0).length;
  const tradingDays = dailyPnl.length;
  const dayWinRate = tradingDays ? (winDays / tradingDays) * 100 : null;

  // R-multiple distribution (month).
  const bucketDefs: { label: string; positive: boolean; test: (r: number) => boolean }[] = [
    { label: "≤-2R", positive: false, test: (r) => r <= -2 },
    { label: "-1R", positive: false, test: (r) => r > -2 && r < 0 },
    { label: "0", positive: false, test: (r) => r === 0 },
    { label: "+1R", positive: true, test: (r) => r > 0 && r < 2 },
    { label: "+2R", positive: true, test: (r) => r >= 2 && r < 3 },
    { label: "+3R", positive: true, test: (r) => r >= 3 && r < 4 },
    { label: "≥+4R", positive: true, test: (r) => r >= 4 },
  ];
  const counts = bucketDefs.map(() => 0);
  for (const t of inMonth) {
    const r = num(t.rMultiple);
    if (r == null) continue;
    const i = bucketDefs.findIndex((b) => b.test(r));
    if (i !== -1) counts[i]++;
  }
  const rDistribution: RBucket[] = bucketDefs.map((b, i) => ({
    label: b.label,
    count: counts[i],
    positive: b.positive,
  }));

  // Long vs short (month).
  const longShort = { long: mkDir(), short: mkDir() };
  for (const t of inMonth) {
    const p = num(t.pnl) ?? 0;
    const side = t.direction === "LONG" ? longShort.long : longShort.short;
    side.count++;
    side.pnl += p;
    if (p > 0) side.wins++;
  }

  // Most traded (month).
  const bySym = new Map<string, { pnl: number; count: number }>();
  for (const t of inMonth) {
    const e = bySym.get(t.symbol) ?? { pnl: 0, count: 0 };
    e.pnl += num(t.pnl) ?? 0;
    e.count++;
    bySym.set(t.symbol, e);
  }
  const mostTraded = [...bySym.entries()]
    .map(([symbol, v]) => ({ symbol, pnl: v.pnl, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Market phase & direction (month), from the trade's marketDirection note.
  const phase = { withTrend: mkDir(), counter: mkDir(), tagged: 0, total: inMonth.length };
  for (const t of inMonth) {
    const md = (t.marketDirection ?? "").toLowerCase();
    let bucket: DirStat | null = null;
    if (/counter/.test(md)) bucket = phase.counter;
    else if (/main|with|trend/.test(md)) bucket = phase.withTrend;
    if (bucket) {
      const p = num(t.pnl) ?? 0;
      bucket.count++;
      bucket.pnl += p;
      if (p > 0) bucket.wins++;
      phase.tagged++;
    }
  }

  // Open positions (live floating P&L).
  const openPositions: OpenPos[] = open
    .map((t) => ({
      id: t.id,
      symbol: t.symbol,
      direction: t.direction as "LONG" | "SHORT",
      pnl: num(t.pnl),
    }))
    .slice(0, 8);
  const openFloating = open.reduce((s, t) => s + (num(t.pnl) ?? 0), 0);

  return {
    currency,
    balance,
    startBalance,
    growthPct,
    profitFactor,
    dayWinRate,
    tradingDays,
    winDays,
    lossDays,
    flatDays,
    dailyPnl,
    rDistribution,
    longShort,
    mostTraded,
    phase,
    openPositions,
    openFloating,
  };
}
