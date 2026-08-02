import { getWorkspaces } from "./api";

/**
 * Workspaces whose root folder has a shelf page of its own.
 *
 * The library is one tree across four workspaces and its URLs are deliberately
 * workspace-neutral (`/library/42`, contract §13.2) — a Connect brochure at a
 * `/resources/…` URL would be a URL that lies. The exception is a root: it is
 * the shelf, and `/resources` is the address readers already have for it.
 *
 * Resources and Connect have one. Connect's is a section rather than the
 * workspace home (`/connect` is the events feed, PRD §8), but it is still the
 * one address for that root, so a card for it never lands on `/library/4`.
 * Originals' is `/originals` — its home is the Originals *workspace* home, so
 * its library needs an address of its own that is not `/`.
 *
 * Translations has no folders yet. It may hold them (Content Model v3 D14),
 * and its root belongs here the day it gets a shelf for them.
 */
const WORKSPACE_SHELF: Record<string, string> = {
  originals: "/originals",
  resources: "/resources",
  connect: "/connect/library",
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
