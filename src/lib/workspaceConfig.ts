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
  home: string;
  nav: NavItem[];
}

// 4 slots max; uneven counts are intentional — do not pad (PRD §2).
export const WORKSPACES: Record<WorkspaceId, Workspace> = {
  originals: {
    id: "originals",
    name: "Originals",
    nameHi: "मूल ग्रंथ",
    // one step deeper than the other four: saffron is the lightest of the
    // five, and #B45817 still measured 3.98:1 as text on the sepia page
    color: "#A54F14",
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
    color: "#17604F",
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
    color: "#35608E",
    home: "/resources",
    nav: [
      { label: "Home", href: "/resources", icon: "home" },
      { label: "Browse", href: "/books?ws=resources", icon: "browse" },
      { label: "Search", href: "/search", icon: "search", isSearch: true },
      { label: "Saved", href: "/me/bookmarks", icon: "saved" },
    ],
  },
  journey: {
    id: "journey",
    name: "My Journey",
    nameHi: "मेरी यात्रा",
    color: "#4B42A5",
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
    color: "#A53D29",
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
  if (path === "/" || path.startsWith("/audio") || path.startsWith("/videos"))
    return "originals";
  if (path.startsWith("/translations")) return "translations";
  if (path.startsWith("/resources")) return "resources";
  if (path.startsWith("/me")) return "journey";
  if (path.startsWith("/connect")) return "connect";
  // /books, /search: derived from content section or current workspace state
  return null;
}
