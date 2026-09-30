import Link from "next/link";
import { DownloadButton } from "@/components/reader/DownloadButton";
import { ResumeButton } from "@/components/reader/ResumeButton";
import { BackIcon } from "@/components/shell/icons";
import { CoverTile } from "@/components/shelf/CoverTile";
import { HERO_PILL, HeroAction, ShareButton } from "@/components/ui";
import type { BookDetail } from "@/lib/types";

/**
 * The book's hero on desktop (Book preview, desktop revision 29 Sep 2026).
 *
 * A band across the whole content area rather than the phone's rounded panel
 * in a 340px rail: cover · title and the book's three dimensions · the actions
 * in a column of their own at the right. Under lg the phone's `CollectionHero`
 * is drawn instead, unchanged.
 */
export function BookHeroDesktop({
  book,
  tone,
  back,
  crumb,
  chips,
  chapterCount,
  firstChapterHref,
  translationsHref,
}: {
  book: BookDetail;
  /** the book's own hue, as on the phone hero */
  tone: string;
  back: { href: string; label: string };
  /** what follows the back pill — the book's genre */
  crumb: string | null;
  chips: string[];
  chapterCount: number;
  firstChapterHref: string | null;
  translationsHref: string | null;
}) {
  // "हिन्दी (Hindi)" → "हिन्दी": the stat is set large, and the gloss in
  // brackets is for a picker, not for a fact about a book.
  const language = book.language_label.replace(/\s*\(.*\)\s*$/, "") || book.language;
  const stats = [
    chapterCount > 0 ? { value: String(chapterCount), label: chapterCount === 1 ? "Chapter" : "Chapters" } : null,
    book.page_count ? { value: String(book.page_count), label: "Pages" } : null,
    language ? { value: language, label: "Language" } : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

  return (
    <section
      className="relative hidden overflow-hidden text-white lg:block"
      style={{
        background: `linear-gradient(120deg, color-mix(in srgb, ${tone} 88%, #fff), ${tone} 55%, color-mix(in srgb, ${tone} 80%, #000))`,
      }}
    >
      {/* The one ornament: a large pale disc behind the actions, as drawn. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-40 h-[34rem] w-[34rem] rounded-full bg-white/6"
      />

      <div className="relative mx-auto max-w-[1088px] px-8 pb-9 pt-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
          <Link
            href={back.href}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-white/25 bg-white/10 pe-3.5 ps-2.5 font-semibold transition-colors hover:bg-white/20"
          >
            <BackIcon className="h-4 w-4" />
            {back.label}
          </Link>
          {crumb && <span className="text-white/75">/ {crumb}</span>}
        </nav>

        <div className="mt-6 flex items-center gap-9">
          <CoverTile book={book} size="hero" eager />

          <div className="min-w-0 flex-1">
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <span
                    key={c}
                    className="rounded-md bg-white/20 px-2 py-1 text-xs font-bold uppercase tracking-[0.06em]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
            {/* Mukta, not the reading face: Tiro has no bold, and a 48px title
                in faux-bold Devanagari smears. */}
            <h1
              lang="hi"
              className="mt-3 text-5xl font-bold leading-tight"
              style={{ fontFamily: "var(--font-devanagari-sans)" }}
            >
              {book.title_hi}
            </h1>
            <p lang="hi" className="hi hi-tight mt-2 text-title text-white/80">
              {book.author}
              {book.translation_of && book.translator && (
                <span className="text-sm">
                  {" "}
                  · Translator: <span className="font-semibold text-white">{book.translator}</span>
                </span>
              )}
            </p>

            {stats.length > 0 && (
              <dl className="mt-5 flex items-stretch">
                {stats.map((s, i) => (
                  <div
                    key={s.label}
                    className={`flex flex-col-reverse ${i > 0 ? "border-l border-white/25 pl-8" : ""} ${
                      i < stats.length - 1 ? "pr-8" : ""
                    }`}
                  >
                    <dt className="mt-1 text-xs text-white/75">{s.label}</dt>
                    <dd
                      className="text-2xl font-semibold leading-none tabular-nums"
                      style={{ fontFamily: "var(--font-devanagari-sans)" }}
                    >
                      {s.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* As wide as the pill row needs, never narrower than Start reading
              wants: three labelled pills do not fit a fixed 260px. */}
          <div className="flex min-w-[16.25rem] shrink-0 flex-col gap-2 self-end">
            <div className="flex">
              {book.is_pdf_only ? (
                <HeroAction href="#pdf" tone={tone}>
                  Read the PDF
                </HeroAction>
              ) : (
                <ResumeButton bookCode={book.code} firstChapterHref={firstChapterHref} />
              )}
            </div>
            <div className="flex gap-2">
              {translationsHref && (
                <Link href={translationsHref} className={HERO_PILL}>
                  Translations
                </Link>
              )}
              {book.translation_of && (
                <Link href={`/books/${encodeURIComponent(book.translation_of)}`} className={HERO_PILL}>
                  Original
                </Link>
              )}
              {/* A PDF-only book has no chapters to keep offline. */}
              {!book.is_pdf_only && <DownloadButton book={book} variant="heroPill" />}
              <ShareButton title={book.title_hi} variant="pill" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
