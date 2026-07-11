// Minimal inline icon set (stroke-based, 1.6px) — avoids an icon dependency.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 18, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export const SidebarIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="9" y1="4" x2="9" y2="20" />
  </Base>
);

export const SunIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Base>
);

export const MoonIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Base>
);

export const JournalIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </Base>
);

export const AnalyticsIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 3v18h18" />
    <rect x="7" y="11" width="3" height="6" rx="0.5" />
    <rect x="12" y="7" width="3" height="10" rx="0.5" />
    <rect x="17" y="13" width="3" height="4" rx="0.5" />
  </Base>
);

export const NotebookIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 3v18M13 7h3M13 11h3" />
  </Base>
);

export const RulesIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </Base>
);

export const PartnersIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M16 5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6" />
  </Base>
);

export const ResourcesIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </Base>
);

export const PinboardIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 17v5" />
    <path d="M9 2h6l-1 7 3 2v2H7v-2l3-2-1-7z" />
  </Base>
);

export const GiftIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M5 12v9h14v-9M12 8v13" />
    <path d="M12 8S10.5 3 8 3 5 5 5 5 6.5 8 12 8zM12 8s1.5-5 4-5 3 2 3 2-1.5 3-7 3z" />
  </Base>
);

export const SettingsIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V23a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 6.8 21l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H2a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 3.3 6.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 3.3V3a2 2 0 0 1 4 0v.1A1.7 1.7 0 0 0 16 4.5l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.3a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.8 1z" />
  </Base>
);

export const BellIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </Base>
);

export const ClockIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Base>
);

export const TrendingUpIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 17l6-6 4 4 7-7" />
    <path d="M17 8h4v4" />
  </Base>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
);

export const ChevronIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 9l4 4 4-4" />
  </Base>
);

export const CheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 6L9 17l-5-5" />
  </Base>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </Base>
);

export const MenuIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </Base>
);

// --- editor icons ---
export const ListBulletIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <circle cx="3.5" cy="6" r="1.2" />
    <circle cx="3.5" cy="12" r="1.2" />
    <circle cx="3.5" cy="18" r="1.2" />
  </Base>
);

export const ListOrderedIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M10 6h11M10 12h11M10 18h11M4 4v4M3 8h2M3 13.5h2l-2 2.5h2" />
  </Base>
);

export const ChecklistIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M10 6h11M10 12h11M10 18h11" />
    <path d="M3 6l1.2 1.2L6.5 5M3 17l1.2 1.2L6.5 16" />
  </Base>
);

export const QuoteIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 7H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2v2a2 2 0 0 1-2 2M20 7h-3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2v2a2 2 0 0 1-2 2" />
  </Base>
);

export const CodeBlockIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 9l-3 3 3 3M16 9l3 3-3 3M13 7l-2 10" />
  </Base>
);

export const LinkIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
  </Base>
);

export const AlignLeftIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 6h18M3 12h12M3 18h15" />
  </Base>
);

export const AlignCenterIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 6h18M6 12h12M5 18h14" />
  </Base>
);

export const AlignRightIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 6h18M9 12h12M6 18h15" />
  </Base>
);

export const UndoIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 7L4 12l5 5" />
    <path d="M4 12h11a5 5 0 0 1 0 10h-1" />
  </Base>
);

export const RedoIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 7l5 5-5 5" />
    <path d="M20 12H9a5 5 0 0 0 0 10h1" />
  </Base>
);

export const MinusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14" />
  </Base>
);

export const TemplateIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 9v12" />
  </Base>
);

export const EyeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </Base>
);

export const LogoutIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </Base>
);

export const RefreshIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
  </Base>
);

export const ImageIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </Base>
);

export const TrashIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </Base>
);

export const CloseIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </Base>
);

export const FilterIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 5h18M6 12h12M10 19h4" />
  </Base>
);

export const UploadIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5M12 3v12" />
  </Base>
);

export const MicIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" />
  </Base>
);

export const StopIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </Base>
);

export const PencilIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </Base>
);

export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const CalendarIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Base>
);

export const TagIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0l-7.8-7.8V3h9.8l8 8a2 2 0 0 1 0 2.4z" />
    <circle cx="7.5" cy="7.5" r="1.2" />
  </Base>
);

export const TargetIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.4" />
  </Base>
);

export const ScaleIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v18M6 7h12M6 7l-3 6a3 3 0 0 0 6 0L6 7zM18 7l-3 6a3 3 0 0 0 6 0l-3-6zM5 21h14" />
  </Base>
);

export const CompassIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
  </Base>
);

export const LayersIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </Base>
);

export const SwapIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 4v13M7 4L4 7M7 4l3 3M17 20V7M17 20l3-3M17 20l-3-3" />
  </Base>
);
