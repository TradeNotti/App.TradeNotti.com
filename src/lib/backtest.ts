import { prisma } from "./db";
import type { TradeDirection } from "@prisma/client";

export interface BacktestInput {
  symbol: string;
  direction: TradeDirection; // "LONG" | "SHORT"
  entry: number;
  exitPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  volume?: number | null;
  pnl?: number | null;
  date: string; // ISO or yyyy-mm-dd
}

// Reward-to-risk from prices, signed in the trade's favor.
function computeR(
  direction: TradeDirection,
  entry: number,
  exit: number | null,
  sl: number | null,
): number | null {
  if (exit == null || sl == null) return null;
  const risk = Math.abs(entry - sl);
  if (risk === 0) return null;
  const reward = direction === "LONG" ? exit - entry : entry - exit;
  return Math.round((reward / risk) * 100) / 100;
}

/**
 * Create a manually-logged trade (always CLOSED). Used for both the journal
 * (isBacktest = false) and the backtesting tab (isBacktest = true).
 */
export async function createManualTrade(
  accountId: string,
  data: BacktestInput,
  isBacktest: boolean,
) {
  const openedAt = new Date(data.date);
  const when = isNaN(openedAt.getTime()) ? new Date() : openedAt;
  const rMultiple = computeR(
    data.direction,
    data.entry,
    data.exitPrice ?? null,
    data.stopLoss ?? null,
  );

  return prisma.trade.create({
    data: {
      accountId,
      isBacktest,
      symbol: data.symbol.trim(),
      direction: data.direction,
      status: "CLOSED",
      entry: data.entry,
      exitPrice: data.exitPrice ?? null,
      stopLoss: data.stopLoss ?? null,
      takeProfit: data.takeProfit ?? null,
      volume: data.volume ?? null,
      pnl: data.pnl ?? null,
      rMultiple,
      openedAt: when,
      closedAt: when,
    },
    select: { id: true },
  });
}
