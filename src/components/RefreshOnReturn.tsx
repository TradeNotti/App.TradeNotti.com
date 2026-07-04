"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps the app showing fresh data when the user comes back to it: refreshes
 * the current route's server data when the tab regains focus (after being away
 * a moment) and when a page is restored from the browser bfcache. This means
 * changes written to the database elsewhere (a sync, another tab) show up
 * without a manual page refresh.
 */
export default function RefreshOnReturn() {
  const router = useRouter();

  useEffect(() => {
    let hiddenAt = 0;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      // Only refresh if we were away long enough to matter (avoids churn on
      // quick tab switches).
      if (Date.now() - hiddenAt > 2500) router.refresh();
    };

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) router.refresh();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [router]);

  return null;
}
