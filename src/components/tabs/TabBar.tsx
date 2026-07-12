"use client";

import { useEffect, useState } from "react";
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

export default function TabBar() {
  const router = useRouter();
  const { tabs, activeId, switchTo, openNewTab, closeTab } = useTabs();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Render nothing until hydrated (tabs live in localStorage) to avoid a
  // server/client mismatch.
  if (!mounted || tabs.length === 0) return null;

  const onClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const navigateTo = closeTab(id);
    if (navigateTo) router.push(navigateTo);
  };

  // "+" opens a fresh tab straight away (on Today, the app's home).
  const onNewTab = () => {
    openNewTab("/today", "Today", "today");
    router.push("/today");
  };

  return (
    <div className="relative flex h-11 shrink-0 items-center gap-1 border-b border-line bg-surface px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overflow-x-auto">
      {tabs.map((t) => {
        const Icon = ICONS[t.icon] ?? NotebookIcon;
        const active = t.id === activeId;
        return (
          <button
            key={t.id}
            onClick={() => {
              switchTo(t.id);
              router.push(t.href);
            }}
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
              onClick={(e) => onClose(e, t.id)}
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

      {/* New tab */}
      <button
        onClick={onNewTab}
        aria-label="New tab"
        title="New tab"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-black/[0.04] hover:text-ink"
      >
        <PlusIcon size={15} />
      </button>
    </div>
  );
}
