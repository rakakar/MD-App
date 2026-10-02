import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PdfCard } from "@/components/library/PdfCard";
import { BackIcon, ChevronRight } from "@/components/shell/icons";
import { KindTile, PageContainer } from "@/components/ui";
import { ApiError, getNode } from "@/lib/api";
import { journeyDocumentHref, journeyFolderHref } from "@/lib/routes";
import { contentLang } from "@/lib/script";

export const revalidate = 900;
export const dynamicParams = true;

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
 * **PDFs only, and one level of folders.** That is all a stage's reading is.
 * The library's full browser — find, filters, the player for recordings, the
 * gallery — is the library's, and a reader who wants it has the Resources
 * workspace for it. A file that has a text edition is drawn as a plain PDF row
 * for the same reason: the text reader's way back is the library.
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
  const folders = node.children.filter((c) => c.child_count + c.item_count > 0);
  const name = contentLang(node.name);

  return (
    <PageContainer>
      <Link
        href="/me/path"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-rule bg-card pe-3.5 ps-2.5 text-sm font-semibold text-ink transition-colors active:bg-ink/[.04]"
      >
        <BackIcon className="h-4 w-4 shrink-0" />
        The full path
      </Link>

      <h1
        lang={name.lang}
        className={`${name.className} mt-4 font-display text-2xl font-medium`}
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
                  className="flex min-h-11 items-center gap-3 rounded-card border border-rule bg-card p-2.5 transition-shadow hover:shadow-md"
                >
                  <KindTile kind="folder" size="sm" />
                  <span className="min-w-0 flex-1">
                    <span
                      lang={lang.lang}
                      className={`${lang.className} block truncate text-sm font-semibold`}
                    >
                      {c.name}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pdfs.length > 0 ? (
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
      ) : (
        folders.length === 0 && (
          <p className="mt-6 text-sm leading-relaxed text-ink-soft">
            There are no PDFs in this folder yet.
          </p>
        )
      )}
    </PageContainer>
  );
}
