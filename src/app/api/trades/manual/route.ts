import { NextRequest, NextResponse } from "next/server";
import { getActiveAccount } from "@/lib/account";
import { createManualTrade } from "@/lib/backtest";
import type { TradeDirection } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/trades/manual — manually log a trade (journal or backtest).
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    accountId?: string;
    isBacktest?: boolean;
    blank?: boolean;
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

  // A "blank" trade is created empty and filled in on the full detail page
  // (the journaling layout) — no upfront form. Otherwise symbol + entry are
  // required.
  if (!body.blank) {
    if (!body.symbol?.trim() || body.entry == null || Number.isNaN(Number(body.entry))) {
      return NextResponse.json(
        { error: "Symbol and entry price are required." },
        { status: 400 },
      );
    }
  }
  const direction: TradeDirection = body.direction === "SHORT" ? "SHORT" : "LONG";

  const account = await getActiveAccount(body.accountId);
  if (!account) {
    return NextResponse.json({ error: "No account found" }, { status: 404 });
  }

  const num = (v: number | null | undefined) =>
    v == null || Number.isNaN(Number(v)) ? null : Number(v);

  const trade = await createManualTrade(
    account.id,
    {
      symbol: body.symbol?.trim() || "Untitled trade",
      direction,
      entry: body.entry == null ? 0 : Number(body.entry),
      exitPrice: num(body.exitPrice),
      stopLoss: num(body.stopLoss),
      takeProfit: num(body.takeProfit),
      volume: num(body.volume),
      pnl: num(body.pnl),
      date: body.date || new Date().toISOString(),
    },
    Boolean(body.isBacktest),
  );

  return NextResponse.json({ id: trade.id });
}
