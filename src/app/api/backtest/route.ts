import { NextRequest, NextResponse } from "next/server";
import { getActiveAccount } from "@/lib/account";
import { createBacktestTrade } from "@/lib/backtest";
import type { TradeDirection } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/backtest — log a backtest trade.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    accountId?: string;
    symbol?: string;
    direction?: string;
    entry?: number;
    exitPrice?: number | null;
    stopLoss?: number | null;
    takeProfit?: number | null;
    volume?: number | null;
    pnl?: number | null;
    date?: string;
  };

  if (!body.symbol?.trim() || body.entry == null || Number.isNaN(Number(body.entry))) {
    return NextResponse.json(
      { error: "Symbol and entry price are required." },
      { status: 400 },
    );
  }
  const direction: TradeDirection = body.direction === "SHORT" ? "SHORT" : "LONG";

  // Log against the currently active account (must belong to the user).
  const account = await getActiveAccount(body.accountId);
  if (!account) {
    return NextResponse.json({ error: "No account found" }, { status: 404 });
  }

  const num = (v: number | null | undefined) =>
    v == null || Number.isNaN(Number(v)) ? null : Number(v);

  const trade = await createBacktestTrade(account.id, {
    symbol: body.symbol,
    direction,
    entry: Number(body.entry),
    exitPrice: num(body.exitPrice),
    stopLoss: num(body.stopLoss),
    takeProfit: num(body.takeProfit),
    volume: num(body.volume),
    pnl: num(body.pnl),
    date: body.date || new Date().toISOString(),
  });

  return NextResponse.json({ id: trade.id });
}
