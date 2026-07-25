"use client";

import { useState } from "react";
import type { AnalyticsData, Range } from "@/lib/analytics";
import type { DashboardExtras as Extras } from "@/lib/dashboard";
import RangeSwitcher from "./RangeSwitcher";
import MetricsBar from "./MetricsBar";
import AnalyticsView from "../analytics/AnalyticsView";

// Owns the single time-range control shared by the metrics bar and the
// analytics section below it, so picking Week/Month/YTD/All/Custom updates
// Net P&L, Profit factor, Win rate, the equity curve, and everything else
// together instead of each having its own range.
export default function DashboardAnalytics({
  initial,
  extras,
  accountId,
}: {
  initial: AnalyticsData;
  extras: Extras;
  accountId: string;
}) {
  const [data, setData] = useState<AnalyticsData>(initial);
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
      const res = await fetch(`/api/analytics?${qs}&accountId=${accountId}`, {
        cache: "no-store",
      });
      if (res.ok) setData(await res.json());
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
    </div>
  );
}
