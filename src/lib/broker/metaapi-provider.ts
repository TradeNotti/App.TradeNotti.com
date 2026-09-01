import type {
  BrokerAccountInfo,
  BrokerConnection,
  BrokerDeal,
  BrokerPosition,
  BrokerProvider,
} from "./types";

// MetaTrader 4/5 live data via MetaApi.cloud (cloud-g2). MT itself has no public
// REST API, so MetaApi runs a cloud terminal we deploy on-demand, read, then
// undeploy (so we're only billed for the short sync window).
//
// Hosts:
//   provisioning API — deploy/undeploy/state/provisioning (region-agnostic)
//   client API       — positions/history (region-scoped)
// Docs: https://metaapi.cloud/docs/

const PROVISIONING_BASE =
  "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";

interface MetaApiRawPosition {
  id: string | number;
  symbol: string;
  type: string; // POSITION_TYPE_BUY | POSITION_TYPE_SELL
  openPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  volume?: number;
  profit?: number;
  time: string;
}

interface MetaApiRawDeal {
  id: string | number;
  positionId?: string | number;
  symbol?: string;
  type?: string; // DEAL_TYPE_BUY | DEAL_TYPE_SELL
  entryType?: string; // DEAL_ENTRY_IN | DEAL_ENTRY_OUT | DEAL_ENTRY_INOUT
  price?: number;
  volume?: number;
  profit?: number;
  commission?: number;
  swap?: number;
  time: string;
}

export class MetaApiProvider implements BrokerProvider {
  readonly name = "metaapi";

  // The region the account is ACTUALLY provisioned in. MetaApi may place an
  // account in a different region than requested (its default is "vint-hill"),
  // and the client (data) API is region-scoped — hitting the wrong region 504s
  // with "request URL does not match the account region". We resolve the real
  // region from the account object and cache it.
  private resolvedRegion?: string;

  constructor(
    private readonly token: string,
    private readonly accountId: string,
    private readonly region: string = "new-york",
  ) {}

  private get clientBase(): string {
    const region = this.resolvedRegion ?? this.region;
    return `https://mt-client-api-v1.${region}.agiliumtrade.ai`;
  }

  // Read the account's real region once and cache it for client API calls.
  private async ensureRegion(): Promise<void> {
    if (this.resolvedRegion) return;
    try {
      const res = await fetch(
        `${PROVISIONING_BASE}/users/current/accounts/${this.accountId}`,
        { headers: this.headers(), cache: "no-store" },
      );
      if (res.ok) {
        const a = (await res.json()) as { region?: string };
        if (a.region) this.resolvedRegion = a.region;
      }
    } catch {
      /* fall back to the configured region */
    }
  }

  private headers() {
    return { "auth-token": this.token, Accept: "application/json" } as const;
  }

  // A just-deployed terminal is "connected" before it has finished synchronizing
  // its terminal state, so REST reads transiently 502/503/504 ("not connected to
  // broker yet"). Retry those with a short backoff until the data is ready.
  private async clientFetch(url: string, what: string): Promise<Response> {
    const maxAttempts = 6;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await fetch(url, { headers: this.headers(), cache: "no-store" });
      if (res.ok) return res;
      const transient = res.status === 502 || res.status === 503 || res.status === 504;
      if (transient && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }
      throw await apiError(res, what);
    }
    throw new Error(`MetaApi ${what} failed after ${maxAttempts} attempts.`);
  }

  async deploy(): Promise<void> {
    await fetch(
      `${PROVISIONING_BASE}/users/current/accounts/${this.accountId}/deploy`,
      { method: "POST", headers: this.headers(), cache: "no-store" },
    );
    await this.waitConnected();
  }

  async undeploy(): Promise<void> {
    // Best-effort: never let a teardown error mask the real result.
    try {
      await fetch(
        `${PROVISIONING_BASE}/users/current/accounts/${this.accountId}/undeploy`,
        { method: "POST", headers: this.headers(), cache: "no-store" },
      );
    } catch (e) {
      console.warn("[metaapi] undeploy failed:", e);
    }
  }

  // Poll until the terminal is deployed and connected to the broker (or timeout).
  private async waitConnected(timeoutMs = 90_000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(
          `${PROVISIONING_BASE}/users/current/accounts/${this.accountId}`,
          { headers: this.headers(), cache: "no-store" },
        );
        if (res.ok) {
          const a = (await res.json()) as {
            state?: string;
            connectionStatus?: string;
            region?: string;
          };
          if (a.region) this.resolvedRegion = a.region;
          if (a.state === "DEPLOYED" && a.connectionStatus === "CONNECTED") return;
        }
      } catch {
        /* keep polling */
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error("MetaApi terminal did not connect in time.");
  }

  async getOpenPositions(): Promise<BrokerPosition[]> {
    await this.ensureRegion();
    const res = await this.clientFetch(
      `${this.clientBase}/users/current/accounts/${this.accountId}/positions`,
      "positions",
    );
    const raw = (await res.json()) as MetaApiRawPosition[];
    return raw.map((p) => ({
      externalId: String(p.id),
      symbol: normalizeSymbol(p.symbol),
      direction: (p.type === "POSITION_TYPE_SELL" ? "SHORT" : "LONG") as
        | "LONG"
        | "SHORT",
      entry: p.openPrice,
      stopLoss: p.stopLoss ?? null,
      takeProfit: p.takeProfit ?? null,
      volume: p.volume ?? null,
      pnl: p.profit ?? null,
      openedAt: new Date(p.time),
    }));
  }

  async getAccountInformation(): Promise<BrokerAccountInfo | null> {
    await this.ensureRegion();
    const res = await this.clientFetch(
      `${this.clientBase}/users/current/accounts/${this.accountId}/account-information`,
      "account-information",
    );
    const a = (await res.json()) as {
      balance?: number;
      equity?: number;
      currency?: string;
    };
    return {
      balance: a.balance ?? 0,
      equity: a.equity ?? null,
      currency: a.currency ?? null,
    };
  }

  async getClosedDeals(since: Date | null): Promise<BrokerDeal[]> {
    await this.ensureRegion();
    const start = since ?? new Date(Date.now() - 365 * 864e5); // 1y backfill
    const end = new Date(Date.now() + 60_000);
    const res = await this.clientFetch(
      `${this.clientBase}/users/current/accounts/${this.accountId}/history-deals/time/${start.toISOString()}/${end.toISOString()}`,
      "history-deals",
    );
    const deals = (await res.json()) as MetaApiRawDeal[];
    return pairDeals(deals);
  }
}

// Group raw MT deals into closed round-trip trades, keyed by positionId.
function pairDeals(deals: MetaApiRawDeal[]): BrokerDeal[] {
  const byPos = new Map<string, MetaApiRawDeal[]>();
  for (const d of deals) {
    if (d.positionId == null) continue;
    const key = String(d.positionId);
    const arr = byPos.get(key) ?? [];
    arr.push(d);
    byPos.set(key, arr);
  }

  const out: BrokerDeal[] = [];
  for (const [positionId, group] of byPos) {
    group.sort((a, b) => +new Date(a.time) - +new Date(b.time));
    const entry = group.find((d) => d.entryType === "DEAL_ENTRY_IN") ?? group[0];
    const exits = group.filter((d) => d.entryType === "DEAL_ENTRY_OUT");
    if (exits.length === 0) continue; // still open — handled as a position

    const last = exits[exits.length - 1];
    const net = group.reduce(
      (s, d) => s + (d.profit ?? 0) + (d.commission ?? 0) + (d.swap ?? 0),
      0,
    );
    out.push({
      externalId: positionId,
      symbol: normalizeSymbol(entry.symbol ?? last.symbol ?? ""),
      direction: entry.type === "DEAL_TYPE_SELL" ? "SHORT" : "LONG",
      entry: entry.price ?? 0,
      exit: last.price ?? null,
      volume: entry.volume ?? null,
      pnl: Math.round(net * 100) / 100,
      openedAt: new Date(entry.time),
      closedAt: new Date(last.time),
    });
  }
  return out;
}

// "EURUSD" -> "EUR/USD" for common 6-char FX symbols; otherwise pass through.
function normalizeSymbol(symbol: string): string {
  const clean = symbol.toUpperCase().replace(/[^A-Z]/g, "");
  if (clean.length === 6) return `${clean.slice(0, 3)}/${clean.slice(3)}`;
  return symbol;
}

// A validation error from MetaApi's account-creation endpoint carries a
// structured `details` field, not just prose — e.g. E_SRV_NOT_FOUND comes
// with a list of similarly-named servers for the broker. Surfacing that
// (instead of just truncated raw response text) is what lets a caller give
// actually-specific guidance instead of a generic "check your credentials".
export class MetaApiValidationError extends Error {
  code?: string;
  suggestedServers?: string[];
  constructor(message: string, code?: string, suggestedServers?: string[]) {
    super(message);
    this.name = "MetaApiValidationError";
    this.code = code;
    this.suggestedServers = suggestedServers;
  }
}

interface MetaApiErrorBody {
  error?: string;
  message?: string;
  details?: string | { code?: string; serversByBrokers?: Record<string, string[]> };
}

async function apiError(res: Response, what: string): Promise<Error> {
  const body = await res.text().catch(() => "");
  let parsed: MetaApiErrorBody | null = null;
  try {
    parsed = JSON.parse(body) as MetaApiErrorBody;
  } catch {
    // Not JSON (e.g. an upstream 5xx HTML page) — fall through below.
  }
  if (parsed?.message) {
    const code = typeof parsed.details === "string" ? parsed.details : parsed.details?.code;
    const suggestedServers =
      typeof parsed.details === "object"
        ? Object.values(parsed.details.serversByBrokers ?? {}).flat()
        : undefined;
    return new MetaApiValidationError(parsed.message, code, suggestedServers);
  }
  return new Error(`MetaApi ${what} failed (${res.status}): ${body.slice(0, 200)}`);
}

// Factory used by the broker registry; returns null when not configured.
export function createMetaApiProvider(
  connection: BrokerConnection,
): MetaApiProvider | null {
  const token = process.env.METAAPI_TOKEN;
  const accountId = connection.metaApiAccountId || process.env.METAAPI_ACCOUNT_ID;
  const region = process.env.METAAPI_REGION || "new-york";
  if (!token || !accountId) return null;
  return new MetaApiProvider(token, accountId, region);
}

/**
 * Provisions a MetaApi (cloud-g2) account from MT credentials and returns its
 * id. Credentials are sent to MetaApi and NOT stored by us. Use the investor
 * (read-only) password so the link can never place trades.
 */
export async function provisionMetaApiAccount(creds: {
  name: string;
  login: string;
  password: string;
  server: string;
  platform?: "mt4" | "mt5";
}): Promise<string> {
  const token = process.env.METAAPI_TOKEN;
  if (!token) throw new Error("METAAPI_TOKEN is not configured.");
  const region = process.env.METAAPI_REGION || "new-york";

  const res = await fetch(`${PROVISIONING_BASE}/users/current/accounts`, {
    method: "POST",
    headers: { "auth-token": token, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: creds.name,
      login: creds.login,
      password: creds.password,
      server: creds.server,
      platform: creds.platform ?? "mt5",
      type: "cloud-g2",
      reliability: "regular", // cost control — high reliability isn't needed for periodic sync
      magic: 0,
      region,
      application: "MetaApi",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw await apiError(res, "provisioning");
  const data = (await res.json()) as { id: string | number };
  // MetaApi normally returns a string id; coerce defensively so a numeric id
  // can't break the (String) DB column.
  return String(data.id);
}
