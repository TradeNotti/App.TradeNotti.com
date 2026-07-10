import TopBar from "@/components/TopBar";
import EmptyAccount from "@/components/EmptyAccount";
import DailyInsightCard from "@/components/today/DailyInsightCard";
import TodaysTrades from "@/components/today/TodaysTrades";
import TradingRules from "@/components/today/TradingRules";
import {
  getAccountsForCurrentUser,
  getActiveAccount,
  getActiveAccountIds,
  getCurrentUser,
} from "@/lib/account";
import { getOpenTrades } from "@/lib/trades";
import { getRulesForAccount } from "@/lib/rules";
import { getTodayInsight } from "@/lib/ai/daily-insight";
import { titleCase } from "@/lib/format";
import TodayHeading from "@/components/today/TodayHeading";

export const dynamic = "force-dynamic";

export default async function TodayPage({
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

  const [trades, rules, insight] = await Promise.all([
    // Open trades aggregate across the selected accounts; rules + the daily
    // insight stay scoped to the primary (first selected) account.
    getOpenTrades(accountIds),
    getRulesForAccount(account.id),
    getTodayInsight(account.id),
  ]);

  const displayName = titleCase(user?.name ?? "trader");
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

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <TodayHeading displayName={displayName} />

          <div className="flex flex-col gap-5">
            <DailyInsightCard category={insight.category} text={insight.text} />
            <TodaysTrades initialTrades={trades} accountId={account.id} />
            <TradingRules rules={rules} />
          </div>
        </div>
      </div>
    </>
  );
}
