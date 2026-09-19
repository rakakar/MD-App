// Glyphs only the Assistant draws. Same 24-box, same 1.8 stroke, same round
// caps as `shell/icons.tsx`, so they sit beside the app's own without a seam.

import type { DestinationIcon } from "@/lib/assistant/destinations";
import type { Intent } from "@/lib/assistant/intent";

function Svg({
  children,
  className = "h-5 w-5",
  strokeWidth = 1.8,
}: {
  children: React.ReactNode;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type P = { className?: string };

export const SparkIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
    <path d="m18 16 .8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8L18 16Z" />
  </Svg>
);

export const HistoryIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
    <path d="M3 4v4h4" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

/** the Paribhasha glyph — a page with lines, as the comps draw it */
export const EntryIcon = ({ className }: P) => (
  <Svg className={className}>
    <rect x="5" y="3.5" width="14" height="17" rx="2" />
    <path d="M9 8.5h6M9 12h6M9 15.5h3.5" />
  </Svg>
);

export const SearchGlyph = ({ className }: P) => (
  <Svg className={className}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4-4" />
  </Svg>
);

/** a lamp — Research */
export const BulbIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" />
  </Svg>
);

export const ArrowGlyph = ({ className }: P) => (
  <Svg className={className}>
    <path d="M5 12h13" />
    <path d="m12 6 6 6-6 6" />
  </Svg>
);

export const ArrowUpIcon = ({ className }: P) => (
  <Svg className={className} strokeWidth={2.2}>
    <path d="M12 19V5" />
    <path d="m6 11 6-6 6 6" />
  </Svg>
);

export const StopIcon = ({ className = "h-5 w-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
  </svg>
);

export const MicIcon = ({ className }: P) => (
  <Svg className={className}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </Svg>
);

export const KeyboardIcon = ({ className }: P) => (
  <Svg className={className}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" />
  </Svg>
);

export const CopyIcon = ({ className }: P) => (
  <Svg className={className}>
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
  </Svg>
);

export const NoteIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4h11A1.5 1.5 0 0 1 19 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-5 4v-4.5Z" />
    <path d="M9 8.5h6M9 12h4" />
  </Svg>
);

export const ChatIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4h11A1.5 1.5 0 0 1 19 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-5 4Z" />
  </Svg>
);

export const EnterIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M19 6v5a2 2 0 0 1-2 2H6" />
    <path d="m9 9.5-3.5 3.5L9 16.5" />
  </Svg>
);

export const CalendarGlyph = ({ className }: P) => (
  <Svg className={className}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M8.5 3v4M15.5 3v4" />
  </Svg>
);

export const BookGlyph = ({ className }: P) => (
  <Svg className={className}>
    <path d="M12 6.5C10.5 5 8.5 4.5 5.5 4.5H3v14h2.5c3 0 5 .5 6.5 2 1.5-1.5 3.5-2 6.5-2H21v-14h-2.5c-3 0-5 .5-6.5 2Z" />
    <path d="M12 6.5v14" />
  </Svg>
);

export const MarkerIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4.2L6 21z" />
  </Svg>
);

export const FolderGlyph = ({ className }: P) => (
  <Svg className={className}>
    <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4.2l2 2.2H19A1.5 1.5 0 0 1 20.5 9.2v8.3A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5Z" />
  </Svg>
);

export const PinGlyph =({ className }: P) => (
  <Svg className={className}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </Svg>
);

export const GearGlyph = ({ className }: P) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.6 19.3a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H2.7a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.4 8.6a1.7 1.7 0 0 0-.3-1.8L4 6.7a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H8.8a1.7 1.7 0 0 0 1-1.5V2.7a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </Svg>
);

export const DownloadGlyph = ({ className }: P) => (
  <Svg className={className}>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
  </Svg>
);

export const HeadphonesGlyph = ({ className }: P) => (
  <Svg className={className}>
    <path d="M4 14v-2a8 8 0 1 1 16 0v2" />
    <rect x="3" y="14" width="4" height="6" rx="1.5" />
    <rect x="17" y="14" width="4" height="6" rx="1.5" />
  </Svg>
);

export const HomeGlyph = ({ className }: P) => (
  <Svg className={className}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </Svg>
);

export const LinkGlyph = ({ className }: P) => (
  <Svg className={className}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Svg>
);

export const JourneyGlyph = ({ className }: P) => (
  <Svg className={className}>
    <path d="M6 20c0-4 3-4 3-8s-3-4-3-8" />
    <path d="M18 4c0 4-3 4-3 8s3 4 3 8" />
    <circle cx="6" cy="20" r="1.4" />
    <circle cx="18" cy="4" r="1.4" />
  </Svg>
);

export function IntentGlyph({ intent, className }: { intent: Intent; className?: string }) {
  switch (intent) {
    case "paribhasha":
      return <EntryIcon className={className} />;
    case "books":
      return <SearchGlyph className={className} />;
    case "research":
      return <BulbIcon className={className} />;
    case "navigate":
      return <ArrowGlyph className={className} />;
  }
}

export function DestinationGlyph({ icon, className }: { icon: DestinationIcon; className?: string }) {
  switch (icon) {
    case "notes":
      return <NoteIcon className={className} />;
    case "highlights":
      return <MarkerIcon className={className} />;
    case "journey":
      return <JourneyGlyph className={className} />;
    case "book":
    case "resume":
      return <BookGlyph className={className} />;
    case "audio":
      return <HeadphonesGlyph className={className} />;
    case "library":
      return <FolderGlyph className={className} />;
    case "events":
      return <CalendarGlyph className={className} />;
    case "centres":
      return <PinGlyph className={className} />;
    case "links":
      return <LinkGlyph className={className} />;
    case "paribhasha":
      return <EntryIcon className={className} />;
    case "settings":
      return <GearGlyph className={className} />;
    case "download":
      return <DownloadGlyph className={className} />;
    case "home":
      return <HomeGlyph className={className} />;
    case "feedback":
      return <ChatIcon className={className} />;
    case "history":
      return <HistoryIcon className={className} />;
  }
}

/** three lines of falling length — the conversations list, as the comps draw it */
export const MenuGlyph = ({ className }: P) => (
  <Svg className={className}>
    <path d="M4 7h16M4 12h11M4 17h7" />
  </Svg>
);
