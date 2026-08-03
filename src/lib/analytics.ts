import { prisma, accountWhere, type AccountScope } from "./db";
import type {
  Prisma,
  TradeDirection,
  TradeGrade,
  ScreenshotKind,
} from "@prisma/client";

export type Range = "week" | "month" | "ytd" | "all" | "custom";

export interface CustomRange {
  from: string; // yyyy-mm-dd
  to: string; // yyyy-mm-dd
}

export interface SetupStat {
  name: string; // the tag, treated as a "setup"
  symbol: string | null; // most-traded instrument for this tag
  winRate: number; // 0–100  = wins / count
  wins: number;
  losses: number;
  count: number; // closed trades carrying this tag, in range
  pnl: number; // net P&L across those trades
}

export interface AnalyticsData {
  range: Range;
  periodLabel: string; // e.g. "MAY 2026"
  currency: string;

  netPnl: number;
  netPnlDeltaPct: number | null; // vs previous period
  winRate: number | null; // 0–100
  winRatePrev: number | null;
  wins: number;
  closedCount: number;
  avgRR: number | null;
  avgRRPrev: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  profitFactor: number | null; // gross profit / gross loss, for the selected range

  equityCurve: { t: string; equity: number }[];
  distribution: { wins: number; losses: number; breakeven: number; open: number };
  setups: SetupStat[];
}

type TradeWithTags = Prisma.TradeGetPayload<{
  include: { tags: { include: { tag: true } } };
}>;

const num = (v: unknown) => (v == null ? null : Number(v));

// --- time windows (all UTC for determinism) -------------------------------

export interface Window {
  start: Date | null;
  end: Date;
}

function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function monthYearLabel(d: Date): string {
  return d
    .toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
    .toUpperCase();
}

function rangeLabel(from: string, to: string): string {
  const fmt = (s: string) =>
    new Date(`${s}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(from)} – ${fmt(to)}`.toUpperCase();
}

export function resolveWindows(
  range: Range,
  now: Date,
  custom?: CustomRange,
): {
  current: Window;
  previous: Window | null;
  label: string;
} {
  if (range === "custom" && custom) {
    const start = new Date(`${custom.from}T00:00:00.000Z`);
    const end = new Date(`${custom.to}T23:59:59.999Z`);
    const span = end.getTime() - start.getTime();
    return {
      current: { start, end },
      previous: { start: new Date(start.getTime() - span), end: start },
      label: rangeLabel(custom.from, custom.to),
    };
  }
  switch (range) {
    case "week": {
      const start = new Date(now.getTime() - 7 * 864e5);
      const prevStart = new Date(now.getTime() - 14 * 864e5);
      return {
        current: { start, end: now },
        previous: { start: prevStart, end: start },
        label: "THIS WEEK",
      };
    }
    case "ytd": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      const prevStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
      const prevEnd = new Date(
        Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate()),
      );
      return {
        current: { start, end: now },
        previous: { start: prevStart, end: prevEnd },
        label: `${now.getUTCFullYear()} YTD`,
      };
    }
    case "all":
      return { current: { start: null, end: now }, previous: null, label: "ALL TIME" };
    case "month":
    default: {
      const start = startOfMonthUTC(now);
      const prevStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
      );
      return {
        current: { start, end: now },
        previous: { start: prevStart, end: start },
        label: monthYearLabel(now),
      };
    }
  }
}

export function inWindow(date: Date, w: Window): boolean {
  return (w.start === null || date >= w.start) && date <= w.end;
}

// --- per-window stats ------------------------------------------------------

interface WindowStats {
  netPnl: number;
  wins: number;
  losses: number;
  breakeven: number;
  closedCount: number;
  winRate: number | null;
  avgRR: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  profitFactor: number | null;
}

function statsFor(closed: TradeWithTags[], w: Window): WindowStats {
  const inRange = closed.filter((t) => t.closedAt && inWindow(t.closedAt, w));
  let netPnl = 0;
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let rSum = 0;
  let rCount = 0;
  let winSum = 0;
  let lossSum = 0;
  for (const t of inRange) {
    const pnl = num(t.pnl) ?? 0;
    netPnl += pnl;
    if (pnl > 0) {
      wins++;
      winSum += pnl;
    } else if (pnl < 0) {
      losses++;
      lossSum += pnl;
    } else breakeven++;
    const r = num(t.rMultiple);
    if (r != null) {
      rSum += r;
      rCount++;
    }
  }
  const closedCount = inRange.length;
  const grossLoss = Math.abs(lossSum);
  return {
    netPnl,
    wins,
    losses,
    breakeven,
    closedCount,
    winRate: closedCount ? (wins / closedCount) * 100 : null,
    avgRR: rCount ? rSum / rCount : null,
    avgWin: wins ? winSum / wins : null,
    avgLoss: losses ? lossSum / losses : null,
    profitFactor: grossLoss > 0 ? winSum / grossLoss : winSum > 0 ? Infinity : null,
  };
}

/** Whole analytics payload for an account + range, derived from the journal. */
export async function getAnalytics(
  account: AccountScope,
  range: Range,
  custom?: CustomRange,
): Promise<AnalyticsData> {
  const accounts = await prisma.account.findMany({
    where: { id: accountWhere(account) },
    select: { balance: true, currency: true },
  });
  // Combined view: balance is the sum across the selected accounts.
  const balance = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const currency = accounts[0]?.currency ?? "USD";

  const trades = await prisma.trade.findMany({
    where: { accountId: accountWhere(account), isBacktest: false },
    include: { tags: { include: { tag: true } } },
  });
  const closed = trades.filter((t) => t.status === "CLOSED");
  const open = trades.filter((t) => t.status === "OPEN");

  const now = new Date();
  const { current, previous, label } = resolveWindows(range, now, custom);

  const cur = statsFor(closed, current);
  const prev = previous ? statsFor(closed, previous) : null;

  // Net P&L change vs previous period.
  let netPnlDeltaPct: number | null = null;
  if (prev && prev.netPnl !== 0) {
    netPnlDeltaPct = ((cur.netPnl - prev.netPnl) / Math.abs(prev.netPnl)) * 100;
  }

  // Open positions counted within the window (by entry date).
  const openInRange = open.filter((t) => inWindow(t.openedAt, current)).length;

  // --- equity curve: anchor the end at current balance, walk backwards. ---
  const windowClosed = closed
    .filter((t) => t.closedAt && inWindow(t.closedAt, current))
    .sort((a, b) => a.closedAt!.getTime() - b.closedAt!.getTime());
  const baseline = balance - cur.netPnl;
  const equityCurve: { t: string; equity: number }[] = [];
  const startStamp = current.start ?? windowClosed[0]?.closedAt ?? now;
  equityCurve.push({ t: startStamp.toISOString(), equity: baseline });
  let running = baseline;
  for (const t of windowClosed) {
    running += num(t.pnl) ?? 0;
    equityCurve.push({ t: t.closedAt!.toISOString(), equity: running });
  }

  // --- best & worst setups: group closed-in-range trades by tag, then
  //     compute each tag's win rate (wins / count) and net P&L. -------------
  interface Group {
    pnl: number;
    wins: number;
    losses: number;
    count: number;
    symbols: Map<string, number>;
  }
  const groups = new Map<string, Group>();
  for (const t of windowClosed) {
    const pnl = num(t.pnl) ?? 0;
    for (const { tag } of t.tags) {
      const g: Group =
        groups.get(tag.name) ??
        { pnl: 0, wins: 0, losses: 0, count: 0, symbols: new Map() };
      g.pnl += pnl;
      g.count++;
      if (pnl > 0) g.wins++;
      else if (pnl < 0) g.losses++;
      g.symbols.set(t.symbol, (g.symbols.get(t.symbol) ?? 0) + 1);
      groups.set(tag.name, g);
    }
  }
  const setups: SetupStat[] = [...groups.entries()]
    .map(([name, g]) => {
      const symbol =
        [...g.symbols.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return {
        name,
        symbol,
        winRate: g.count ? (g.wins / g.count) * 100 : 0,
        wins: g.wins,
        losses: g.losses,
        count: g.count,
        pnl: g.pnl,
      };
    })
    .sort((a, b) => b.pnl - a.pnl);

  return {
    range,
    periodLabel: label,
    currency,
    netPnl: cur.netPnl,
    netPnlDeltaPct,
    winRate: cur.winRate,
    winRatePrev: prev?.winRate ?? null,
    wins: cur.wins,
    closedCount: cur.closedCount,
    avgRR: cur.avgRR,
    avgRRPrev: prev?.avgRR ?? null,
    avgWin: cur.avgWin,
    avgLoss: cur.avgLoss,
    profitFactor: cur.profitFactor,
    equityCurve,
    distribution: {
      wins: cur.wins,
      losses: cur.losses,
      breakeven: cur.breakeven,
      open: openInRange,
    },
    setups,
  };
}

// --- performance calendar --------------------------------------------------

export interface CalendarDay {
  date: string; // ISO date (yyyy-mm-dd)
  day: number;
  inMonth: boolean;
  pnl: number;
  trades: number;
  isToday: boolean;
}

export interface CalendarData {
  year: number;
  month: number; // 0–11
  label: string; // "MAY 2026"
  weeks: CalendarDay[][];
}

// --- trades for a single calendar day (with journal inputs) ---------------

export interface DayTrade {
  id: string;
  symbol: string;
  direction: TradeDirection;
  grade: TradeGrade | null;
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  pnl: number | null;
  rMultiple: number | null;
  volume: number | null;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
  marketDirection: string | null;
  phaseOfMarket: string | null;
  stopLossNote: string | null;
  tags: string[];
  screenshots: { before: string | null; after: string | null };
}

type DayTradeRow = Prisma.TradeGetPayload<{
  include: { tags: { include: { tag: true } }; screenshots: true };
}>;

function mapDayTrade(t: DayTradeRow): DayTrade {
  const shot = (kind: ScreenshotKind) =>
    t.screenshots.find((s) => s.kind === kind)?.dataUrl ?? null;
  return {
    id: t.id,
    symbol: t.symbol,
    direction: t.direction,
    grade: t.grade,
    entry: Number(t.entry),
    stopLoss: num(t.stopLoss),
    takeProfit: num(t.takeProfit),
    pnl: num(t.pnl),
    rMultiple: num(t.rMultiple),
    volume: num(t.volume),
    openedAt: t.openedAt.toISOString(),
    closedAt: t.closedAt ? t.closedAt.toISOString() : null,
    notes: t.notes,
    marketDirection: t.marketDirection,
    phaseOfMarket: t.phaseOfMarket,
    stopLossNote: t.stopLossNote,
    tags: t.tags.map((x) => x.tag.name),
    screenshots: { before: shot("BEFORE"), after: shot("AFTER") },
  };
}

/** Closed trades whose exit falls on the given UTC day (yyyy-mm-dd). */
export async function getDayTrades(
  account: AccountScope,
  dateStr: string,
): Promise<{ date: string; totalPnl: number; trades: DayTrade[] }> {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  const end = new Date(start.getTime() + 864e5);

  const rows = await prisma.trade.findMany({
    where: {
      accountId: accountWhere(account),
      isBacktest: false,
      status: "CLOSED",
      closedAt: { gte: start, lt: end },
    },
    include: { tags: { include: { tag: true } }, screenshots: true },
    orderBy: { closedAt: "asc" },
  });

  const trades = rows.map(mapDayTrade);
  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  return { date: dateStr, totalPnl, trades };
}

/** Closed trades carrying a given tag ("setup"), within the selected range. */
export async function getSetupTrades(
  account: AccountScope,
  tag: string,
  range: Range,
): Promise<{ tag: string; totalPnl: number; trades: DayTrade[] }> {
  const { current } = resolveWindows(range, new Date());
  const closedAt = current.start
    ? { gte: current.start, lte: current.end }
    : { lte: current.end };

  const rows = await prisma.trade.findMany({
    where: {
      accountId: accountWhere(account),
      isBacktest: false,
      status: "CLOSED",
      closedAt,
      tags: { some: { tag: { name: tag } } },
    },
    include: { tags: { include: { tag: true } }, screenshots: true },
    orderBy: { closedAt: "desc" },
  });

  const trades = rows.map(mapDayTrade);
  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  return { tag, totalPnl, trades };
}

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** Monthly grid (Mon–Sun) of daily P&L from closed trades. */
export async function getCalendar(
  account: AccountScope,
  year: number,
  month: number,
): Promise<CalendarData> {
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 1));

  const trades = await prisma.trade.findMany({
    where: {
      accountId: accountWhere(account),
      isBacktest: false,
      status: "CLOSED",
      closedAt: { gte: monthStart, lt: monthEnd },
    },
    select: { pnl: true, closedAt: true },
  });

  const byDay = new Map<string, { pnl: number; trades: number }>();
  for (const t of trades) {
    if (!t.closedAt) continue;
    const key = ymd(t.closedAt);
    const d = byDay.get(key) ?? { pnl: 0, trades: 0 };
    d.pnl += Number(t.pnl) ?? 0;
    d.trades++;
    byDay.set(key, d);
  }

  // Grid starts on the Monday on/before the 1st.
  const firstDow = (monthStart.getUTCDay() + 6) % 7; // 0 = Monday
  const gridStart = new Date(monthStart.getTime() - firstDow * 864e5);
  const todayKey = ymd(new Date());

  const weeks: CalendarDay[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const key = ymd(cursor);
      const cell = byDay.get(key);
      week.push({
        date: key,
        day: cursor.getUTCDate(),
        inMonth: cursor.getUTCMonth() === month,
        pnl: cell?.pnl ?? 0,
        trades: cell?.trades ?? 0,
        isToday: key === todayKey,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
    // Stop after we've covered the month (avoid a trailing empty week).
    if (cursor >= monthEnd && cursor.getUTCDay() === 1) break;
  }

  return {
    year,
    month,
    label: monthStart
      .toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
      .toUpperCase(),
    weeks,
  };
}
