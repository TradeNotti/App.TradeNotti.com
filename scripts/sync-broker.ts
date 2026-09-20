import { prisma } from "../src/lib/db";
import { getAccountsForCurrentUser } from "../src/lib/account";
import { syncAccountTrades } from "../src/lib/broker-sync";

// Manual entrypoint: reconcile open positions for every account.
async function main() {
  const accounts = await getAccountsForCurrentUser();
  for (const account of accounts) {
    const r = await syncAccountTrades(account.id);
    console.log(`[sync] ${account.label}: ${r.open} open, ${r.closed} closed`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
