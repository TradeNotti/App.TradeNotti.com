import { prisma } from "./db";
import { brokerMode, provisionMetaApiAccount } from "./broker";

export interface BrokerCreds {
  login: string;
  password: string; // investor (read-only) password — sent to MetaApi, never stored
  server: string;
  platform?: "mt4" | "mt5";
}

/**
 * Links an MT account to a TradeNotti account. In live mode we provision a
 * MetaApi account (credentials go to MetaApi, not our DB). In mock mode we just
 * mark it connected so the flow is testable without keys.
 */
export async function connectAccountBroker(
  accountId: string,
  creds: BrokerCreds,
): Promise<void> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw new Error("Account not found");

  let metaApiAccountId: string;
  if (brokerMode() === "metaapi") {
    metaApiAccountId = await provisionMetaApiAccount({
      name: account.label,
      login: creds.login,
      password: creds.password,
      server: creds.server,
      platform: creds.platform,
    });
  } else {
    metaApiAccountId = `mock-${accountId}`;
  }

  await prisma.account.update({
    where: { id: accountId },
    data: {
      metaApiAccountId: String(metaApiAccountId),
      brokerLogin: creds.login,
      brokerServer: creds.server,
      syncStatus: "idle",
    },
  });
}

export async function disconnectAccountBroker(accountId: string): Promise<void> {
  await prisma.account.update({
    where: { id: accountId },
    data: {
      metaApiAccountId: null,
      brokerLogin: null,
      brokerServer: null,
      lastSyncedAt: null,
      syncStatus: "idle",
    },
  });
}
