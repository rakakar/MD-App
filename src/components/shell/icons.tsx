import type { NavIcon } from "@/lib/workspaceConfig";

interface IconProps {
  className?: string;
  strokeWidth?: number;
}

function Svg({
  children,
  className,
  strokeWidth = 1.8,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-5 w-5"}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function Icon({ name, ...props }: IconProps & { name: NavIcon }) {
  switch (name) {
    case "home":
      return (
        <Svg {...props}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </Svg>
      );
    case "read":
      return (
        <Svg {...props}>
          <path d="M12 6.5C10.5 5 8.5 4.5 5.5 4.5H3v14h2.5c3 0 5 .5 6.5 2 1.5-1.5 3.5-2 6.5-2H21v-14h-2.5c-3 0-5 .5-6.5 2Z" />
          <path d="M12 6.5v14" />
        </Svg>
      );
    case "search":
      return (
        <Svg {...props}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </Svg>
      );
    case "av":
      return (
        <Svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m10 9 5 3-5 3Z" />
        </Svg>
      );
    case "browse":
      return (
        <Svg {...props}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" />
        </Svg>
      );
    case "saved":
      return (
        <Svg {...props}>
          <path d="M6 3h12v18l-6-4.5L6 21V3Z" />
        </Svg>
      );
    case "overview":
      return (
        <Svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </Svg>
      );
    case "notes":
      return (
        <Svg {...props}>
          <path d="M5 3h14v18H5V3Z" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </Svg>
      );
    case "events":
      return (
        <Svg {...props}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </Svg>
      );
    case "centers":
      return (
        <Svg {...props}>
          <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </Svg>
      );
  }
}

export function CalendarChipIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-4 w-4"}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
  );
}

export function ChevronDown({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-4 w-4"}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function UserIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
    </Svg>
  );
}

export function CloseIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function PlayIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M7 4.5v15l12-7.5L7 4.5Z" />
    </Svg>
  );
}

export function PauseIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M7 4.5v15M17 4.5v15" />
    </Svg>
  );
}

export function HeadphonesIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M4 14v-2a8 8 0 1 1 16 0v2" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
    </Svg>
  );
}

export function DownloadIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" />
      <path d="M4 19h16" />
    </Svg>
  );
}
