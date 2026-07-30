import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemGroups } from "@/components/resources/ItemGroups";
import { EmptyState, PageContainer } from "@/components/ui";
import { getFolders, getResourceItems } from "@/lib/api";
import type { Folder, ResourceItem } from "@/lib/types";

export const revalidate = 900;

// Folders may not nest deeper than this on the BE, so anything longer is a
// hand-typed URL, not a real path.
const MAX_DEPTH = 10;

export const metadata: Metadata = {
  title: "सभी फ़ाइलें · Resources archive",
  description: "The resources library as it is filed — folder by folder.",
  // The archivist's view is a second address for material the collection pages
  // already carry, so it stays out of the index rather than competing with them.
  robots: { index: false, follow: true },
};

/**
 * The folder tree — **the archivist's fallback, never the default view**
 * (contract §13.7, PRD v2 §5.6.2).
 *
 * The tree mirrors how the library was filed on pCloud, which is a librarian's
 * structure and not a seeker's: nobody arrives thinking "which folder is it
 * in". Browsing proper is doors → facet chips → collections, one level up from
 * here; this exists so the content team and anyone hunting a specific file can
 * still walk the shelves.
 *
 * The whole ancestry rides in the URL (`/resources/files/12/45`) because a
 * folder only knows its own ancestors' names, not the ids needed to link back
 * to them — and because a path is worth sharing.
 */
export default async function ResourceFilesPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  const segments = path ?? [];
  if (segments.length > MAX_DEPTH) notFound();

  const ids = segments.map((s) => Number(s));
  if (ids.some((n) => !Number.isSafeInteger(n) || n <= 0)) notFound();

  const currentId = ids.at(-1);

  // Two folder listings answer everything: the parent's, which contains this
  // folder (its name and its ancestors), and this folder's own, which is the
  // level being shown. Both are ISR-cached and shared with the pages either
  // side of this one, so walking the tree re-fetches almost nothing.
  const [siblings, children, items] = await Promise.all([
    currentId === undefined
      ? Promise.resolve([] as Folder[])
      : getFolders(ids.at(-2)).catch(() => [] as Folder[]),
    getFolders(currentId).catch(() => [] as Folder[]),
    currentId === undefined
      ? Promise.resolve([] as ResourceItem[])
      : getResourceItems({ folder: currentId }).catch(() => [] as ResourceItem[]),
  ]);

  let current: Folder | undefined;
  if (currentId !== undefined) {
    current = siblings.find((f) => f.id === currentId);
    // The BE's own breadcrumb is the authority on ancestry — if the ids in the
    // URL disagree with it, the path was invented rather than walked.
    const ancestry = current?.breadcrumb ?? [];
    if (
      !current ||
      ancestry.length !== ids.length - 1 ||
      ancestry.some((a, i) => a.id !== ids[i])
    ) {
      notFound();
    }
  }

  const trail = (current?.breadcrumb ?? []).map((a, i) => ({
    name: a.name,
    href: `/resources/files/${ids.slice(0, i + 1).join("/")}`,
  }));

  return (
    <PageContainer>
      <nav aria-label="Folder trail" className="text-xs text-ink-soft">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <li>
            <Link href="/resources" className="font-medium hover:underline">
              <span lang="hi" className="hi">संसाधन</span>
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden>/</span>
            {current ? (
              <Link href="/resources/files" className="font-medium hover:underline">
                <span lang="hi" className="hi">सभी फ़ाइलें</span>
              </Link>
            ) : (
              <span lang="hi" className="hi font-medium">सभी फ़ाइलें</span>
            )}
          </li>
          {trail.map((a) => (
            <li key={a.href} className="flex items-center gap-1.5">
              <span aria-hidden>/</span>
              <Link href={a.href} className="font-medium hover:underline">
                <span lang="hi" className="hi">{a.name}</span>
              </Link>
            </li>
          ))}
          {current && (
            <li className="flex items-center gap-1.5" aria-current="page">
              <span aria-hidden>/</span>
              <span lang="hi" className="hi font-medium text-ink">{current.name}</span>
            </li>
          )}
        </ol>
      </nav>

      <h1 lang="hi" className="hi mt-2 text-xl font-bold">
        {current ? current.name : "सभी फ़ाइलें"}
      </h1>
      <p lang="hi" className="hi mt-1 text-sm text-ink-soft">
        {current?.description ||
          "यह संग्रह जैसा रखा गया है, वैसा। खोजने के लिए ऊपर के दरवाज़ों से शुरू करें।"}
      </p>

      {children.length > 0 && (
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {children.map((f) => (
            <li key={f.id}>
              <Link
                href={`/resources/files/${[...ids, f.id].join("/")}`}
                className="flex items-center gap-3 rounded-2xl border border-rule bg-white p-4 transition-shadow hover:shadow-md"
              >
                <span style={{ color: "var(--ws-ink)" }} aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                  >
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span lang="hi" className="hi block text-[15px] font-medium leading-snug">
                    {f.name}
                  </span>
                  <span lang="hi" className="hi mt-0.5 block text-xs text-ink-soft">
                    {countLabel(f)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ItemGroups items={items} />

      {/*
        Only reachable at the root. A folder with nothing published beneath it
        is never returned in the first place, so there is no empty branch to
        land in — this is the "the library hasn't started arriving" state.
      */}
      {children.length === 0 && items.length === 0 && (
        <div className="mt-5">
          <EmptyState
            title="संसाधन अभी आ रहे हैं"
            hint="Materials appear here as they are published."
          />
        </div>
      )}
    </PageContainer>
  );
}

/**
 * What sits *directly* inside.
 *
 * `item_count` is published-only, so it is safe to print. `folder_count` is
 * not: it counts every child folder, including the ones the list itself
 * withholds because nothing is published beneath them yet. Printing it would
 * promise four folders and then show two, so subfolders are announced without
 * a number until the migration is done.
 */
function countLabel(f: Folder): string {
  const parts: string[] = [];
  if (f.folder_count > 0) parts.push("उप-फ़ोल्डर");
  if (f.item_count > 0) parts.push(`${f.item_count} फ़ाइलें`);
  return parts.join(" · ");
}
