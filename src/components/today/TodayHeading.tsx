"use client";

import { useEffect, useState } from "react";
import { greeting, formatLongDate } from "@/lib/format";

/**
 * Greeting + long date rendered on the client, so the date and the
 * morning/afternoon/evening greeting follow the VIEWER's local timezone rather
 * than the server's (Vercel runs in UTC). Ticks once a minute so an open tab
 * stays correct across a day/greeting boundary. suppressHydrationWarning: the
 * server's first paint uses UTC and is replaced by local time on hydration.
 */
export default function TodayHeading({ displayName }: { displayName: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div className="kicker mb-2" suppressHydrationWarning>
        {formatLongDate(now)}
      </div>
      <h1
        className="mb-8 text-2xl font-bold tracking-tight sm:text-3xl"
        suppressHydrationWarning
      >
        {greeting(now)}, {displayName}.
      </h1>
    </>
  );
}
