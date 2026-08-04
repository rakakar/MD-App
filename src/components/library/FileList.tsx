import { AlbumAudio } from "@/components/library/AlbumAudio";
import { BreadcrumbLine } from "@/components/library/NodeCard";
import { ImageGallery } from "@/components/library/ImageGallery";
import { PdfView } from "@/components/library/PdfView";
import { ProvenanceBadge } from "@/components/library/ProvenanceBadge";
import { VideoView } from "@/components/library/VideoView";
import { KIND_LABEL, KIND_ORDER, fileFacts } from "@/components/library/format";
import { DownloadIcon, ExternalLinkIcon } from "@/components/shell/icons";
import { contentLang } from "@/lib/script";
import type { FileKind, LibraryFile, LocatedFile } from "@/lib/types";

/**
 * A folder's files, each kind served as the thing it is (contract §13.5):
 * audio through the app's own player in album mode, video embedded, PDFs in
 * the in-app viewer, images full screen with pinch-zoom, a bare link opened
 * out, anything else handed over.
 *
 * Cross-posted files are mixed in rather than listed apart, because that is
 * what the contract asks for: a `linked_item` opens and plays **in place**,
 * exactly like a native file (§13.6). What marks it is its breadcrumb — it
 * says where it really lives, which is what stops it reading as a duplicate.
 */
export function FileList({
  files,
  linked = [],
  albumTitle,
  coverUrl = null,
}: {
  files: LibraryFile[];
  linked?: LocatedFile[];
  /** the folder's name — what the lock screen calls the album */
  albumTitle?: string;
  coverUrl?: string | null;
}) {
  const all: (LibraryFile | LocatedFile)[] = [...files, ...linked];
  const groups = KIND_ORDER.map((kind) => ({
    kind,
    files: all.filter((f) => f.kind === kind),
  })).filter((g) => g.files.length > 0);

  if (groups.length === 0) return null;

  return (
    <>
      {groups.map(({ kind, files: kindFiles }) => (
        <section key={kind} className="mt-7">
          {/* Only labelled when there is more than one kind to tell apart — a
              heading over the only thing on the page is noise. */}
          {groups.length > 1 && (
            <h2
              lang="hi"
              className="hi mb-3 text-[11px] font-bold uppercase tracking-[0.09em] text-ink-soft"
            >
              {KIND_LABEL[kind]} · {kindFiles.length}
            </h2>
          )}
          <KindGroup
            kind={kind}
            files={kindFiles}
            albumTitle={albumTitle}
            coverUrl={coverUrl}
          />
        </section>
      ))}
    </>
  );
}

function KindGroup({
  kind,
  files,
  albumTitle,
  coverUrl,
}: {
  kind: FileKind;
  files: (LibraryFile | LocatedFile)[];
  albumTitle?: string;
  coverUrl: string | null;
}) {
  if (kind === "audio") {
    return <AlbumAudio items={files} albumTitle={albumTitle} coverUrl={coverUrl} />;
  }

  if (kind === "image") return <ImageGallery items={files} />;

  if (kind === "video") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {files.map((file) => (
          <div key={file.id}>
            <VideoView file={file} />
            <Located file={file} />
          </div>
        ))}
      </div>
    );
  }

  if (kind === "pdf") {
    return (
      <ul className="flex flex-col gap-3">
        {files.map((file) => (
          <li key={file.id} className="rounded-2xl border border-rule bg-white p-4">
            <FileHeading file={file} />
            <div className="mt-3">
              <PdfView url={file.url} title={file.title} />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  // `link` and `other`. Both are handed over rather than rendered, and the
  // difference is only what happens next: a link opens where it lives, a file
  // downloads. `url` is always present on a served file, so neither is dead.
  const opensOut = kind === "link";
  return (
    <ul className="divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-white">
      {files.map((file) => (
        <li key={file.id}>
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            {...(opensOut ? {} : { download: true })}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[.03]"
          >
            <span className="min-w-0 flex-1">
              <FileHeading file={file} />
            </span>
            <span
              className="shrink-0 self-center"
              style={{ color: "var(--ws-ink)" }}
              aria-label={opensOut ? "Open" : "Download"}
            >
              {opensOut ? <ExternalLinkIcon /> : <DownloadIcon />}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** a file's title, its facts, and whose word it is */
function FileHeading({ file }: { file: LibraryFile | LocatedFile }) {
  return (
    <>
      <Located file={file} />
      <span
        {...contentLang(file.title)}
        className={`${contentLang(file.title).className} block text-[15px] font-medium leading-snug`}
      >
        {file.title}
      </span>
      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
        <span>{fileFacts(file)}</span>
        {/* Already the effective provenance — the file's own override, else
            the one it inherits from its branch — so it is rendered, never
            recomputed. */}
        <ProvenanceBadge provenance={file.provenance} />
      </span>
      {file.description && (
        <span
          {...contentLang(file.description)}
          className={`${contentLang(file.description).className} mt-1 block text-xs text-ink-soft`}
        >
          {file.description}
        </span>
      )}
    </>
  );
}

/** where a cross-posted file really lives; nothing at all for a native one */
function Located({ file }: { file: LibraryFile | LocatedFile }) {
  if (!("breadcrumb" in file) || file.breadcrumb.length === 0) return null;
  return <BreadcrumbLine steps={file.breadcrumb} />;
}
