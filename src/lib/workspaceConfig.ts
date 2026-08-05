// Five-workspace navigation model (PRD §2). The BE now calls them workspaces
// too (Content Model v3), and its codes are these ids verbatim (contract §10)
// — so there is no code→workspace mapping table on either side. What lives
// here and not in the API is the chrome: the name, the tagline and the tabs.

export type WorkspaceId =
  | "originals"
  | "translations"
  | "resources"
  | "journey"
  | "connect";

/** the three workspaces whose content is filtered by ?workspace= */
export type ContentWorkspaceId = "originals" | "translations" | "resources";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIcon;
  /**
   * The assistant slot (PRD §7). Search *is* the assistant until there is an
   * assistant, so the slot is labelled for what it will be and points at what
   * exists — nothing about the flag changes when that endpoint arrives, only
   * the href. Desktop still shows its ⌘K.
   */
  isSearch?: boolean;
}

export type NavIcon =
  | "home"
  | "read"
  | "search"
  | "assistant"
  | "av"
  | "browse"
  | "saved"
  | "overview"
  | "notes"
  | "events"
  | "centers";

export interface Workspace {
  id: WorkspaceId;
  name: string;
  /** identity colour (PRD §2 table) */
  color: string;
  /**
   * One line on what the workspace holds, shown under its name in the
   * switcher sheet (design 10A). It carries the accessible label too — the
   * spec asks that choosing correctly never depend on telling five hues
   * apart — so it must describe what is actually behind the row, and no row
   * may promise a surface that is not built yet.
   */
  tagline: string;
  home: string;
  nav: NavItem[];
}

// 4 slots max; uneven counts are intentional — do not pad (PRD §2).
export const WORKSPACES: Record<WorkspaceId, Workspace> = {
  originals: {
    id: "originals",
    name: "Originals",
    // designer palette (spec 10A), each hue deepened only as far as AA on the
    // sepia reading surface requires — terracotta uses the spec's own 700
    color: "#A64E12",
    tagline: "Books · daily Sutra · discourses",
    home: "/",
    /**
     * Five slots, and the only workspace with five.
     *
     * **Audio/Video is a door, not a room.** There was an `/audio` shelf once
     * and Content Model v3 dissolved it, rightly: audio, video, photographs and
     * documents are all Items in one tree, and re-splitting them into parallel
     * containers is what that model exists to prevent. Nothing about that has
     * changed — `/av` moves no data and owns nothing. It is `?kind=audio|video`
     * over the same tree, which is why a shivir folder holding a recording, a
     * transcript and photographs will appear on both tabs the day it lands,
     * with nobody filing it twice.
     *
     * What changed is the weight. Originals now holds forty hours of his own
     * voice, and on a shelf whose loudest content by count is photographs it
     * sat two taps down behind a tile grid. A door onto the material a reader
     * came for is worth a slot; a second home for it would not be.
     *
     * The Library slot keeps the tree itself, minus whatever is purely audio or
     * video — see `WorkspaceShelf`'s `hideKinds`. It is `browse` now rather than
     * `av`, which this tab has the better claim to.
     *
     * PRD §2 caps the bottom nav at four. This is the exception and it is
     * deliberate: the fifth is the Assistant slot, which §7 asks to hold the
     * same position in every workspace, so the tab that gives way cannot be
     * that one.
     */
    nav: [
      { label: "Home", href: "/", icon: "home" },
      { label: "Read", href: "/books", icon: "read" },
      { label: "Audio/Video", href: "/av", icon: "av" },
      { label: "Library", href: "/originals", icon: "browse" },
      { label: "Assistant", href: "/search", icon: "assistant", isSearch: true },
    ],
  },
  translations: {
    id: "translations",
    name: "Translations",
    color: "#4A7260",
    tagline: "English · side-by-side with the original",
    home: "/translations",
    nav: [
      { label: "Home", href: "/translations", icon: "home" },
      { label: "Read", href: "/books?ws=translations", icon: "read" },
      { label: "Assistant", href: "/search", icon: "assistant", isSearch: true },
    ],
  },
  resources: {
    id: "resources",
    name: "Resources",
    color: "#5E5A8C",
    tagline: "Shivir notes · presentations · Yojana",
    home: "/resources",
    // Three slots, not four. Resources holds files rather than books, so the
    // old "Browse" — a books shelf filtered to this section — pointed at
    // nothing; the library itself is the browse surface.
    nav: [
      { label: "Library", href: "/resources", icon: "browse" },
      { label: "Saved", href: "/me/bookmarks", icon: "saved" },
      { label: "Assistant", href: "/search", icon: "assistant", isSearch: true },
    ],
  },
  journey: {
    id: "journey",
    name: "My Journey",
    color: "#89631F",
    tagline: "Where you left off · bookmarks · notes",
    home: "/me",
    nav: [
      { label: "Overview", href: "/me", icon: "overview" },
      { label: "Saved", href: "/me/bookmarks", icon: "saved" },
      { label: "Notes", href: "/me/notes", icon: "notes" },
      { label: "Assistant", href: "/search", icon: "assistant", isSearch: true },
    ],
  },
  connect: {
    id: "connect",
    name: "Connect",
    color: "#2F6E86",
    tagline: "Shivir calendar · JV centres",
    home: "/connect",
    // Three slots. The fourth was Connect's own library, and it is gone: the
    // four folders behind it ship published but empty (§13.3), so the tab
    // promised a room with nothing in it — in the one workspace whose whole
    // job is telling a reader where to go. The shelf still exists at
    // `/connect/library`; see ConnectNav for when the tab comes back.
    nav: [
      { label: "Events", href: "/connect", icon: "events" },
      { label: "Centers", href: "/connect/centers", icon: "centers" },
      { label: "Assistant", href: "/search", icon: "assistant", isSearch: true },
    ],
  },
};

export const WORKSPACE_ORDER: WorkspaceId[] = [
  "originals",
  "translations",
  "resources",
  "journey",
  "connect",
];

const CONTENT_WORKSPACE_IDS: readonly ContentWorkspaceId[] = [
  "originals",
  "translations",
  "resources",
];

/** true for workspaces that can be used as a ?workspace= value */
export function isContentWorkspace(ws: WorkspaceId): ws is ContentWorkspaceId {
  return (CONTENT_WORKSPACE_IDS as readonly string[]).includes(ws);
}

/**
 * A BE `workspace` code → the workspace whose chrome a content page wears.
 * An identity for the three that hold books and folders; a code the FE does
 * not know yet lands in Resources, the shelf for everything else.
 */
export function contentWorkspace(code: string | null | undefined): ContentWorkspaceId {
  const c = code?.toLowerCase() ?? "";
  return isContentWorkspace(c as WorkspaceId) ? (c as ContentWorkspaceId) : "resources";
}

/**
 * A BE `workspace` code → the chrome a *folder* wears at `/library/[id]`.
 *
 * Wider than `contentWorkspace` because the library tree is wider than the
 * `?workspace=` filter: Connect holds folders without being a filterable
 * content shelf, and a reader who opens one of its doors should still be
 * standing in Connect — same accent, same tab bar — rather than be quietly
 * moved to Resources.
 */
export function libraryWorkspace(code: string | null | undefined): WorkspaceId {
  return code?.toLowerCase() === "connect" ? "connect" : contentWorkspace(code);
}

export function workspaceForPath(path: string): WorkspaceId | null {
  if (path === "/") return "originals";
  // `/av` is Originals' own door onto its recordings — the tree behind it is
  // scoped to that workspace, so the chrome must be too.
  if (path.startsWith("/av")) return "originals";
  if (path.startsWith("/translations")) return "translations";
  if (path.startsWith("/resources")) return "resources";
  if (path.startsWith("/me")) return "journey";
  if (path.startsWith("/connect")) return "connect";
  // /books, /search: derived from content section or current workspace state
  return null;
}
