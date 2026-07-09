import TopBar from "@/components/TopBar";
import EmptyAccount from "@/components/EmptyAccount";
import BacktestView from "@/components/backtest/BacktestView";
import {
  getAccountsForCurrentUser,
  getActiveAccount,
  getActiveAccountIds,
  getCurrentUser,
} from "@/lib/account";
import { getJournalTrades, getJournalFilterOptions } from "@/lib/journal";

export const dynamic = "force-dynamic";

export default async function BacktestPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const { account: accountParam } = await searchParams;

  const [user, accounts, account, accountIds] = await Promise.all([
    getCurrentUser(),
    getAccountsForCurrentUser(),
    getActiveAccount(accountParam),
    getActiveAccountIds(accountParam),
  ]);

  if (!account) {
    return <EmptyAccount />;
  }

  const [trades, options] = await Promise.all([
    getJournalTrades(accountIds, true),
    getJournalFilterOptions(accountIds, true),
  ]);

  const initial = (user?.name ?? "T").charAt(0).toUpperCase();

  return (
    <>
      <TopBar
        accounts={accounts.map((a) => ({
          id: a.id,
          label: a.label,
          broker: a.broker,
          currency: a.currency,
          type: a.type,
        }))}
        activeId={account.id}
        userInitial={initial}
      />
      <BacktestView trades={trades} options={options} />
    </>
  );
}
