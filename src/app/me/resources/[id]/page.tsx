import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileList } from "@/components/library/FileList";
import { PdfCard } from "@/components/library/PdfCard";
import { BackIcon, ChevronRight } from "@/components/shell/icons";
import { NavScope } from "@/components/shell/WorkspaceProvider";
import { KindTile, PageContainer } from "@/components/ui";
import { ApiError, getNode } from "@/lib/api";
import { albumName } from "@/lib/albumName";
import { resourceFolderId, stageResources, STAGES } from "@/lib/journey";
import { journeyDocumentHref, journeyFolderHref } from "@/lib/routes";
import { contentLang } from "@/lib/script";

export const revalidate = 900;
export const dynamicParams = true;

/**
 * The folders the full path opens directly — every stage's own resources, and
 * the study guide's folder that /me/path links to (144). A folder at or under
 * one of these is "inside this tree"; the library folders *above* them are
 * not, and a back pill into one would leave the stage for a filing cabinet.
 */
const ENTRY_FOLDERS = new Set<number>([
  144,
  ...STAGES.flatMap((s) => stageResources(s)).flatMap((r) => resourceFolderId(r) ?? []),
]);

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** A 404 is an ordinary answer — an unpublished folder hides its branch (§13.3). */
async function load(raw: string) {
  const id = parseId(raw);
  if (id === null) return null;
  try {
    return await getNode(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const node = await load(id).catch(() => null);
  return { title: node?.name ?? "Resources" };
}

/**
 * **A stage's folder of PDFs, inside My Journey.**
 *
 * The library's own folder page belongs to whichever shelf the folder lives
 * on, so opening a stage's reading from here used to switch the reader to
 * Resources — different colour, different tabs, no way back to the stage. This
 * page shows the same folder under `/me`, which keeps the workspace they were
 * in, and opens each file in the same PDF reader through
 * `journeyDocumentHref`.
 *
 * **The folder's files, and nothing of the library's browser.** PDFs are our
 * own rows, opening in our own route; audio, video and pictures are the
 * library's `FileList`, which plays them through the app's one player and
 * embeds the video where it stands — neither links anywhere, so nothing in
 * here leaves the workspace. The library's find, filters and shelves are the
 * library's, and a reader who wants them has the Resources workspace. A file
 * that has a text edition is drawn as a plain PDF row for the same reason:
 * the text reader's way back is the library.
 */
export default async function JourneyFolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const node = await load(id);
  if (!node) notFound();

  const pdfs = [...node.items, ...node.linked_items].filter((f) => f.kind === "pdf");
  // Everything that is not a PDF, split the way `FileList` wants it.
  const recordings = node.items.filter((f) => f.kind !== "pdf");
  const linkedRecordings = node.linked_items.filter((f) => f.kind !== "pdf");
  const hasOthers = recordings.length + linkedRecordings.length > 0;
  const folders = node.children.filter((c) => c.child_count + c.item_count > 0);
  const name = contentLang(node.name);

  // Back goes up a step where there is a step inside this tree to go to, and
  // to the full path where this folder is the top of it (it used to say "The
  // full path" on every folder, four levels down included). Same shape as
  // `NodeView`'s pill and trail. 15 Nov 2026.
  const start = node.breadcrumb.findIndex((step) => ENTRY_FOLDERS.has(step.id));
  const parent = start >= 0 ? node.breadcrumb.at(-1) : undefined;
  const parentLang = parent ? contentLang(albumName(parent.name)) : null;
  const trail = start >= 0 ? node.breadcrumb.slice(start, -1) : [];

  return (
    <PageContainer>
      {/* Reached from the full path, so the Dashboard tab stays lit. */}
      <NavScope href="/me" />
      <Link
        href={parent ? journeyFolderHref(parent.id) : "/me/path"}
        className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-control border border-rule bg-card pe-3.5 ps-2.5 text-sm font-semibold text-ink transition-colors active:bg-ink/[.04]"
      >
        <BackIcon className="h-4 w-4 shrink-0" />
        {parent ? (
          <span lang={parentLang?.lang} className={`${parentLang?.className ?? ""} truncate`}>
            {albumName(parent.name)}
          </span>
        ) : (
          "The full path"
        )}
      </Link>

      {/* The rest of the way down to here, as a folder's own page draws it
          (`NodeView`): the pill above is the last step, this is the others. */}
      {trail.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          lang="hi"
          className="hi mt-1 flex flex-wrap gap-x-1 text-xs font-semibold text-ink-soft"
        >
          {trail.map((step, i) => (
            <span key={step.id} className="flex items-center gap-x-1">
              {i > 0 && <span aria-hidden>/</span>}
              <Link
                href={journeyFolderHref(step.id)}
                className="inline-flex min-h-11 items-center hover:underline"
              >
                {albumName(step.name)}
              </Link>
            </span>
          ))}
        </nav>
      )}

      <h1
        lang={name.lang}
        className={`${name.className} ${trail.length > 0 ? "" : "mt-4 "}font-display text-2xl font-medium`}
      >
        {node.name}
      </h1>
      {/* Skipped when it only says the title again, which the library's
          managers often leave it doing. */}
      {node.description && node.description.trim() !== node.name.trim() && (
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{node.description}</p>
      )}

      {folders.length > 0 && (
        <ul className="mt-5 flex flex-col gap-1.5">
          {folders.map((c) => {
            const lang = contentLang(c.name);
            return (
              <li key={c.id}>
                <Link
                  href={journeyFolderHref(c.id)}
                  className="flex min-h-11 items-center gap-3 rounded-card border border-rule bg-card p-2.5 transition-shadow hover:shadow-raised"
                >
                  {/* A folder of one kind of recording wears that kind's tile,
                      so a reader can tell the audio from the PDFs before
                      opening either. */}
                  <KindTile kind={c.kinds.length === 1 ? c.kinds[0] : "folder"} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span
                      lang={lang.lang}
                      className={`${lang.className} block truncate text-sm font-semibold`}
                    >
                      {c.name}
                    </span>
                    {c.item_count > 0 && (
                      <span className="mt-0.5 block truncate text-xs text-ink-soft">
                        {c.item_count} {c.item_count === 1 ? "file" : "files"}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pdfs.length > 0 && (
        <ul className="mt-3 divide-y divide-rule">
          {pdfs.map((file) => (
            <li key={file.id}>
              {/* `reading: null` — see the page's header. */}
              <PdfCard
                file={{ ...file, reading: null }}
                folderProvenance={node.provenance}
                readHref={journeyDocumentHref(node.id, file.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {hasOthers && (
        <FileList
          files={recordings}
          linked={linkedRecordings}
          albumTitle={node.name}
          coverUrl={node.cover_url}
          /* The shared portrait of Nagraj ji stands in for a still only where
             the recording is him — the same rule the library's own folder page
             applies. */
          audioArt={node.workspace === "originals" ? "portrait" : "glyph"}
          folderProvenance={node.provenance}
        />
      )}

      {folders.length === 0 && pdfs.length === 0 && !hasOthers && (
        <p className="mt-6 text-sm leading-relaxed text-ink-soft">
          There is nothing in this folder yet.
        </p>
      )}
    </PageContainer>
  );
}
