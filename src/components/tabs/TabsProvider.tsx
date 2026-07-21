"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  id: string;
  href: string;
  title: string;
  icon: IconKey;
}

interface TabsState {
  tabs: Tab[];
  activeId: string | null;
  switchTo: (id: string) => void;
  // Opens a brand-new tab (only the "+" button does this).
  openNewTab: (href: string, title: string, icon: IconKey) => void;
  // Closes a tab; returns the href to navigate to if the active tab changed.
  closeTab: (id: string) => string | null;
  setActiveTitle: (title: string) => void;
}

const TabsContext = createContext<TabsState | null>(null);

const STORAGE_KEY = "open-tabs-v2";
const MAX_TABS = 12;

function newId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `t_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

// Map a pathname to a default tab title + icon. Dynamic pages (a trade, a note)
// get a generic label that the page itself refines via useTabTitle().
export function resolveTab(pathname: string): { title: string; icon: IconKey } {
  const seg = pathname.split("/").filter(Boolean);
  const root = seg[0] ?? "today";
  const hasChild = seg.length > 1;
  switch (root) {
    case "today":
      return { title: "Dashboard", icon: "analytics" };
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

interface Persisted {
  tabs: Tab[];
  activeId: string | null;
}

function loadPersisted(): Persisted {
  if (typeof window === "undefined") return { tabs: [], activeId: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch {
    /* ignore */
  }
  return { tabs: [], activeId: null };
}

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Lazy init so tabs are present on the first client render (no effect-race).
  const [{ tabs, activeId }, setState] = useState<Persisted>(loadPersisted);

  const save = useCallback((next: Persisted) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage may be unavailable */
    }
  }, []);

  const update = useCallback(
    (fn: (prev: Persisted) => Persisted) => {
      setState((prev) => {
        const next = fn(prev);
        save(next);
        return next;
      });
    },
    [save],
  );

  // Keep the ACTIVE tab pointed at the current route. Navigating the sidebar
  // therefore moves the current tab in place — it does NOT open a new tab. Only
  // the "+" button (openNewTab) ever adds a tab. Switching to an existing tab
  // lands on a path that already equals that tab's href, so this is a no-op and
  // never clobbers a refined title (e.g. a trade's symbol).
  useEffect(() => {
    update((prev) => {
      const active = prev.tabs.find((t) => t.id === prev.activeId);
      if (!active) {
        // No tabs yet (first load) or stale active id: adopt current route.
        const { title, icon } = resolveTab(pathname);
        const tab = { id: newId(), href: pathname, title, icon };
        return { tabs: [...prev.tabs, tab], activeId: tab.id };
      }
      if (active.href === pathname) return prev; // switch/new-tab already synced
      const { title, icon } = resolveTab(pathname);
      return {
        ...prev,
        tabs: prev.tabs.map((t) =>
          t.id === active.id ? { ...t, href: pathname, title, icon } : t,
        ),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const switchTo = useCallback(
    (id: string) => update((prev) => ({ ...prev, activeId: id })),
    [update],
  );

  const openNewTab = useCallback(
    (href: string, title: string, icon: IconKey) =>
      update((prev) => {
        const tab = { id: newId(), href, title, icon };
        let tabs = [...prev.tabs, tab];
        if (tabs.length > MAX_TABS) {
          const dropAt = tabs.findIndex((t) => t.id !== tab.id && t.id !== prev.activeId);
          if (dropAt !== -1) tabs = tabs.filter((_, i) => i !== dropAt);
        }
        return { tabs, activeId: tab.id };
      }),
    [update],
  );

  // Returns the href to navigate to when the active tab was the one closed.
  const closeTabRef = useRef<(id: string) => string | null>(() => null);
  closeTabRef.current = (id: string) => {
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const wasActive = id === activeId;
    const remaining = tabs.filter((t) => t.id !== id);
    let nextActive = activeId;
    let navigateTo: string | null = null;
    if (wasActive) {
      const neighbor = remaining[idx - 1] ?? remaining[idx] ?? remaining[0] ?? null;
      nextActive = neighbor?.id ?? null;
      navigateTo = neighbor?.href ?? "/today";
    }
    update(() => ({ tabs: remaining, activeId: nextActive }));
    return navigateTo;
  };
  const closeTab = useCallback((id: string) => closeTabRef.current(id), []);

  const setActiveTitle = useCallback(
    (title: string) =>
      update((prev) => ({
        ...prev,
        tabs: prev.tabs.map((t) =>
          t.id === prev.activeId ? { ...t, title } : t,
        ),
      })),
    [update],
  );

  const value = useMemo(
    () => ({ tabs, activeId, switchTo, openNewTab, closeTab, setActiveTitle }),
    [tabs, activeId, switchTo, openNewTab, closeTab, setActiveTitle],
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function useTabs(): TabsState {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("useTabs must be used within TabsProvider");
  return ctx;
}

// Let the active page refine its own tab title (e.g. a trade shows its symbol).
export function useTabTitle(title: string | null | undefined) {
  const ctx = useContext(TabsContext);
  useEffect(() => {
    if (ctx && title) ctx.setActiveTitle(title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);
}
