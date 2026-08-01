import { getWorkspaces } from "./api";

/**
 * Workspaces whose root folder has a shelf page of its own.
 *
 * The library is one tree across four workspaces and its URLs are deliberately
 * workspace-neutral (`/library/42`, contract §13.2) — a Connect brochure at a
 * `/resources/…` URL would be a URL that lies. The exception is a root: it is
 * the shelf, and `/resources` is the address readers already have for it.
 *
 * Only Resources has one today. Originals and Translations may hold folders
 * too, and when they get a band for them their roots belong here as well.
 */
const WORKSPACE_SHELF: Record<string, string> = {
  resources: "/resources",
};

/** root node id → the shelf page that renders that root */
export type ShelfMap = Record<number, string>;

/**
 * Which folder ids are really a shelf.
 *
 * `root_node_id` is `null` for `journey`, which never holds content, and for
 * any workspace whose root is unpublished — so this branches on it rather
 * than assuming an id is there (§10.1).
 */
export async function shelfMap(): Promise<ShelfMap> {
  const workspaces = await getWorkspaces().catch(() => []);
  const map: ShelfMap = {};
  for (const w of workspaces) {
    const shelf = WORKSPACE_SHELF[w.code];
    if (shelf && w.root_node_id !== null) map[w.root_node_id] = shelf;
  }
  return map;
}

/** the one canonical URL for a folder — its shelf if it is one, else the tree */
export function nodeHref(id: number, shelves: ShelfMap = {}): string {
  return shelves[id] ?? `/library/${id}`;
}
