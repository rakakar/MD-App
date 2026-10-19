"use client";

import { HeadphonesIcon, TrashIcon } from "@/components/shell/icons";
import { formatBytes, type SavedAudio } from "@/lib/audioCache";
import type { DownloadRecord } from "@/lib/idb";
import { contentLang } from "@/lib/script";
import { CARD } from "./parts";

/**
 * What is saved on this device, and what removing it gives back.
 *
 * Audio is listed apart from the books, and per chapter, because it is a
 * different order of size: a saved chapter is tens of megabytes where a whole
 * downloaded book's text is a few. A reader who is short of space needs to see
 * which chapters, and how much each one costs.
 */
export function DownloadsCard({
  desktop,
  books,
  bookBytes,
  audio,
  quota,
  onRemoveBook,
  onRemoveAudio,
  onRemoveAllAudio,
}: {
  desktop: boolean;
  books: DownloadRecord[];
  bookBytes: Record<string, number>;
  audio: SavedAudio[];
  /** what the browser says this site may store, when it says */
  quota: number | null;
  onRemoveBook: (code: string) => void;
  onRemoveAudio: (url: string) => void;
  onRemoveAllAudio: () => void;
}) {
  const booksTotal = books.reduce((n, b) => n + (bookBytes[b.code] ?? 0), 0);
  const audioTotal = audio.reduce((n, a) => n + a.bytes, 0);
  const pad = desktop ? "px-7" : "px-5";

  const bookRows = books.map((b) => {
    const { lang, className } = contentLang(b.title_hi);
    const size = bookBytes[b.code];
    return (
      <Row
        key={b.code}
        desktop={desktop}
        thumb={<span aria-hidden className="block h-14 w-11 shrink-0 rounded-md border border-rule bg-inset" />}
        title={b.title_hi}
        lang={lang}
        titleClass={className}
        meta={`${b.chapter_count} chapters${size ? ` · ${formatBytes(size)}` : ""}`}
        onRemove={() => onRemoveBook(b.code)}
      />
    );
  });

  const audioRows = audio.map((a) => (
    <Row
      key={a.url}
      desktop={desktop}
      thumb={<AudioGlyph />}
      title={a.chapter_title}
      lang="hi"
      titleClass="hi"
      meta={`${a.book_title} · ${a.voice_label} · ${formatBytes(a.bytes)}`}
      onRemove={() => onRemoveAudio(a.url)}
    />
  ));

  const audioEmpty = (
    <div className="flex items-center gap-4 py-4">
      <AudioGlyph />
      <p className="text-sm text-ink-soft">
        {desktop
          ? "No chapters saved for offline listening. Open a chapter's audio mode and tap the download size."
          : "No audio saved. Open a chapter's audio mode and tap the download size."}
      </p>
    </div>
  );

  const booksEmpty = (
    <p className="py-4 text-sm text-ink-soft">
      No books downloaded. Use “Download for offline” on any book page.
    </p>
  );

  if (!desktop) {
    return (
      <div className={`${CARD} ${pad}`}>
        <ul className="divide-y divide-rule">
          {books.length ? bookRows : <li>{booksEmpty}</li>}
        </ul>
        <div className="border-t border-rule">
          {audio.length ? (
            <ul className="divide-y divide-rule">{audioRows}</ul>
          ) : (
            audioEmpty
          )}
        </div>
      </div>
    );
  }

  const used = booksTotal + audioTotal;
  // Against what the browser will let this site keep. A sliver stays drawn
  // for anything saved at all: 30 MB of a 10 GB allowance is a true 0.3%, and
  // a bar that looks empty says nothing is saved.
  const share = (n: number) =>
    quota && used ? `${Math.max((n / quota) * 100, n ? 1.5 : 0)}%` : "0%";

  return (
    <div className={CARD}>
      <div className={`${pad} py-6`}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-title text-ink">On this device</p>
          <p className="text-sm text-ink-soft">{used ? `${formatBytes(used)} used` : "Nothing saved"}</p>
        </div>
        <div
          className="mt-4 flex h-2 overflow-hidden rounded-full bg-inset"
          role="img"
          aria-label={`${formatBytes(booksTotal)} of books and ${formatBytes(audioTotal)} of audio${
            quota ? `, of ${formatBytes(quota)} this browser allows` : ""
          }`}
        >
          <span className="h-full" style={{ width: share(booksTotal), background: "var(--ws-color)" }} />
          <span className="h-full bg-(--ws-color)/45" style={{ width: share(audioTotal) }} />
        </div>
        <div aria-hidden className="mt-3 flex gap-5 text-sm text-ink-soft">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--ws-color)" }} />
            Books
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-(--ws-color)/45" />
            Audio
          </span>
        </div>
      </div>

      <div className={`border-t border-rule ${pad} pt-5`}>
        <p className="text-sm font-medium text-ink">Books</p>
        <ul className="mt-1">{books.length ? bookRows : <li>{booksEmpty}</li>}</ul>
      </div>
      <div className={`${pad} pb-3`}>
        <div className="flex items-center justify-between gap-3 border-t border-rule pt-5">
          <p className="text-sm font-medium text-ink">Audio</p>
          {audio.length > 1 && (
            <button
              type="button"
              onClick={onRemoveAllAudio}
              className="inline-flex min-h-11 items-center text-sm font-medium text-ink-soft hover:text-ink"
            >
              Remove all
            </button>
          )}
        </div>
        {audio.length ? <ul className="mt-1">{audioRows}</ul> : audioEmpty}
      </div>
    </div>
  );
}

function AudioGlyph() {
  return (
    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-inset text-ink-soft">
      <HeadphonesIcon className="h-4.5 w-4.5" />
    </span>
  );
}

function Row({
  desktop,
  thumb,
  title,
  lang,
  titleClass,
  meta,
  onRemove,
}: {
  desktop: boolean;
  thumb: React.ReactNode;
  title: string;
  lang: string;
  titleClass: string;
  meta: string;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-4 py-3">
      {thumb}
      <div className="min-w-0 flex-1">
        <p lang={lang} className={`${titleClass} truncate text-title font-semibold text-ink`}>
          {title}
        </p>
        <p className="truncate text-sm text-ink-soft">{meta}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={desktop ? undefined : `Remove ${title}`}
        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 text-ink-soft transition-colors hover:text-ink ${
          desktop ? "px-3 text-sm font-medium" : "min-w-11"
        }`}
      >
        <TrashIcon className="h-4.5 w-4.5" />
        {desktop && (
          <>
            Remove<span className="sr-only"> {title}</span>
          </>
        )}
      </button>
    </li>
  );
}
