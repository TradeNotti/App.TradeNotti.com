import TopBar from "@/components/TopBar";
import EmptyAccount from "@/components/EmptyAccount";
import DailyInsightCard from "@/components/today/DailyInsightCard";
import PerformanceCalendar from "@/components/analytics/PerformanceCalendar";
import PerformancePanel from "@/components/resources/PerformancePanel";
import {
  getAccountsForCurrentUser,
  getActiveAccount,
  getActiveAccountIds,
  getCurrentUser,
} from "@/lib/account";
import { getTodayInsight } from "@/lib/ai/daily-insight";
import { getAnalytics, getCalendar } from "@/lib/analytics";
import { getPerformance } from "@/lib/resources";
import { getDashboardExtras } from "@/lib/dashboard";
import { getPartnersData } from "@/lib/partners";
import { titleCase } from "@/lib/format";
import TodayHeading from "@/components/today/TodayHeading";
import DashboardExtras, { type LeaderRow } from "@/components/dashboard/DashboardExtras";
import DashboardAnalytics from "@/components/dashboard/DashboardAnalytics";

export const dynamic = "force-dynamic";

// The Dashboard is the app home: today's snapshot + the full performance
// analytics, all on one page.
export default async function DashboardPage({
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

  const now = new Date();
  const [insight, analytics, calendar, performance, extras, partners] =
    await Promise.all([
      getTodayInsight(account.id),
      getAnalytics(accountIds, "month"),
      getCalendar(accountIds, now.getUTCFullYear(), now.getUTCMonth()),
      getPerformance(accountIds, "monthly"),
      getDashboardExtras(accountIds),
      user ? getPartnersData(user.id) : Promise.resolve({ partners: [] as never[] }),
    ]);

  const displayName = titleCase(user?.name ?? "trader");
  const initial = (user?.name ?? "T").charAt(0).toUpperCase();

  // Leaderboard: me + accountability partners, ranked by win rate.
  const leaderboard: LeaderRow[] = [
    {
      name: displayName,
      winRate: analytics.winRate,
      isMe: true,
      note: account.label,
    },
    ...partners.partners.map((p) => ({
      name: p.name,
      winRate: p.stats.winRate,
      isMe: false,
      note: `@${p.username}`,
    })),
  ].sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1));

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
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <TodayHeading displayName={displayName} />

          <div className="flex flex-col gap-5">
            <DailyInsightCard category={insight.category} text={insight.text} />
            <DashboardAnalytics
              initial={analytics}
              extras={extras}
              accountId={accountParam ?? account.id}
            />
            <DashboardExtras extras={extras} leaderboard={leaderboard} />
            <PerformanceCalendar initial={calendar} accountId={accountParam ?? account.id} />
            <PerformancePanel accountId={accountParam ?? account.id} initial={performance} />
          </div>
        </div>
      </div>
    </>
  );
}
