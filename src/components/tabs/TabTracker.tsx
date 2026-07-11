"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTabs, resolveTab } from "./TabsProvider";

// Registers the current route as an open tab (or activates it if already open).
// Auth pages live outside the app shell, so every route here is app content.
export default function TabTracker() {
  const pathname = usePathname();
  const { openTab } = useTabs();

  useEffect(() => {
    const { title, icon } = resolveTab(pathname);
    openTab(pathname, title, icon);
  }, [pathname, openTab]);

  return null;
}
