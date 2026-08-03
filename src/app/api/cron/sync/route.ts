import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncAccountTrades } from "@/lib/broker-sync";

export const dynamic = "force-dynamic";

// Scheduled broker reconciliation (Vercel Cron hits this with GET).
// Requires a matching Bearer token (Vercel sends it) — fails closed if
// CRON_SECRET isn't configured, rather than leaving the endpoint open.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.account.findMany({ select: { id: true, label: true } });
  const results: { account: string; open: number; closed: number; error?: string }[] = [];

  for (const account of accounts) {
    try {
      const r = await syncAccountTrades(account.id);
      results.push({ account: account.label, ...r });
    } catch (err) {
      results.push({
        account: account.label,
        open: 0,
        closed: 0,
        error: err instanceof Error ? err.message : "sync failed",
      });
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
