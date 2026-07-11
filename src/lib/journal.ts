import { prisma, accountWhere, type AccountScope } from "./db";
import type {
  TradeDirection,
  TradeGrade,
  TradeStatus,
  ScreenshotKind,
} from "@prisma/client";

// Row shown in the Journal list table.
export interface JournalRow {
  id: string;
  symbol: string;
  direction: TradeDirection;
  status: TradeStatus;
  grade: TradeGrade | null;
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  pnl: number | null;
  rMultiple: number | null;
  tags: string[];
  openedAt: string; // ISO
}

// Full detail for a single trade's journal page.
export interface CustomProp {
  id: string;
  name: string;
  value: string;
}

export interface JournalDetail extends JournalRow {
  closedAt: string | null;
  exitPrice: number | null;
  isBacktest: boolean;
  customProps: CustomProp[];
  volume: number | null;
  notes: string | null;
  marketDirection: string | null;
  phaseOfMarket: string | null;
  stopLossNote: string | null;
  roi: number | null; // percent of account balance
  currency: string;
  screenshots: { before: string | null; after: string | null };
}

const num = (v: unknown) => (v == null ? null : Number(v));

/** All trades for an account (open + closed), newest first — the Journal list. */
export async function getJournalTrades(
  account: AccountScope,
  backtest = false,
): Promise<JournalRow[]> {
  const trades = await prisma.trade.findMany({
    where: { accountId: accountWhere(account), isBacktest: backtest },
    include: { tags: { include: { tag: true } } },
    orderBy: { openedAt: "desc" },
  });
  return trades.map((t) => ({
    id: t.id,
    symbol: t.symbol,
    direction: t.direction,
    status: t.status,
    grade: t.grade,
    entry: Number(t.entry),
    stopLoss: num(t.stopLoss),
    takeProfit: num(t.takeProfit),
    pnl: num(t.pnl),
    rMultiple: num(t.rMultiple),
    tags: t.tags.map((x) => x.tag.name),
    openedAt: t.openedAt.toISOString(),
  }));
}

/** Single trade with everything the detail page needs. */
export async function getTradeDetail(
  accountId: string,
  tradeId: string,
): Promise<JournalDetail | null> {
  const t = await prisma.trade.findFirst({
    where: { id: tradeId, accountId },
    include: {
      tags: { include: { tag: true } },
      screenshots: true,
      account: { select: { balance: true, currency: true } },
    },
  });
  if (!t) return null;

  const pnl = num(t.pnl);
  const balance = Number(t.account.balance);
  // A manually-entered ROI (backtests) wins; otherwise derive from P&L.
  const roi =
    t.roiManual != null
      ? Number(t.roiManual)
      : pnl != null && balance > 0
        ? (pnl / balance) * 100
        : null;

  const shot = (kind: ScreenshotKind) =>
    t.screenshots.find((s) => s.kind === kind)?.dataUrl ?? null;

  return {
    id: t.id,
    symbol: t.symbol,
    direction: t.direction,
    status: t.status,
    grade: t.grade,
    entry: Number(t.entry),
    stopLoss: num(t.stopLoss),
    takeProfit: num(t.takeProfit),
    pnl,
    rMultiple: num(t.rMultiple),
    tags: t.tags.map((x) => x.tag.name),
    openedAt: t.openedAt.toISOString(),
    closedAt: t.closedAt ? t.closedAt.toISOString() : null,
    exitPrice: num(t.exitPrice),
    isBacktest: t.isBacktest,
    customProps: Array.isArray(t.customProps)
      ? (t.customProps as unknown as CustomProp[])
      : [],
    volume: num(t.volume),
    notes: t.notes,
    marketDirection: t.marketDirection,
    phaseOfMarket: t.phaseOfMarket,
    stopLossNote: t.stopLossNote,
    roi,
    currency: t.account.currency,
    screenshots: { before: shot("BEFORE"), after: shot("AFTER") },
  };
}

/** Distinct symbols and tags for the filter menu options. */
export async function getJournalFilterOptions(
  account: AccountScope,
  backtest = false,
): Promise<{
  symbols: string[];
  tags: string[];
}> {
  const trades = await prisma.trade.findMany({
    where: { accountId: accountWhere(account), isBacktest: backtest },
    select: { symbol: true, tags: { include: { tag: true } } },
  });
  const symbols = [...new Set(trades.map((t) => t.symbol))].sort();
  const tags = [
    ...new Set(trades.flatMap((t) => t.tags.map((x) => x.tag.name))),
  ].sort();
  return { symbols, tags };
}
