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
    // Resources' own browse tab (§workspaceConfig — "materials"). A
    // graduation cap rather than the four-square grid every other shelf's
    // Library uses: this shelf is a folder of coursework a student put
    // together, not the reading tree the grid stands for elsewhere, and the
    // nav renamed itself to say so — the glyph should not still say "grid of
    // folders" underneath a label that no longer does.
    case "materials":
      return (
        <Svg {...props}>
          <path d="m12 4 9 4.5-9 4.5-9-4.5L12 4Z" />
          <path d="M7 11v4.5c0 1.4 2.24 2.5 5 2.5s5-1.1 5-2.5V11" />
          <path d="M21 8.5V14" />
        </Svg>
      );
    case "highlights":
      // A marker held over the line it has painted. It was a bookmark pennant
      // while this tab was "Saved", and the pennant outlived the button: the
      // reader's bottom bar has no bookmark on it any more, and what this tab
      // opens is passages painted and written against.
      return (
        <Svg {...props}>
          <path d="M14.5 3.5 20.5 9.5 11 19H5v-6l9.5-9.5Z" />
          <path d="M12.5 5.5 18.5 11.5" />
          <path d="M3 22h18" />
        </Svg>
      );
    case "overview":
      return (
        <Svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
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
    // Two links of a chain, as the comps draw the tab. Not the app's
    // `ExternalLinkIcon` — that one is a box with an arrow leaving it, which
    // says "this opens elsewhere" and is right on every row *inside* this page.
    // The tab is not one of those rows; it is the page they live on.
    case "links":
      return (
        <Svg {...props}>
          <path d="M9.5 14.5 14.5 9.5" />
          <path d="M11 7.5l1.8-1.8a3.7 3.7 0 0 1 5.3 5.3L16.3 12.8" />
          <path d="M13 16.5l-1.8 1.8a3.7 3.7 0 0 1-5.3-5.3L7.7 11.2" />
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
 * The real one now: the Divya Path Sansthan emblem the designer supplied as
 * `design_docs/MD Study logo.svg`, served from `/brand/logo.svg` and rendered
 * into the raster icons by `scripts/build-icons.py`. What stood here until the
 * logo arrived was a two-stroke placeholder measured off the old icon PNG.
 *
 * A file rather than inline SVG, which reverses the earlier call and is worth
 * saying why: the placeholder was three shapes, and this mark is 44 paths of
 * leaf and ring-text detail — ~85KB of path data that would otherwise repeat
 * in the HTML of every page. One cached request instead, precached by the
 * service worker so it still survives offline.
 *
 * Terracotta, not the workspace hue: the mark is app identity, and 10A keeps
 * terracotta on shared chrome while the hue moves only through the switcher.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    // next/image would add a wrapper and a loader around an SVG its optimizer
    // passes through untouched, and this one is 32px of always-visible chrome.
    // eslint-disable-next-line @next/next/no-img-element -- see above
    <img
      src="/brand/logo.svg"
      alt=""
      aria-hidden="true"
      width={40}
      height={40}
      className={className ?? "h-8 w-8"}
    />
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

/** The bin on a saved row — the one destructive control in the app. */
export function TrashIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M4 7h16" />
      <path d="M10 4h4M9 7v12M15 7v12" />
      <path d="M6 7l1 13h10l1-13" />
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

/**
 * `h-5 w-5` by default, like every other glyph in this file.
 *
 * It shipped at 14px while its neighbours defaulted to 20, which made it the
 * one icon that came out wrong unless the caller happened to name a size — and
 * it caught the event card and then the event detail's Location row, in both
 * cases sitting visibly smaller than the calendar directly above it. A default
 * that has to be overridden to look right at most of its call sites is the
 * wrong default.
 *
 * The one place that genuinely wants it small says so now: Home's event row
 * sets it beside 13px text, where 20px would dominate the line it labels.
 */
export function PinIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
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

/**
 * A letter and a glyph, crossing — "which language is this in".
 *
 * The event detail's Language row and nothing else, for now. Drawn as a
 * Devanagari अ meeting a Latin A rather than as a globe: a globe is where
 * something is, and this row is what it is *said* in — the two rows sit one
 * above the other on that screen and cannot both be a place.
 */
export function LanguageIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M3 6h8M7 4v2M9.5 6c0 4-2.5 7-6 8" />
      <path d="M5 10.5c1.5 2.5 3.5 4 5.5 4.5" />
      <path d="m13 20 4-9 4 9M14.4 17h5.2" />
    </Svg>
  );
}

/** A phone handset — the tap-to-call chips under an invitation note. */
export function PhoneIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-4 w-4"}>
      <path d="M7.5 3.5 9.8 8 8 9.8a11 11 0 0 0 5.9 5.9L15.7 14l4.5 2.3-.6 3a1.6 1.6 0 0 1-1.8 1.3C10.4 19.6 4.3 13.5 3.2 6.1A1.6 1.6 0 0 1 4.5 4.3l3-.8Z" />
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

/** "one more of these" — the plus on a button that opens a blank composer */
/** the arrow on a button that leads out of the screen it sits on */
export function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M5 12h13" />
      <path d="m12 6 6 6-6 6" />
    </Svg>
  );
}

/**
 * A winding way with a mark on it — the journey's own path.
 *
 * The same figure the empty state's illustration is built around: a track
 * bending into the distance with waypoints set along it.
 */
export function PathIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M6 20c0-4 3-4 3-8s-3-4-3-8" />
      <path d="M18 4c0 4-3 4-3 8s3 4 3 8" />
      <circle cx="6" cy="20" r="1.4" />
      <circle cx="18" cy="4" r="1.4" />
    </Svg>
  );
}

export function PlusIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M12 5v14M5 12h14" />
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
/**
 * Material Symbols `replay_10` / `forward_10`, the designer's pick, drawn as
 * one filled path each with the digits already in the artwork.
 *
 * That last part is why `SkipIcon` still exists below. These say "10" and
 * cannot say anything else, and the device-voice player does not skip ten
 * seconds — it steps a whole paragraph, and its buttons show ¶. So the drawn
 * ring stays as the general case and these take over for the one length they
 * are.
 */
function Skip10({ className, back }: { className?: string; back: boolean }) {
  return (
    <svg
      viewBox="0 -960 960 960"
      fill="currentColor"
      className={className ?? "h-5 w-5"}
      aria-hidden="true"
    >
      {back ? (
        <path d="M339.5-108.17q-65.5-28.16-114.33-77-48.84-48.83-77-114.33Q120-365 120-440h66.67q0 122.33 85.5 207.83 85.5 85.5 207.83 85.5 122.33 0 207.83-85.38 85.5-85.38 85.5-207.95T689.5-647.95q-83.83-85.38-206.17-85.38h-16.66L536-664l-46.67 47.33L338-768l151.33-151.33 46 46.66L462.67-800H480q75 0 140.5 28.17 65.5 28.16 114.33 77 48.84 48.83 77 114.33Q840-515 840-440t-28.17 140.5q-28.16 65.5-77 114.33-48.83 48.84-114.33 77Q555-80 480-80t-140.5-28.17ZM360-313.33v-201.34h-56v-52.66h109.33v254H360Zm144.67 0q-18.14 0-30.4-12.27Q462-337.87 462-356v-168.67q0-18.13 12.27-30.4 12.26-12.26 30.4-12.26h82q18.13 0 30.4 12.26 12.26 12.27 12.26 30.4V-356q0 18.13-12.26 30.4-12.27 12.27-30.4 12.27h-82Zm10.66-53.34H576v-148h-60.67v148Z" />
      ) : (
        <path d="M360-313.33v-201.34h-56v-52.66h109.33v254H360Zm144.67 0q-18.14 0-30.4-12.27Q462-337.87 462-356v-168.67q0-18.13 12.27-30.4 12.26-12.26 30.4-12.26h82q18.13 0 30.4 12.26 12.26 12.27 12.26 30.4V-356q0 18.13-12.26 30.4-12.27 12.27-30.4 12.27h-82Zm10.66-53.34H576v-148h-60.67v148ZM339.5-108.17q-65.5-28.16-114.33-77-48.84-48.83-77-114.33Q120-365 120-440t28.17-140.5q28.16-65.5 77-114.33 48.83-48.84 114.33-77Q405-800 480-800h16l-72.67-72.67 46-46.66L620.67-768 469.33-616.67l-46-46.66 70-70H480q-122.57 0-207.95 85.38T186.67-440q0 122.57 85.5 207.95T480-146.67q122.33 0 207.83-85.38 85.5-85.38 85.5-207.95H840q0 75-28.17 140.5-28.16 65.5-77 114.33-48.83 48.84-114.33 77Q555-80 480-80t-140.5-28.17Z" />
      )}
    </svg>
  );
}

function SkipIcon({ className, seconds, back }: { className?: string; seconds: number | string; back: boolean }) {
  if (seconds === 10) return <Skip10 className={className} back={back} />;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-5 w-5"}
      aria-hidden="true"
    >
      {/* The arc is centred on the box and open at the top, and the arrowhead
          is a filled triangle sitting *on* the open end rather than a stroked
          chevron floating above it — at 20px the old head hung a stroke-width
          clear of the arc and read as a separate mark, and its apex at y=2.2
          pushed the whole ring off-centre, which is what made these look
          bent. The label is the reason the ring is open: it sits in the
          middle at a size that can be read, and the gap is cut to clear it. */}
      <g transform={back ? undefined : "scale(-1,1) translate(-24,0)"}>
        <path d="M12 4.4a7.6 7.6 0 1 0 6.9 4.4" />
        <path d="M12.1 1.4 8.6 4.4l3.5 3v-6Z" fill="currentColor" stroke="none" />
      </g>
      <text
        x="12"
        y="15.9"
        textAnchor="middle"
        fontSize="9"
        fontWeight="600"
        letterSpacing="-0.4"
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

/** a triangle with a bang in it — a warning, not a note. Used where a line of
 *  text has to be read as a caution before it is read as a sentence. */
/**
 * A circled "i" — a standing note, not a warning.
 *
 * Distinct from `AlertIcon`'s triangle on purpose: a triangle says something
 * has gone wrong or is about to, and the one place this is used says only
 * that a translation is somebody's reading of the original. That is context
 * a reader should have, not a problem they should act on.
 */
/** the account sheet's Settings row — the one gear in the app */
export function SettingsIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9.1 19.4a1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9.1a1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 1-1.47V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </Svg>
  );
}

/**
 * Feedback — a speech bubble, for both the sending of it and the reading
 * back. The two rows are told apart by their words and by what is inside the
 * bubble: nothing on the one that opens an empty composer, lines on the one
 * that opens a list of what has already been said.
 */
export function FeedbackIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-3.3A8.4 8.4 0 1 1 21 11.5Z" />
    </Svg>
  );
}

export function FeedbackListIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-3.3A8.4 8.4 0 1 1 21 11.5Z" />
      <path d="M8.5 9.5h7M8.5 13h4.5" />
    </Svg>
  );
}

/** The triangle on a caution note — the one warning mark in the app. */
export function WarningIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M12 4.5 21 19.5H3L12 4.5Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

export function InfoIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </Svg>
  );
}

export function AlertIcon({ className }: { className?: string }) {
  return (
    <Svg className={className ?? "h-5 w-5"}>
      <path d="M10.3 3.9 1.8 18.1A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
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

/** The two shapes a shelf can take, for the control that swaps between them. */
export function GridIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </Svg>
  );
}

export function ListIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Svg>
  );
}
