import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveAccount, getAccountsForCurrentUser } from "@/lib/account";
import { getTradeDetail } from "@/lib/journal";
import { computeR } from "@/lib/backtest";
import type { TradeGrade, TradeDirection } from "@prisma/client";

export const dynamic = "force-dynamic";

async function resolveTrade(id: string, accountIdParam?: string) {
  const account = await getActiveAccount(accountIdParam);
  if (!account) return null;
  const trade = await prisma.trade.findFirst({
    where: { id, accountId: account.id },
    select: { id: true, accountId: true },
  });
  return trade ? { account, trade } : null;
}

// GET /api/trades/:id — full journal detail for one trade.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const account = await getActiveAccount(
    req.nextUrl.searchParams.get("accountId") ?? undefined,
  );
  if (!account) {
    return NextResponse.json({ error: "No account found" }, { status: 404 });
  }
  const detail = await getTradeDetail(account.id, id);
  if (!detail) {
    return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  }
  return NextResponse.json({ trade: detail });
}

// PATCH /api/trades/:id — update manually-journaled fields.
// Body: { notes?, marketDirection?, phaseOfMarket?, grade?, tags?: string[] }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    // Journaling fields
    notes?: string | null;
    marketDirection?: string | null;
    phaseOfMarket?: string | null;
    stopLossNote?: string | null;
    grade?: TradeGrade | null;
    tags?: string[];
    // Core trade fields (manually editable on the detail page)
    symbol?: string;
    direction?: string;
    entry?: number | null;
    exitPrice?: number | null;
    stopLoss?: number | null;
    takeProfit?: number | null;
    volume?: number | null;
    pnl?: number | null;
    roi?: number | null;
    openedAt?: string | null;
    closedAt?: string | null;
    customProps?: { id: string; name: string; value: string }[];
  };

  const resolved = await resolveTrade(id);
  if (!resolved) {
    return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  }

  const current = await prisma.trade.findUnique({
    where: { id },
    select: {
      direction: true,
      entry: true,
      exitPrice: true,
      stopLoss: true,
    },
  });

  const data: Record<string, unknown> = {};
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.marketDirection !== undefined)
    data.marketDirection = body.marketDirection;
  if (body.phaseOfMarket !== undefined) data.phaseOfMarket = body.phaseOfMarket;
  if (body.stopLossNote !== undefined) data.stopLossNote = body.stopLossNote;
  if (body.grade !== undefined) data.grade = body.grade;

  // Core fields.
  const num = (v: number | null | undefined) =>
    v == null || Number.isNaN(Number(v)) ? null : Number(v);
  if (body.symbol !== undefined) data.symbol = body.symbol.trim();
  if (body.direction === "LONG" || body.direction === "SHORT")
    data.direction = body.direction as TradeDirection;
  if (body.entry !== undefined) data.entry = num(body.entry) ?? 0;
  if (body.exitPrice !== undefined) data.exitPrice = num(body.exitPrice);
  if (body.stopLoss !== undefined) data.stopLoss = num(body.stopLoss);
  if (body.takeProfit !== undefined) data.takeProfit = num(body.takeProfit);
  if (body.volume !== undefined) data.volume = num(body.volume);
  if (body.pnl !== undefined) data.pnl = num(body.pnl);
  if (body.roi !== undefined) data.roiManual = num(body.roi);
  // Manually-set entry / exit dates (mainly for backtests). Invalid dates are
  // ignored; a null exit clears it.
  if (body.openedAt !== undefined && body.openedAt) {
    const d = new Date(body.openedAt);
    if (!Number.isNaN(d.getTime())) data.openedAt = d;
  }
  if (body.closedAt !== undefined) {
    if (body.closedAt === null) {
      data.closedAt = null;
    } else {
      const d = new Date(body.closedAt);
      if (!Number.isNaN(d.getTime())) data.closedAt = d;
    }
  }
  if (Array.isArray(body.customProps)) {
    data.customProps = body.customProps
      .map((p) => ({
        id: String(p.id ?? ""),
        name: String(p.name ?? ""),
        value: String(p.value ?? ""),
      }))
      .filter((p) => p.id);
  }

  // Recompute R whenever a price/direction that feeds it may have changed.
  const touchesR =
    body.direction !== undefined ||
    body.entry !== undefined ||
    body.exitPrice !== undefined ||
    body.stopLoss !== undefined;
  if (touchesR && current) {
    const direction = (data.direction ?? current.direction) as TradeDirection;
    const entry =
      data.entry !== undefined ? (data.entry as number) : Number(current.entry);
    const exit =
      data.exitPrice !== undefined
        ? (data.exitPrice as number | null)
        : current.exitPrice != null
          ? Number(current.exitPrice)
          : null;
    const sl =
      data.stopLoss !== undefined
        ? (data.stopLoss as number | null)
        : current.stopLoss != null
          ? Number(current.stopLoss)
          : null;
    data.rMultiple = computeR(direction, entry, exit, sl);
  }

  if (Object.keys(data).length > 0) {
    await prisma.trade.update({ where: { id }, data });
  }

  // Replace the tag set when provided.
  if (Array.isArray(body.tags)) {
    const names = [...new Set(body.tags.map((t) => t.trim()).filter(Boolean))];
    const tagIds: string[] = [];
    for (const name of names) {
      const tag = await prisma.tag.upsert({
        where: { name },
        create: { name },
        update: {},
      });
      tagIds.push(tag.id);
    }
    await prisma.tagsOnTrades.deleteMany({ where: { tradeId: id } });
    if (tagIds.length > 0) {
      await prisma.tagsOnTrades.createMany({
        data: tagIds.map((tagId) => ({ tradeId: id, tagId })),
        skipDuplicates: true,
      });
    }
  }

  const detail = await getTradeDetail(resolved.account.id, id);
  return NextResponse.json({ trade: detail });
}

// DELETE /api/trades/:id — remove a trade. Returns a snapshot of the trade so
// the client can offer an "Undo" (restore) via /api/trades/restore.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const accounts = await getAccountsForCurrentUser();
  const owned = new Set(accounts.map((a) => a.id));

  const t = await prisma.trade.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } }, screenshots: true },
  });
  if (!t || !owned.has(t.accountId)) {
    return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  }

  const n = (v: unknown) => (v == null ? null : Number(v));
  const captured = {
    id: t.id,
    accountId: t.accountId,
    externalId: t.externalId,
    symbol: t.symbol,
    direction: t.direction,
    status: t.status,
    grade: t.grade,
    isBacktest: t.isBacktest,
    entry: Number(t.entry),
    stopLoss: n(t.stopLoss),
    takeProfit: n(t.takeProfit),
    exitPrice: n(t.exitPrice),
    volume: n(t.volume),
    pnl: n(t.pnl),
    rMultiple: n(t.rMultiple),
    roiManual: n(t.roiManual),
    openedAt: t.openedAt.toISOString(),
    closedAt: t.closedAt ? t.closedAt.toISOString() : null,
    notes: t.notes,
    marketDirection: t.marketDirection,
    phaseOfMarket: t.phaseOfMarket,
    stopLossNote: t.stopLossNote,
    customProps: t.customProps,
    tags: t.tags.map((x) => x.tag.name),
    screenshots: t.screenshots.map((s) => ({ kind: s.kind, dataUrl: s.dataUrl })),
  };

  await prisma.trade.delete({ where: { id } });
  return NextResponse.json({ trade: captured });
}
