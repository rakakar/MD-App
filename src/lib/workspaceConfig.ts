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
    // The fourth slot was "Audio/Video → /audio", a shelf Content Model v3
    // dissolved. It is Library now, and points at the tree rather than at one
    // kind of file inside it: audio, video, photographs and documents are all
    // Items in the same tree, and Type on that shelf sieves between them.
    // Re-splitting them into their own tabs is the arrangement v3 deleted.
    //
    // It was held back while there was nothing published to open, which the
    // pCloud import has now changed. The Original-provenance door is still held
    // back, and is a different thing from this: a filter across the whole
    // library, not one workspace's shelf.
    nav: [
      { label: "Home", href: "/", icon: "home" },
      { label: "Read", href: "/books", icon: "read" },
      { label: "Library", href: "/originals", icon: "av" },
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
    // The fourth slot is Connect's own library, not padding: it is a real
    // surface with four doors of its own, and without a tab it is reachable
    // only from a segmented control on two other pages.
    nav: [
      { label: "Events", href: "/connect", icon: "events" },
      { label: "Centers", href: "/connect/centers", icon: "centers" },
      { label: "Library", href: "/connect/library", icon: "browse" },
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
  if (path.startsWith("/translations")) return "translations";
  if (path.startsWith("/resources")) return "resources";
  if (path.startsWith("/me")) return "journey";
  if (path.startsWith("/connect")) return "connect";
  // /books, /search: derived from content section or current workspace state
  return null;
}
