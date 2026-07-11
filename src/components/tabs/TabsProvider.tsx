"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

export type IconKey =
  | "today"
  | "journal"
  | "analytics"
  | "notebook"
  | "rules"
  | "partners"
  | "resources"
  | "pinboard"
  | "settings"
  | "doc";

export interface Tab {
  // Stable key + navigation target. We key tabs by pathname so each page
  // (including each trade) is its own tab, Notion-style.
  href: string;
  title: string;
  icon: IconKey;
}

interface TabsState {
  tabs: Tab[];
  activeHref: string;
  openTab: (href: string, title: string, icon: IconKey) => void;
  closeTab: (href: string) => void;
  setTitle: (href: string, title: string) => void;
}

const TabsContext = createContext<TabsState | null>(null);

const STORAGE_KEY = "open-tabs";
const MAX_TABS = 10;

// Map a pathname to a default tab title + icon. Dynamic pages (a trade, a note)
// get a generic label that the page itself refines via useTabTitle().
export function resolveTab(pathname: string): { title: string; icon: IconKey } {
  const seg = pathname.split("/").filter(Boolean);
  const root = seg[0] ?? "today";
  const hasChild = seg.length > 1;
  switch (root) {
    case "today":
      return { title: "Today", icon: "today" };
    case "journal":
      return hasChild
        ? { title: "Trade", icon: "journal" }
        : { title: "Journal", icon: "journal" };
    case "analytics":
      return { title: "Analytics", icon: "analytics" };
    case "notebook":
      return hasChild
        ? { title: "Note", icon: "notebook" }
        : { title: "Notebook", icon: "notebook" };
    case "rules":
      return { title: "Rules", icon: "rules" };
    case "partners":
      return { title: "Partners", icon: "partners" };
    case "resources":
      return { title: "Resources", icon: "resources" };
    case "pinboard":
      return { title: "Pinboard", icon: "pinboard" };
    case "settings":
      return { title: "Settings", icon: "settings" };
    default:
      return { title: root.charAt(0).toUpperCase() + root.slice(1), icon: "doc" };
  }
}

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Lazily read persisted tabs so they're present on the first client render —
  // reading in an effect instead would race the TabTracker's openTab() and drop
  // the just-opened tab on a page refresh. No SSR mismatch because the TabBar
  // renders nothing until it has mounted.
  const [tabs, setTabs] = useState<Tab[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Tab[]) : [];
    } catch {
      return [];
    }
  });

  const persist = useCallback((next: Tab[]) => {
    setTabs(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage may be unavailable */
    }
  }, []);

  const openTab = useCallback(
    (href: string, title: string, icon: IconKey) => {
      setTabs((prev) => {
        const existing = prev.find((t) => t.href === href);
        let next: Tab[];
        if (existing) {
          // Keep an existing (possibly page-refined) title.
          next = prev;
        } else {
          next = [...prev, { href, title, icon }];
          // Soft cap: drop the oldest tab that isn't the one we just opened.
          if (next.length > MAX_TABS) {
            const dropAt = next.findIndex((t) => t.href !== href);
            if (dropAt !== -1) next = next.filter((_, i) => i !== dropAt);
          }
        }
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  const closeTab = useCallback(
    (href: string) => {
      persist(tabs.filter((t) => t.href !== href));
    },
    [tabs, persist],
  );

  const setTitle = useCallback((href: string, title: string) => {
    setTabs((prev) => {
      const next = prev.map((t) => (t.href === href ? { ...t, title } : t));
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ tabs, activeHref: pathname, openTab, closeTab, setTitle }),
    [tabs, pathname, openTab, closeTab, setTitle],
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function useTabs(): TabsState {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("useTabs must be used within TabsProvider");
  return ctx;
}

// Let a page refine its own tab title (e.g. a trade shows its symbol).
export function useTabTitle(title: string | null | undefined) {
  const pathname = usePathname();
  const ctx = useContext(TabsContext);
  useEffect(() => {
    if (ctx && title) ctx.setTitle(pathname, title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, title]);
}
