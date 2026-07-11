"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTabs, type IconKey } from "./TabsProvider";
import {
  SunIcon,
  JournalIcon,
  AnalyticsIcon,
  NotebookIcon,
  RulesIcon,
  PartnersIcon,
  ResourcesIcon,
  PinboardIcon,
  SettingsIcon,
  PlusIcon,
  CloseIcon,
} from "../icons";

const ICONS: Record<IconKey, (p: { size?: number }) => React.ReactNode> = {
  today: SunIcon,
  journal: JournalIcon,
  analytics: AnalyticsIcon,
  notebook: NotebookIcon,
  rules: RulesIcon,
  partners: PartnersIcon,
  resources: ResourcesIcon,
  pinboard: PinboardIcon,
  settings: SettingsIcon,
  doc: NotebookIcon,
};

// Sections offered by the "+" new-tab menu.
const SECTIONS: { href: string; label: string; icon: IconKey }[] = [
  { href: "/today", label: "Today", icon: "today" },
  { href: "/journal", label: "Journal", icon: "journal" },
  { href: "/analytics", label: "Analytics", icon: "analytics" },
  { href: "/notebook", label: "Notebook", icon: "notebook" },
  { href: "/rules", label: "Rules", icon: "rules" },
  { href: "/partners", label: "Partners", icon: "partners" },
  { href: "/resources", label: "Resources", icon: "resources" },
  { href: "/pinboard", label: "Pinboard", icon: "pinboard" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export default function TabBar() {
  const router = useRouter();
  const { tabs, activeHref, closeTab } = useTabs();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  // Render nothing until hydrated (tabs live in localStorage) to avoid a
  // server/client mismatch.
  if (!mounted || tabs.length === 0) return null;

  // Exactly one tab is active: the one that matches the current path most
  // specifically. An exact href wins; otherwise the longest prefix match, so
  // "/journal" doesn't also light up while you're on "/journal/<id>".
  const exact = tabs.find((t) => t.href === activeHref);
  const activeTabHref =
    exact?.href ??
    tabs
      .filter((t) => activeHref.startsWith(t.href + "/"))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ??
    null;
  const isActive = (href: string) => href === activeTabHref;

  const onClose = (e: React.MouseEvent, href: string) => {
    e.stopPropagation();
    const idx = tabs.findIndex((t) => t.href === href);
    const wasActive = isActive(href);
    closeTab(href);
    if (wasActive) {
      const neighbor = tabs[idx - 1] ?? tabs[idx + 1];
      router.push(neighbor ? neighbor.href : "/today");
    }
  };

  return (
    <div className="relative flex h-11 shrink-0 items-center gap-1 border-b border-line bg-surface px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overflow-x-auto">
      {tabs.map((t) => {
        const Icon = ICONS[t.icon] ?? NotebookIcon;
        const active = isActive(t.href);
        return (
          <button
            key={t.href}
            onClick={() => router.push(t.href)}
            className={`group flex h-8 shrink-0 items-center gap-2 rounded-lg pl-2.5 pr-1.5 text-[13px] transition-colors ${
              active
                ? "bg-canvas font-medium text-ink ring-1 ring-line"
                : "text-muted hover:bg-black/[0.04] hover:text-ink"
            }`}
          >
            <span className={active ? "text-accent" : "text-faint"}>
              <Icon size={14} />
            </span>
            <span className="max-w-[9rem] truncate">{t.title}</span>
            <span
              onClick={(e) => onClose(e, t.href)}
              role="button"
              aria-label={`Close ${t.title}`}
              className={`flex h-4.5 w-4.5 items-center justify-center rounded text-faint hover:bg-black/10 hover:text-ink ${
                active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <CloseIcon size={12} />
            </span>
          </button>
        );
      })}

      {/* New-tab menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Open a section in a new tab"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-black/[0.04] hover:text-ink"
        >
          <PlusIcon size={15} />
        </button>
        {menuOpen && (
          <div className="absolute left-0 top-full z-40 mt-1 w-48 rounded-xl border border-line bg-surface p-1.5 shadow-xl shadow-black/10">
            <div className="kicker px-2 py-1">Open a section</div>
            {SECTIONS.map((s) => {
              const Icon = ICONS[s.icon];
              return (
                <button
                  key={s.href}
                  onClick={() => {
                    setMenuOpen(false);
                    router.push(s.href);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink hover:bg-black/[0.04]"
                >
                  <span className="text-faint">
                    <Icon size={15} />
                  </span>
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
