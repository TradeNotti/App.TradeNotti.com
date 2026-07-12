"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { useMobileNav } from "./MobileNav";
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
  CloseIcon,
  SidebarIcon,
} from "./icons";

const NAV = [
  { href: "/today", label: "Today", Icon: SunIcon },
  { href: "/journal", label: "Journal", Icon: JournalIcon },
  { href: "/analytics", label: "Analytics", Icon: AnalyticsIcon },
  { href: "/notebook", label: "Notebook", Icon: NotebookIcon },
  { href: "/rules", label: "Rules", Icon: RulesIcon },
  { href: "/partners", label: "Partners", Icon: PartnersIcon },
];

const LIBRARY = [
  { href: "/resources", label: "Resources", Icon: ResourcesIcon },
  { href: "/pinboard", label: "Pinboard", Icon: PinboardIcon },
];

const FOOTER = [
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];

function NavLink({
  href,
  label,
  Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  Icon: (p: { size?: number }) => React.ReactNode;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-gradient-to-br from-accent to-[#9d7bff] text-white"
          : "text-ink hover:bg-black/[0.04]"
      }`}
    >
      <span className={active ? "text-white" : "text-ink"}>
        <Icon size={18} />
      </span>
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { open, setOpen, collapsed, setCollapsed } = useMobileNav();
  // Desktop hover-peek: when collapsed, hovering the left edge slides it in.
  // A short close delay debounces the boundary between the edge strip and the
  // panel so it doesn't flicker as the cursor crosses.
  const [peek, setPeek] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hover-peek is a mouse affordance only — never fire it on touch devices
  // (phones/tablets), where a tap would otherwise flash the sidebar in.
  const canHover = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(hover: hover)").matches;

  const showPeek = () => {
    if (!canHover()) return;
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setPeek(true);
  };
  const hidePeek = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setPeek(false), 220);
  };
  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  // While the collapsed sidebar is peeked in, hide it the moment the pointer
  // moves off it — so it never stays open ("stagnant") after the mouse leaves,
  // even if a plain mouseleave is missed. 240px = the sidebar width (w-60).
  useEffect(() => {
    if (!collapsed || !peek) return;
    const onMove = (e: PointerEvent) => {
      if (e.clientX > 248) hidePeek();
      else showPeek();
    };
    document.addEventListener("pointermove", onMove);
    return () => document.removeEventListener("pointermove", onMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, peek]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  const close = () => {
    setOpen(false);
    setPeek(false);
  };

  // Close the mobile drawer on ANY navigation (back/forward or programmatic),
  // not just link clicks.
  useEffect(() => {
    setOpen(false);
    setPeek(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Growing to a desktop width should never leave a mobile drawer "open"; lock
  // background scroll while the drawer is open.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Desktop position: pinned (collapsed=false) sits in the layout; collapsed
  // floats off-screen and only slides in (as an overlay) while peeking.
  const desktopClass = collapsed
    ? peek
      ? "lg:fixed lg:translate-x-0 lg:shadow-2xl"
      : "lg:fixed lg:-translate-x-full"
    : "lg:static lg:z-auto lg:translate-x-0 lg:shadow-none";

  return (
    <>
      {/* Backdrop — mobile only, when the drawer is open */}
      {open && (
        <div
          onClick={close}
          className="fixed inset-0 z-30 scrim lg:hidden"
          aria-hidden
        />
      )}

      {/* Desktop left-edge trigger — hover to peek, click to keep it open */}
      {collapsed && (
        <div
          onMouseEnter={showPeek}
          onClick={() => setCollapsed(false)}
          className="fixed inset-y-0 left-0 z-30 hidden w-4 cursor-pointer lg:block"
          aria-hidden
        />
      )}

      <aside
        onMouseEnter={showPeek}
        onMouseLeave={hidePeek}
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-4 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${desktopClass}`}
      >
        <div className="flex items-center justify-between px-3 pb-6 pt-1">
          <Logo />
          {/* Desktop collapse/keep toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Keep sidebar open" : "Hide sidebar"}
            title={collapsed ? "Keep sidebar open" : "Hide sidebar"}
            className="-mr-1 hidden h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-black/[0.04] lg:flex"
          >
            <SidebarIcon size={18} />
          </button>
          {/* Mobile close */}
          <button
            onClick={close}
            aria-label="Close menu"
            className="-mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-black/[0.04] lg:hidden"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={isActive(item.href)}
              onNavigate={close}
            />
          ))}
        </nav>

        <div className="mt-6 px-3 pb-1">
          <span className="kicker">Library</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {LIBRARY.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={isActive(item.href)}
              onNavigate={close}
            />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
          <ThemeToggle />
          {FOOTER.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={isActive(item.href)}
              onNavigate={close}
            />
          ))}
        </div>
      </aside>
    </>
  );
}
