import { prisma, accountWhere, type AccountScope } from "./db";
import type { TradeDirection, TradeGrade, TradeStatus } from "@prisma/client";

export interface TradeView {
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

function toView(t: {
  id: string;
  symbol: string;
  direction: TradeDirection;
  status: TradeStatus;
  grade: TradeGrade | null;
  entry: unknown;
  stopLoss: unknown;
  takeProfit: unknown;
  pnl: unknown;
  rMultiple: unknown;
  openedAt: Date;
  tags: { tag: { name: string } }[];
}): TradeView {
  const num = (v: unknown) => (v == null ? null : Number(v));
  return {
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
  };
}

/** Currently running (OPEN) trades for an account, newest first. */
export async function getOpenTrades(
  account: AccountScope,
): Promise<TradeView[]> {
  const trades = await prisma.trade.findMany({
    where: { accountId: accountWhere(account), status: "OPEN", isBacktest: false },
    include: { tags: { include: { tag: true } } },
    orderBy: { openedAt: "desc" },
  });
  return trades.map(toView);
}
