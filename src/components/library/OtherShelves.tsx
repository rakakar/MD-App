import Link from "next/link";
import { findLibrary } from "@/lib/api";
import { EMPTY_FIND, findHref, lockAxis, type FindState } from "@/lib/find";
import { KIND_ORDER } from "./format";

export type ShelfId = "originals" | "av" | "resources";

const AV: string[] = ["audio", "video"];

/** Each shelf: its tab's name, its page, and the request that counts it. */
const SHELVES: Record<ShelfId, { name: string; path: string; workspace: string; ask: (s: FindState) => FindState }> = {
  originals: {
    name: "Library",
    path: "/originals",
    workspace: "originals",
    ask: (s) => lockAxis(s, "kind", KIND_ORDER.filter((k) => !AV.includes(k))),
  },
  av: { name: "Media", path: "/av", workspace: "originals", ask: (s) => lockAxis(s, "kind", AV) },
  resources: { name: "Student Materials", path: "/resources", workspace: "resources", ask: (s) => s },
};

/**
 * **The same words, on the other two shelves** (16 Nov 2026, UX audit FD1 and
 * FD5).
 *
 * Library, Media and Student Materials each search only themselves, and
 * nothing said the others held anything: अनुभव typed on Library found a few
 * documents and no hint of the talks on Media or the notes on Student
 * Materials. And when a shelf found nothing, the one way out was the book
 * search, which signed out is two passages and a sign-in wall.
 *
 * Now every search ends with one line counting the same words on the other
 * shelves, each a link that carries them across. Only the words travel — the
 * filters belong to the shelf they were set on. Public, so it is the same for
 * everyone; a shelf that fails to answer is simply left out.
 */
export async function OtherShelves({ q, here }: { q: string; here: ShelfId }) {
  if (!q.trim()) return null;
  const words: FindState = { ...EMPTY_FIND, q };
  const others = (Object.keys(SHELVES) as ShelfId[]).filter((id) => id !== here);
  const counts = await Promise.all(
    others.map((id) =>
      findLibrary({ workspace: SHELVES[id].workspace, state: SHELVES[id].ask(words), limit: 1 })
        .then((r) => ({ id, count: r.count }))
        .catch(() => ({ id, count: 0 }))
    )
  );
  const found = counts.filter((c) => c.count > 0);
  if (found.length === 0) return null;

  return (
    <p className="mt-4 text-sm text-ink-soft">
      Also:{" "}
      {found.map((c, i) => (
        <span key={c.id}>
          {i > 0 && " · "}
          <Link
            href={findHref(SHELVES[c.id].path, words)}
            className="font-semibold underline underline-offset-2"
            style={{ color: "var(--ws-ink)" }}
          >
            {c.count} in {SHELVES[c.id].name}
          </Link>
        </span>
      ))}
    </p>
  );
}
