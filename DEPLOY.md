# Deploying TradeNotti

Recommended: **Vercel** (app) + **Neon** (serverless Postgres). Steps below are
written for that pair; Railway/Render work too (host the app + a Postgres add-on
and use the same env vars and build command).

## 1. Create the database (Neon)

1. Create a Neon project → you get two connection strings:
   - **Pooled** (host contains `-pooler`) → use for `DATABASE_URL`
   - **Direct** → use for `DIRECT_URL` (migrations)
2. Append `?sslmode=require` if not already present.

The app uses the pooled URL at runtime (serverless functions open many short
connections); Prisma migrations use the direct URL.

## 2. Create the Vercel project

- Import the GitHub repo. Framework preset: **Next.js**.
- **Build Command** (already set in `vercel.json`):
  `prisma migrate deploy && next build`
  This applies pending migrations on every deploy, then builds.
- Install command: default (`npm install`). The `postinstall` script runs
  `prisma generate` so the client is always fresh.
- Node version: 20 or 22.

## 3. Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable             | Value                                                        |
| -------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`       | Neon **pooled** string (`...-pooler...?sslmode=require`)      |
| `DIRECT_URL`         | Neon **direct** string                                       |
| `DEMO_USER_EMAIL`    | `edwin@tradenotti.com`                                        |
| `OPENAI_API_KEY`     | _(optional)_ set to enable real insights; unset uses the stub |
| `OPENAI_MODEL`       | _(optional)_ `gpt-4o-mini`                                    |
| `BROKER_PROVIDER`    | `mock`, or `metaapi` for live MT5                            |
| `METAAPI_TOKEN`      | _(live MT5 only)_                                            |
| `METAAPI_ACCOUNT_ID` | _(live MT5 only)_                                            |
| `METAAPI_REGION`     | _(live MT5 only)_ e.g. `new-york`                           |
| `CRON_SECRET`        | random string; protects `/api/seed`                          |

## 4. First deploy + seed

`prisma migrate deploy` creates the tables but does **not** seed. After the
first successful deploy, seed the production database once:

```bash
# From your machine, pointed at the production DB:
DATABASE_URL="<neon-pooled>" DIRECT_URL="<neon-direct>" npm run db:seed
```

Without this the app renders an empty state ("No account found").

## 5. Broker sync

Broker sync is manual only — the user's "Sync now" button hits
`POST /api/sync`, which deploys the MetaApi terminal, pulls positions/deals,
then undeploys (cost control). There's no scheduled/background sync; open
positions only refresh when a user actually clicks it.

## Going live with MetaTrader 5

MT5 has no public REST API. Link a real account via
[MetaApi.cloud](https://metaapi.cloud), then set `BROKER_PROVIDER=metaapi`,
`METAAPI_TOKEN`, and the account's `metaApiAccountId`. Until then `mock` renders
seeded positions so the app is fully functional.

## Local production check

```bash
npm run build && npm start    # build uses local DATABASE_URL/DIRECT_URL
```
