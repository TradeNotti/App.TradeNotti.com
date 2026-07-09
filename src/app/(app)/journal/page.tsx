import TopBar from "@/components/TopBar";
import EmptyAccount from "@/components/EmptyAccount";
import JournalTabs from "@/components/journal/JournalTabs";
import {
  getAccountsForCurrentUser,
  getActiveAccount,
  getActiveAccountIds,
  getCurrentUser,
} from "@/lib/account";
import { getJournalTrades, getJournalFilterOptions } from "@/lib/journal";

export const dynamic = "force-dynamic";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; view?: string }>;
}) {
  const { account: accountParam, view } = await searchParams;

  const [user, accounts, account, accountIds] = await Promise.all([
    getCurrentUser(),
    getAccountsForCurrentUser(),
    getActiveAccount(accountParam),
    getActiveAccountIds(accountParam),
  ]);

  if (!account) {
    return <EmptyAccount />;
  }

  const [live, liveOptions, backtest, backtestOptions] = await Promise.all([
    getJournalTrades(accountIds),
    getJournalFilterOptions(accountIds),
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
      <JournalTabs
        live={live}
        liveOptions={liveOptions}
        backtest={backtest}
        backtestOptions={backtestOptions}
        initialView={view === "backtest" ? "backtest" : "live"}
      />
    </>
  );
}
