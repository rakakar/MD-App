// Five-workspace navigation model (PRD §2). Three of the five are backed by a
// BE section, and the section codes are these workspace ids verbatim (contract
// §10) — so there is no code→workspace mapping table on either side. Journey
// and Connect have their own endpoints and never appear in sections/.

export type WorkspaceId =
  | "originals"
  | "translations"
  | "resources"
  | "journey"
  | "connect";

/** the three workspaces whose content is filtered by ?section__code= */
export type ContentWorkspaceId = "originals" | "translations" | "resources";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIcon;
  /** centre slot — the Search stand-in for the future assistant (PRD §7) */
  isSearch?: boolean;
}

export type NavIcon =
  | "home"
  | "read"
  | "search"
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
  nameHi: string;
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
    nameHi: "मूल ग्रंथ",
    // designer palette (spec 10A), each hue deepened only as far as AA on the
    // sepia reading surface requires — terracotta uses the spec's own 700
    color: "#A64E12",
    tagline: "ग्रंथ · daily सूत्र · प्रवचन",
    home: "/",
    nav: [
      { label: "Home", href: "/", icon: "home" },
      { label: "Read", href: "/books", icon: "read" },
      { label: "Search", href: "/search", icon: "search", isSearch: true },
      { label: "Audio/Video", href: "/audio", icon: "av" },
    ],
  },
  translations: {
    id: "translations",
    name: "Translations",
    nameHi: "अनुवाद",
    color: "#4A7260",
    tagline: "English · side-by-side with the मूल",
    home: "/translations",
    nav: [
      { label: "Home", href: "/translations", icon: "home" },
      { label: "Read", href: "/books?ws=translations", icon: "read" },
      { label: "Search", href: "/search", icon: "search", isSearch: true },
    ],
  },
  resources: {
    id: "resources",
    name: "Resources",
    nameHi: "संसाधन",
    color: "#5E5A8C",
    tagline: "Shivir notes · presentations · Yojana",
    home: "/resources",
    // Three slots, not four. Resources holds files rather than books, so the
    // old "Browse" — a books shelf filtered to this section — pointed at
    // nothing; the library itself is the browse surface.
    nav: [
      { label: "Library", href: "/resources", icon: "browse" },
      { label: "Search", href: "/search", icon: "search", isSearch: true },
      { label: "Saved", href: "/me/bookmarks", icon: "saved" },
    ],
  },
  journey: {
    id: "journey",
    name: "My Journey",
    nameHi: "मेरी यात्रा",
    color: "#89631F",
    tagline: "Where you left off · bookmarks · notes",
    home: "/me",
    nav: [
      { label: "Overview", href: "/me", icon: "overview" },
      { label: "Saved", href: "/me/bookmarks", icon: "saved" },
      { label: "Search", href: "/search", icon: "search", isSearch: true },
      { label: "Notes", href: "/me/notes", icon: "notes" },
    ],
  },
  connect: {
    id: "connect",
    name: "Connect",
    nameHi: "संपर्क",
    color: "#2F6E86",
    tagline: "शिविर calendar · JV centres",
    home: "/connect",
    nav: [
      { label: "Events", href: "/connect", icon: "events" },
      { label: "Centers", href: "/connect/centers", icon: "centers" },
      { label: "Search", href: "/search", icon: "search", isSearch: true },
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

/** true for workspaces that can be used as a ?section__code= value */
export function isContentWorkspace(ws: WorkspaceId): ws is ContentWorkspaceId {
  return (CONTENT_WORKSPACE_IDS as readonly string[]).includes(ws);
}

/**
 * section__code → workspace. It is an identity for the three content sections;
 * a section the FE does not know yet lands in Resources, which is also the
 * fallback the BE documents (contract §10).
 */
export function workspaceForSection(sectionCode: string | null | undefined): ContentWorkspaceId {
  const code = sectionCode?.toLowerCase() ?? "";
  return isContentWorkspace(code as WorkspaceId) ? (code as ContentWorkspaceId) : "resources";
}

export function workspaceForPath(path: string): WorkspaceId | null {
  // /vani is deliberately Originals chrome, not Resources: it is the home
  // page's door onto his own words, and the reader is never told that the
  // resources shelf holds most of what is behind it (contract §13.6).
  if (
    path === "/" ||
    path.startsWith("/audio") ||
    path.startsWith("/videos") ||
    path.startsWith("/vani")
  )
    return "originals";
  if (path.startsWith("/translations")) return "translations";
  if (path.startsWith("/resources")) return "resources";
  if (path.startsWith("/me")) return "journey";
  if (path.startsWith("/connect")) return "connect";
  // /books, /search: derived from content section or current workspace state
  return null;
}
