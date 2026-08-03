import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/account";
import { disconnectAccountBroker } from "@/lib/broker-connect";

export const dynamic = "force-dynamic";

// POST /api/broker/disconnect { accountId }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { accountId?: string };
  const account = body.accountId
    ? await prisma.account.findFirst({
        where: { id: body.accountId, userId: user.id },
        select: { id: true },
      })
    : null;
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  await disconnectAccountBroker(account.id, user.id);
  return NextResponse.json({ ok: true });
}
