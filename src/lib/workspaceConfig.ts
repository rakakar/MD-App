// Five-workspace navigation model (PRD §2). This file is the single place
// where section codes map to workspaces — editable without touching screens.
// BE confirms exact Translations/Resources codes during M1 (non-blocking);
// unknown sections default to Resources.

export type WorkspaceId =
  | "originals"
  | "translations"
  | "resources"
  | "journey"
  | "connect";

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
    color: "#C8621A",
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
    color: "#1A6B5C",
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
    color: "#3B6B9E",
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
    color: "#534AB7",
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
    color: "#B8452E",
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

/**
 * section__code → workspace. Extend here as BE confirms codes; screens read
 * only through workspaceForSection().
 */
const SECTION_WORKSPACE_MAP: Record<string, WorkspaceId> = {
  // live BE codes (schema CodeEnum, confirmed 27 Jul 2026)
  MOOL: "originals",
  VIDYARTHI: "resources",
  ABHIYAAN: "resources",
  // future codes BE will confirm during M1 — placeholders, safe if absent
  ANUVAD: "translations",
  TRANSLATION: "translations",
};

export function workspaceForSection(sectionCode: string | null | undefined): WorkspaceId {
  if (!sectionCode) return "resources";
  return SECTION_WORKSPACE_MAP[sectionCode.toUpperCase()] ?? "resources";
}

/** section codes browsed by a content workspace (for ?section__code= filters) */
export function sectionCodesForWorkspace(ws: WorkspaceId): string[] {
  return Object.entries(SECTION_WORKSPACE_MAP)
    .filter(([, v]) => v === ws)
    .map(([k]) => k);
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
