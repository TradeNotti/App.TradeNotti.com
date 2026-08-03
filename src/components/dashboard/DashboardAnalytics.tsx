"use client";

import { useState } from "react";
import type { AnalyticsData, Range } from "@/lib/analytics";
import type { DashboardExtras as Extras } from "@/lib/dashboard";
import RangeSwitcher from "./RangeSwitcher";
import MetricsBar from "./MetricsBar";
import AnalyticsView from "../analytics/AnalyticsView";
import DashboardExtrasCards, { type LeaderRow } from "./DashboardExtras";

// Owns the single time-range control shared by the metrics bar, the
// analytics section, and the extras cards below it, so picking
// Week/Month/YTD/All/Custom updates Net P&L, Profit factor, Win rate, the
// equity curve, the R-multiple distribution, long/short split, most-traded
// pairs, and market-phase breakdown all together instead of the cards
// staying locked to "this month" while the rest of the range changes.
export default function DashboardAnalytics({
  initial,
  extrasInitial,
  leaderboard,
  accountId,
}: {
  initial: AnalyticsData;
  extrasInitial: Extras;
  leaderboard: LeaderRow[];
  accountId: string;
}) {
  const [data, setData] = useState<AnalyticsData>(initial);
  const [extras, setExtras] = useState<Extras>(extrasInitial);
  const [range, setRange] = useState<Range>(initial.range);
  const [loading, setLoading] = useState(false);

  const changeRange = async (next: Range, custom?: { from: string; to: string }) => {
    if (next === range && next !== "custom") return;
    setRange(next);
    setLoading(true);
    try {
      const qs =
        next === "custom" && custom
          ? `range=custom&from=${custom.from}&to=${custom.to}`
          : `range=${next}`;
      const [analyticsRes, extrasRes] = await Promise.all([
        fetch(`/api/analytics?${qs}&accountId=${accountId}`, { cache: "no-store" }),
        fetch(`/api/dashboard/extras?${qs}&accountId=${accountId}`, { cache: "no-store" }),
      ]);
      if (analyticsRes.ok) setData(await analyticsRes.json());
      if (extrasRes.ok) setExtras(await extrasRes.json());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <RangeSwitcher
        range={range}
        periodLabel={data.periodLabel}
        loading={loading}
        onChange={changeRange}
      />
      <MetricsBar analytics={data} extras={extras} />
      <AnalyticsView embedded data={data} range={range} accountId={accountId} />
      <DashboardExtrasCards
        extras={extras}
        leaderboard={leaderboard}
        range={range}
        periodLabel={data.periodLabel}
      />
    </div>
  );
}
