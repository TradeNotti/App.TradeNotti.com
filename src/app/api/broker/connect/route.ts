import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/account";
import { connectAccountBroker } from "@/lib/broker-connect";
import { MetaApiValidationError } from "@/lib/broker/metaapi-provider";

export const dynamic = "force-dynamic";

// POST /api/broker/connect { accountId, login, password, server, platform? }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    accountId?: string;
    login?: string;
    password?: string;
    server?: string;
    platform?: "mt4" | "mt5";
  };

  if (!body.accountId || !body.login?.trim() || !body.server?.trim() || !body.password) {
    return NextResponse.json(
      { error: "Login, server and investor password are required." },
      { status: 400 },
    );
  }

  const account = await prisma.account.findFirst({
    where: { id: body.accountId, userId: user.id },
    select: { id: true },
  });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  try {
    await connectAccountBroker(account.id, user.id, {
      login: body.login.trim(),
      password: body.password,
      server: body.server.trim(),
      platform: body.platform,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Log the real (technical) error server-side; never leak it to the user.
    console.error("[broker/connect] failed:", e);
    return NextResponse.json({ error: friendlyConnectError(e) }, { status: 502 });
  }
}

// Map a technical broker/DB error to one short, actionable sentence.
function friendlyConnectError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/METAAPI_TOKEN|not configured/i.test(msg)) {
    return "Broker import isn't set up on the server yet. Please contact support.";
  }

  // MetaApi's own validation error carries a code, and for an unrecognized
  // server it even suggests real ones — a much more specific answer than
  // guessing "check your password" for what's actually a server-name typo
  // or an account that's been moved to a different numbered server.
  if (e instanceof MetaApiValidationError) {
    if (e.code === "E_SRV_NOT_FOUND") {
      const hint = e.suggestedServers?.length
        ? ` Closest matches for your broker: ${e.suggestedServers.slice(0, 4).join(", ")}.`
        : "";
      return `That server name wasn't recognized.${hint} Copy it exactly from your MT4/5 terminal (Help → About, or your broker's account email) — numbered servers (e.g. "Live03") are easy to mistype or confuse with a similar one.`;
    }
    if (e.code === "E_AUTH") {
      return "Your broker rejected the login, password, or server combination together — it can't tell us which one is wrong. If this account was opened a while ago, double-check the server is still current: brokers sometimes move accounts to a different numbered server (e.g. \"Live03\" → \"Live07\") without changing the login or password.";
    }
    if (e.code === "E_SERVER_TIMEZONE") {
      return "Couldn't detect your broker's server settings right now. Please try again in a minute.";
    }
  }

  if (/auth|password|invalid.*credential|login/i.test(msg)) {
    return "Those login details were rejected. Check your account login, server and investor (read-only) password, then try again.";
  }
  // Provisioning / validation / anything else: keep it simple and actionable.
  return "Couldn't connect to your broker. Double-check the login, server name and investor (read-only) password and try again.";
}
