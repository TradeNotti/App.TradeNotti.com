// Shared display formatting for the Today page.

export function formatPrice(n: number | null): string {
  if (n == null) return "—";
  // Up to 5 dp for FX, trimmed; large prices (indices/metals) show 2 dp.
  const dp = Math.abs(n) >= 100 ? 2 : Math.abs(n) >= 10 ? 3 : 5;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

export function formatMoney(n: number | null): string {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatR(n: number | null): string {
  if (n == null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}R`;
}

// "Today · 09:42" style timestamp relative to now.
export function formatTradeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (sameDay) return `Today · ${time}`;

  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(
    (new Date(now.toDateString()).getTime() -
      new Date(d.toDateString()).getTime()) /
      dayMs,
  );
  if (diffDays === 1) return `Yesterday · ${time}`;
  return `${diffDays}d ago · ${time}`;
}

// Absolute timestamp, e.g. "Jun 27, 2026 · 14:30" (no relative "Nd ago").
export function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date} · ${time}`;
}

// Capitalize the first letter of each word (e.g. "edwin sungura" -> "Edwin Sungura").
export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Pip size per instrument family (rough but correct for the common symbols).
function pipSize(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.includes("JPY")) return 0.01;
  if (s.includes("XAU") || s.includes("GOLD")) return 0.1;
  if (s.includes("BTC") || s.includes("ETH")) return 1;
  return 0.0001;
}

// Stop distance expressed in pips, e.g. "27 pips".
export function formatPips(
  entry: number,
  stopLoss: number | null,
  symbol: string,
): string {
  if (stopLoss == null) return "—";
  const pips = Math.abs(entry - stopLoss) / pipSize(symbol);
  return `${Math.round(pips)} pips`;
}

export function formatLots(volume: number | null): string {
  if (volume == null) return "—";
  return `${volume.toFixed(2)} lots`;
}

export function formatPercent(n: number | null): string {
  if (n == null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

// Holding time between entry and exit, e.g. "2h 13m". Open trades return "Open".
export function formatDuration(
  startIso: string,
  endIso: string | null,
): string {
  if (!endIso) return "Open";
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms < 0) return "—";
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function formatLongDate(date = new Date()): string {
  return date
    .toLocaleDateString("en-US", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
}
