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
  | "materials"
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
    tagline: "All works of Shri A. Nagraj",
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
      { label: "Books", href: "/books", icon: "read" },
      // "Media" here, on the page it opens, and on the pill that leads back to
      // it out of a folder. The `av` icon key and the `/av` address are
      // unchanged — the route is an address, not a label, and moving it would
      // break every link anyone has to a recording.
      { label: "Media", href: "/av", icon: "av" },
      { label: "Library", href: "/originals", icon: "browse" },
      { label: "Assistant", href: "/search", icon: "assistant", isSearch: true },
    ],
  },
  translations: {
    id: "translations",
    name: "Translations",
    color: "#4A7260",
    tagline: "Read translations by students",
    home: "/translations",
    // Two slots. "Read" pointed at `/books?ws=translations`, which was the
    // same four books under the same language chips as the home it sat beside
    // — one shelf reachable two ways, and a tab bar asking a reader to choose
    // between them. The home absorbed its summary line and the tab is gone; it
    // is named for the workspace now rather than "Home", since it is the only
    // content tab here and "Translations" is what the reader pressed to arrive.
    // `/books?ws=translations` still resolves for anyone holding the link.
    nav: [
      { label: "Translations", href: "/translations", icon: "home" },
      { label: "Assistant", href: "/search", icon: "assistant", isSearch: true },
    ],
  },
  resources: {
    id: "resources",
    name: "Resources",
    color: "#5E5A8C",
    tagline: "Student Materials: Shodh patra, textbooks, etc.",
    home: "/resources",
    // Two slots, not four. Resources holds files rather than books, so the
    // old "Browse" — a books shelf filtered to this section — pointed at
    // nothing; the library itself is the browse surface, renamed "Student
    // Materials" because "Library" repeated what the app bar already said and
    // "Resources" already names the shelf a folder of PDFs sits on.
    //
    // No "Saved" here. Saving is `/me/bookmarks/` — a painted paragraph in a
    // book (contract §6.0) — and this workspace has no paragraphs, only files.
    // The tab pointed at a screen that could never hold anything reached from
    // here; the honest fix is not to offer it.
    nav: [
      { label: "Student Materials", href: "/resources", icon: "materials" },
      { label: "Assistant", href: "/search", icon: "assistant", isSearch: true },
    ],
  },
  journey: {
    id: "journey",
    name: "My Journey",
    color: "#89631F",
    tagline: "Study Roadmap - History - Highlights & Notes",
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
    tagline: "Shivir Calendar - Contacts - Links",
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

/**
 * Which tab a folder page stands under — **the browse tab of its workspace**.
 *
 * `/library/<id>` is workspace-neutral by design (§13.2) and matches no tab's
 * href, so the whole bar used to go dark the moment a reader opened a
 * collection: five tabs, none of them lit, on the screen where they had gone
 * furthest in. The route cannot answer this on its own — the node's workspace
 * can, which is why this is asked with a code in hand rather than a path.
 *
 * `null` for a workspace with no browse tab. Connect's was removed while its
 * folders ship empty and Translations has no folders yet, so there is
 * genuinely no tab to light, and inventing one would be worse than none.
 */
/** icons that mark "the browse tab" — see `libraryTab` */
const BROWSE_ICONS: NavIcon[] = ["browse", "materials"];

/**
 * The app's own accent — the terracotta the brand mark is drawn in.
 *
 * Shared with Originals by design rather than by accident: that shelf carries
 * the house colour, and this is a second name for it so a screen belonging to
 * no workspace can say "the app's colour" instead of borrowing one shelf's
 * identity. Read by `AppAccent`, which is how Settings and My feedback hold a
 * fixed colour while the chrome around them still names the workspace a reader
 * will go back to.
 */
export const APP_ACCENT = WORKSPACES.originals.color;

export function libraryTab(ws: WorkspaceId): string | null {
  return WORKSPACES[ws].nav.find((item) => BROWSE_ICONS.includes(item.icon))?.href ?? null;
}

/**
 * What the browse tab is *called* — "Library" on Originals, "Student
 * Materials" on Resources — for the one place outside the nav bar that names
 * it: a collection's back pill, which has to say what the reader actually
 * tapped to get here rather than a word this workspace no longer uses.
 * "Library" if a workspace somehow has no browse tab at all, which is not a
 * case that occurs today but is a safer default than an empty pill.
 */
export function libraryTabLabel(ws: WorkspaceId): string {
  return WORKSPACES[ws].nav.find((item) => BROWSE_ICONS.includes(item.icon))?.label ?? "Library";
}

/**
 * The workspace's own Audio/Video door, when it has one — `null` otherwise.
 *
 * Only Originals does, and that is the point of asking rather than assuming:
 * `/av` is scoped to Originals' tree, so sending a reader there from a
 * Resources folder of recordings is not "back", it is a different shelf. The
 * mirror of `libraryTab`, and kept beside it so the two answers about a folder
 * — which tab it stands under, and where leaving it goes — are read off the
 * same nav.
 */
export function avTab(ws: WorkspaceId): string | null {
  return WORKSPACES[ws].nav.find((item) => item.icon === "av")?.href ?? null;
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
