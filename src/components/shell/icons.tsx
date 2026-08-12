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
    // headphones, as the nav is drawn — the same glyph the player already
    // uses. The tab still carries both media; this is the one a reader
    // recognises at 24px in a tab bar.
    case "av":
      return (
        <Svg {...props}>
          <path d="M4 14v-2a8 8 0 1 1 16 0v2" />
          <rect x="3" y="14" width="4" height="6" rx="1.5" />
          <rect x="17" y="14" width="4" height="6" rx="1.5" />
        </Svg>
      );
    // the assistant slot (PRD §7). Sparkles, matching the journey glyph that
    // already stands for the same idea elsewhere in the chrome.
    case "assistant":
      return (
        <Svg {...props}>
          <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
          <path d="m18 16 .8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8L18 16Z" />
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

/** workspace glyphs for the "Explore workspaces" tiles (design 1A) */
export function WorkspaceIcon({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const cls = className ?? "h-4.5 w-4.5";
  switch (id) {
    case "translations":
      // the spec's translate mark: lines with a downward arrow
      return (
        <Svg className={cls} strokeWidth={2}>
          <path d="M4 6h10M4 11h7M4 16h10" />
          <path d="M18 5v14m0 0 3-3m-3 3-3-3" />
        </Svg>
      );
    case "connect":
      return (
        <Svg className={cls} strokeWidth={2}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20c1-3.5 3.2-5 6-5s5 1.5 6 5" />
          <path d="M16 5.5a3 3 0 0 1 0 5.5M18 20c-.4-2-1-3.4-2-4.4" />
        </Svg>
      );
    case "journey":
      return (
        <Svg className={cls} strokeWidth={2}>
          <path d="m12 3 2 5.2 5.2 2-5.2 2L12 17.4 10 12.2 4.8 10.2 10 8.2 12 3Z" />
          <path d="M18.5 16.5 19.4 19l2.1.9-2.1.9-.9 2.1-.9-2.1L15.5 20l2.1-.9.9-2.6Z" />
        </Svg>
      );
    case "resources":
      return (
        <Svg className={cls} strokeWidth={2}>
          <path d="M4 6h16M4 11h16M4 16h10" />
        </Svg>
      );
    default:
      return (
        <Svg className={cls} strokeWidth={2}>
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z" />
          <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" />
        </Svg>
      );
  }
}

/**
 * The app mark that opens the app bar (design 10A / every mobile screen).
 * Drawn rather than loaded from /icon-192.png: it is the same geometry —
 * measured off that file — and inline it survives offline, needs no request,
 * and stays crisp at the 30px the sidebar uses.
 *
 * Terracotta, not the workspace hue: the mark is app identity, and 10A keeps
 * terracotta on shared chrome while the hue moves only through the switcher.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className ?? "h-8 w-8"} aria-hidden="true">
      <rect width="48" height="48" rx="15" fill="#c8621a" />
      <path d="M23.4 17v16.6H9.75V20z" fill="#faf7f2" />
      <path d="M24.6 17v16.6h13.65V20z" fill="#faf7f2" />
    </svg>
  );
}

/**
 * The switcher pill's glyph (design 10A app bar). One mark in every
 * workspace — it says "this opens a list", not "this is Originals"; only its
 * tint follows the active hue.
 */
export function SwitcherIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-3 w-3"} strokeWidth={2.4}>
      <path d="M5 6h14M5 12h14M5 18h9" />
    </Svg>
  );
}

/** waveform — discourse audio, as distinct from the video play-rectangle */
export function WaveformIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-4.5 w-4.5"} strokeWidth={2}>
      <path d="M4 10v4M8 7v10M12 4.5v15M16 8v8M20 10.5v3" />
    </Svg>
  );
}

export function SunIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-4 w-4"} strokeWidth={1.9}>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </Svg>
  );
}

/**
 * The app bar's display control.
 *
 * This was the letters "Aa" — the convention Apple Books, Kindle and Safari all
 * use, and the argument for it was that nobody has to learn it. The designer
 * draws a palette instead, and it is the better mark *here*: the button no
 * longer opens a type panel, it opens theme, size and weight for the whole app,
 * and "Aa" was quietly promising only the middle one. The reader's own type
 * control, inside a book, keeps its "Aa".
 */
export function PaletteIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-4.5 w-4.5"} strokeWidth={1.7}>
      <path d="M12 3a9 9 0 1 0 0 18c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.5-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4.1-4-7.6-9-7.6Z" />
      <circle cx="7.7" cy="12.4" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="9.9" cy="8.2" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="8.1" r="1.15" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function ShareIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-4 w-4"}>
      <path d="M12 16V4m0 0L8 8m4-4 4 4" />
      <path d="M4 14v4.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V14" />
    </Svg>
  );
}

export function PinIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-3.5 w-3.5"}>
      <path d="M12 21s6-5.3 6-9.5a6 6 0 1 0-12 0C6 15.7 12 21 12 21Z" />
      <circle cx="12" cy="11" r="2" />
    </Svg>
  );
}

export function FilterIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-4 w-4"}>
      <path d="M4 6h16M6.5 12h11M10 18h4" />
    </Svg>
  );
}

/**
 * The two opposed arrows the comp heads **SORT BY** with ("Audio Video -
 * filters modal") — copied rather than borrowed from the axis icons, because
 * this section is the one control in the sheet that reorders instead of
 * removing, and the glyph is what says so before the labels are read.
 */
export function SortIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-4 w-4"}>
      <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
    </Svg>
  );
}

/** The tag the topic panel is headed with (designer, "ui 1"). */
export function TagIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-4 w-4"}>
      <path d="M3.5 11.2V4.5a1 1 0 0 1 1-1h6.7a1 1 0 0 1 .7.3l8 8a1 1 0 0 1 0 1.4l-6.7 6.7a1 1 0 0 1-1.4 0l-8-8a1 1 0 0 1-.3-.7Z" />
      <circle cx="7.75" cy="7.75" r="1.25" />
    </Svg>
  );
}

export function ChevronRight({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-4 w-4"}>
      <path d="m9 5 7 7-7 7" />
    </Svg>
  );
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

export function CheckIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"} strokeWidth={2.2}>
      <path d="m5 12.5 4.5 4.5L19 7" />
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

/**
 * Skip back / forward, with the step written into the icon. The circling
 * arrow alone is read as "replay" or "loop" by about as many people as read it
 * as "back ten seconds", and this player's step is a decision worth showing:
 * in device-voice mode the same control moves a whole paragraph instead.
 */
function SkipIcon({ className, seconds, back }: { className?: string; seconds: number | string; back: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-5 w-5"}
      aria-hidden="true"
    >
      <g transform={back ? undefined : "scale(-1,1) translate(-24,0)"}>
        <path d="M12 5.5a7.5 7.5 0 1 0 7.2 5.4" />
        <path d="M12 2.2 8.8 5.5 12 8.8" />
      </g>
      <text
        x="12"
        y="16.4"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        stroke="none"
        fill="currentColor"
      >
        {seconds}
      </text>
    </svg>
  );
}

export function SkipBackIcon(props: { className?: string; seconds: number | string }) {
  return <SkipIcon {...props} back />;
}

export function SkipForwardIcon(props: { className?: string; seconds: number | string }) {
  return <SkipIcon {...props} back={false} />;
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

/** a screen with a play triangle — the video half of the media pair */
export function VideoIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m10 9 5 3-5 3Z" />
    </Svg>
  );
}

/** a sheet with a turned corner — the `pdf` half of the document pair */
export function DocumentIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
    </Svg>
  );
}

/** a framed picture with a horizon — file kind `image` */
export function ImageIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="m4 17 4.5-4.5L12 16l3-3 5 5" />
    </Svg>
  );
}

export function FolderIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M3 7a2 2 0 0 1 2-2h3.6a2 2 0 0 1 1.4.6L11.5 7H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </Svg>
  );
}

/** a bare URL we hand over rather than render in place (file kind `link`) */
export function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
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

// ---- reader chrome ----

export function BackIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M15 5l-7 7 7 7" />
    </Svg>
  );
}

export function TocIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </Svg>
  );
}

/** outline when idle, filled once the position is saved */
export function BookmarkIcon({
  className,
  filled = false,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-5 w-5"}
      aria-hidden="true"
    >
      <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4.2L6 21z" />
    </svg>
  );
}

export function TypeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className ?? "h-5 w-5"}
      aria-hidden="true"
    >
      <text x="1" y="18" fontSize="13" fontWeight="700" fontFamily="system-ui, sans-serif">
        A
      </text>
      <text x="11" y="18" fontSize="19" fontWeight="700" fontFamily="system-ui, sans-serif">
        A
      </text>
    </svg>
  );
}
