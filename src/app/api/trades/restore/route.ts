import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAccountsForCurrentUser } from "@/lib/account";
import type { TradeDirection, TradeStatus, TradeGrade, ScreenshotKind } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/trades/restore — re-create a trade deleted moments ago (the "Undo"
// action on the delete toast). Body is the snapshot returned by DELETE.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : null;
  const accountId = typeof body.accountId === "string" ? body.accountId : null;
  if (!id || !accountId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const accounts = await getAccountsForCurrentUser();
  if (!accounts.some((a) => a.id === accountId)) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Already restored (double-click) — no-op.
  const exists = await prisma.trade.findUnique({ where: { id }, select: { id: true } });
  if (exists) return NextResponse.json({ id });

  const num = (v: unknown) => (v == null ? null : Number(v));

  await prisma.trade.create({
    data: {
      id,
      accountId,
      externalId: (body.externalId as string) ?? null,
      symbol: String(body.symbol ?? "Untitled trade"),
      direction: (body.direction as TradeDirection) ?? "LONG",
      status: (body.status as TradeStatus) ?? "CLOSED",
      grade: (body.grade as TradeGrade) ?? null,
      isBacktest: Boolean(body.isBacktest),
      entry: num(body.entry) ?? 0,
      stopLoss: num(body.stopLoss),
      takeProfit: num(body.takeProfit),
      exitPrice: num(body.exitPrice),
      volume: num(body.volume),
      pnl: num(body.pnl),
      rMultiple: num(body.rMultiple),
      roiManual: num(body.roiManual),
      openedAt: body.openedAt ? new Date(body.openedAt as string) : new Date(),
      closedAt: body.closedAt ? new Date(body.closedAt as string) : null,
      notes: (body.notes as string) ?? null,
      marketDirection: (body.marketDirection as string) ?? null,
      phaseOfMarket: (body.phaseOfMarket as string) ?? null,
      stopLossNote: (body.stopLossNote as string) ?? null,
      customProps: (body.customProps as object) ?? undefined,
    },
  });

  // Tags
  if (Array.isArray(body.tags)) {
    for (const name of body.tags as string[]) {
      const tag = await prisma.tag.upsert({
        where: { name },
        create: { name },
        update: {},
      });
      await prisma.tagsOnTrades
        .create({ data: { tradeId: id, tagId: tag.id } })
        .catch(() => {});
    }
  }

  // Screenshots
  if (Array.isArray(body.screenshots)) {
    for (const s of body.screenshots as { kind: ScreenshotKind; dataUrl: string }[]) {
      await prisma.screenshot
        .create({ data: { tradeId: id, kind: s.kind, dataUrl: s.dataUrl } })
        .catch(() => {});
    }
  }

  return NextResponse.json({ id });
}
