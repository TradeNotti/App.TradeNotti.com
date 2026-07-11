"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "./icons";

// Light / dark ("black") theme switch. The theme is applied to <html> as
// data-theme and persisted to localStorage; an inline script in the root layout
// sets it before first paint so there's no flash.
export default function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    const el = document.documentElement;
    if (next) el.setAttribute("data-theme", "dark");
    else el.removeAttribute("data-theme");
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* storage may be unavailable */
    }
  };

  // Render a stable placeholder until mounted to avoid a hydration mismatch.
  const label = dark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-black/[0.04]"
    >
      <span className="text-ink" suppressHydrationWarning>
        {mounted && dark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
      </span>
      {!collapsed && (
        <span suppressHydrationWarning>{mounted && dark ? "Light mode" : "Dark mode"}</span>
      )}
    </button>
  );
}
