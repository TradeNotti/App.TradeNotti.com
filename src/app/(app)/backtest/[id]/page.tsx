import { notFound } from "next/navigation";
import TopBar from "@/components/TopBar";
import EmptyAccount from "@/components/EmptyAccount";
import TradeDetail from "@/components/journal/TradeDetail";
import {
  getAccountsForCurrentUser,
  getActiveAccount,
  getCurrentUser,
} from "@/lib/account";
import { getTradeDetail } from "@/lib/journal";

export const dynamic = "force-dynamic";

export default async function BacktestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [user, accounts, account] = await Promise.all([
    getCurrentUser(),
    getAccountsForCurrentUser(),
    getActiveAccount(),
  ]);

  if (!account) {
    return <EmptyAccount />;
  }

  const trade = await getTradeDetail(account.id, id);
  if (!trade) notFound();

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
      <TradeDetail trade={trade} backHref="/backtest" backLabel="Backtesting" />
    </>
  );
}
