"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import { CheckIcon, ChevronDown, HeadphonesIcon, TrashIcon } from "@/components/shell/icons";
import { BackButton } from "@/components/ui/BackButton";
import { CountedSegmented } from "@/components/ui/Segmented";
import { KindTile } from "@/components/ui/KindTile";
import { formatBytes, type SavedAudio } from "@/lib/audioCache";
import { bookHue, coverGradient } from "@/lib/bookHue";
import { readerPath } from "@/lib/pdfCache";
import { contentLang } from "@/lib/script";
import { useDownloads } from "@/lib/useDownloads";

type Filter = "all" | "books" | "pdfs" | "audio";
type Sort = "recent" | "size";

const CARD = "rounded-card border border-rule bg-card";
const EYEBROW = "text-xs font-bold uppercase tracking-[0.09em] text-ink-soft";
/** an audio group shows this many chapters before "Show more" */
const GROUP_PREVIEW = 3;

/**
 * Everything saved on this device, in one place (designer's mock, 31 Oct 2026).
 *
 * It outgrew the Settings card it started as: a reader who keeps a few books,
 * their chapters' audio and a shelf of library PDFs has a list too long for a
 * card between Notifications and Privacy. Profile links here with a summary;
 * Settings keeps one Storage row.
 *
 * Audio is grouped under its book, because fifty chapters in one flat list
 * cannot be scanned, and audio is where the space goes — the storage bar at the
 * top says so before the reader has to work it out.
 */
export function DownloadsScreen() {
  const d = useDownloads();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [quota, setQuota] = useState<number | null>(null);

  useEffect(() => {
    void navigator.storage?.estimate?.().then((e) =>
      setQuota(e.quota && e.usage !== undefined ? e.quota - e.usage : null)
    );
  }, [d.used]);

  const books = useMemo(() => {
    const rows = [...d.books];
    if (sort === "size") rows.sort((a, b) => (d.bookBytes[b.code] ?? 0) - (d.bookBytes[a.code] ?? 0));
    return rows;
  }, [d.books, d.bookBytes, sort]);

  const pdfs = useMemo(() => {
    const rows = [...d.pdfs];
    if (sort === "size") rows.sort((a, b) => b.bytes - a.bytes);
    return rows;
  }, [d.pdfs, sort]);

  /** chapters grouped under their book, chapters in book order */
  const groups = useMemo(() => {
    const by = new Map<string, { code: string; title: string; items: SavedAudio[]; bytes: number; latest: number }>();
    for (const a of d.audio) {
      const g = by.get(a.book_code) ?? { code: a.book_code, title: a.book_title, items: [], bytes: 0, latest: 0 };
      g.items.push(a);
      g.bytes += a.bytes;
      g.latest = Math.max(g.latest, a.saved_at);
      by.set(a.book_code, g);
    }
    const out = [...by.values()];
    for (const g of out) g.items.sort((a, b) => a.chapter_number - b.chapter_number);
    out.sort((a, b) => (sort === "size" ? b.bytes - a.bytes : b.latest - a.latest));
    return out;
  }, [d.audio, sort]);

  const audioByBook = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of d.audio) m[a.book_code] = (m[a.book_code] ?? 0) + 1;
    return m;
  }, [d.audio]);

  const covers = useMemo(
    () => Object.fromEntries(d.books.map((b) => [b.code, b.cover_image ?? null])),
    [d.books]
  );

  // In All, a kind with nothing saved is left out rather than drawn as a hint;
  // its own tab still says how to save one.
  const counts: Record<Exclude<Filter, "all">, number> = {
    books: d.books.length,
    pdfs: d.pdfs.length,
    audio: d.audio.length,
  };
  const show = (f: Exclude<Filter, "all">) => filter === f || (filter === "all" && counts[f] > 0);
  const nothing = d.books.length + d.pdfs.length + d.audio.length === 0;

  // ---- selecting ----
  const toggle = (key: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const pickedBytes = [...picked].reduce((n, key) => {
    const [kind, id] = splitKey(key);
    if (kind === "book") return n + (d.bookBytes[id] ?? 0);
    if (kind === "pdf") return n + (d.pdfs.find((p) => String(p.id) === id)?.bytes ?? 0);
    return n + (d.audio.find((a) => a.url === id)?.bytes ?? 0);
  }, 0);
  const removePicked = async () => {
    if (!window.confirm(`Remove ${picked.size} ${picked.size === 1 ? "item" : "items"} from this device?`)) return;
    for (const key of picked) {
      const [kind, id] = splitKey(key);
      if (kind === "book") await d.removeBook(id);
      else if (kind === "pdf") await d.removePdf(Number(id));
      else await d.removeAudio(id);
    }
    setPicked(new Set());
    setSelecting(false);
  };
  const endSelect = () => {
    setSelecting(false);
    setPicked(new Set());
  };

  const check = (key: string, title: string) =>
    selecting ? (
      <button
        type="button"
        role="checkbox"
        aria-checked={picked.has(key)}
        aria-label={`Select ${title}`}
        onClick={() => toggle(key)}
        className="relative z-10 flex h-11 w-8 shrink-0 items-center justify-center"
      >
        <span
          className="flex h-5 w-5 items-center justify-center rounded-md border"
          style={
            picked.has(key)
              ? { background: "var(--ws-color)", borderColor: "var(--ws-color)", color: "white" }
              : { borderColor: "var(--color-ink-soft)" }
          }
        >
          {picked.has(key) && <CheckIcon className="h-3.5 w-3.5" />}
        </span>
      </button>
    ) : null;

  const trash = (label: string, onRemove: () => void) =>
    selecting ? null : (
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <TrashIcon className="h-4.5 w-4.5" />
      </button>
    );

  return (
    <AppAccent>
      <div className="min-h-full bg-canvas lg:bg-surface">
        <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-3 sm:px-6 lg:px-10 lg:pt-10">
          <div className="flex items-center gap-2 lg:mb-6">
            <BackButton fallback="/profile" />
            <h1 className="flex-1 font-display text-2xl font-medium lg:text-3xl">Downloads</h1>
            {!nothing && (
              <button
                type="button"
                onClick={() => (selecting ? endSelect() : setSelecting(true))}
                className="inline-flex min-h-11 items-center px-1 text-base font-semibold text-accent-ink"
              >
                {selecting ? "Done" : "Select"}
              </button>
            )}
          </div>

          {/* What the space is going on — before any list. */}
          <section className={`${CARD} mt-4 px-5 py-5 lg:mt-0 lg:px-7`} aria-label="Storage">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-2xl font-semibold tabular-nums text-ink">
                {d.loaded ? (d.used ? formatBytes(d.used) : "Nothing saved") : "…"}
              </p>
              <p className="text-sm text-ink-soft">
                {quota ? `${formatBytes(quota)} free for the app` : "on this device"}
              </p>
            </div>
            <div
              className="mt-4 flex h-2 overflow-hidden rounded-full bg-inset"
              role="img"
              aria-label={`${formatBytes(d.booksBytes)} of books, ${formatBytes(d.pdfBytes)} of PDFs and ${formatBytes(d.audioBytes)} of audio`}
            >
              {d.used > 0 && (
                <>
                  <span style={{ width: share(d.booksBytes, d.used), background: "var(--ws-color)" }} />
                  <span style={{ width: share(d.pdfBytes, d.used), background: "var(--color-kind-doc-ink)" }} />
                  <span className="bg-(--ws-color)/45" style={{ width: share(d.audioBytes, d.used) }} />
                </>
              )}
            </div>
            <div aria-hidden className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
              <Legend swatch={{ background: "var(--ws-color)" }} label="Books" bytes={d.booksBytes} />
              <Legend swatch={{ background: "var(--color-kind-doc-ink)" }} label="PDFs" bytes={d.pdfBytes} />
              <Legend swatchClass="bg-(--ws-color)/45" label="Audio" bytes={d.audioBytes} />
            </div>
          </section>

          {nothing && d.loaded ? (
            <Empty />
          ) : (
            <>
              <div className="mt-5">
                <CountedSegmented<Filter>
                    label="Show"
                    value={filter}
                    onChange={setFilter}
                    segments={[
                      { value: "all", label: "All" },
                      { value: "books", label: "Books", count: d.books.length },
                      { value: "pdfs", label: "PDFs", count: d.pdfs.length },
                      { value: "audio", label: "Audio", count: d.audio.length },
                    ]}
                  />
              </div>
              <div className="mt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSort((s) => (s === "recent" ? "size" : "recent"))}
                  className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
                >
                  Sort: {sort === "recent" ? "Newest" : "Largest"}
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {show("books") && (
                <Section title="Books">
                  {books.length ? (
                    <ul className={`${CARD} divide-y divide-rule`}>
                      {books.map((b) => {
                        const size = d.bookBytes[b.code];
                        const heard = audioByBook[b.code];
                        return (
                          <Row
                            key={b.code}
                            check={check(`book:${b.code}`, b.title_hi)}
                            thumb={<Cover code={b.code} title={b.title_hi} src={b.cover_image ?? null} />}
                            title={b.title_hi}
                            meta={
                              <>
                                {`${b.chapter_count} chapters${size ? ` · ${formatBytes(size)}` : ""}`}
                                {heard ? <span style={{ color: "var(--ws-ink)" }}>{` · ${heard} audio`}</span> : null}
                              </>
                            }
                            href={selecting ? undefined : `/books/${encodeURIComponent(b.code)}`}
                            onTap={selecting ? () => toggle(`book:${b.code}`) : undefined}
                            end={trash(b.title_hi, () => void d.removeBook(b.code))}
                          />
                        );
                      })}
                    </ul>
                  ) : (
                    <Hint>No books downloaded. Use “Download for offline” on any book page.</Hint>
                  )}
                </Section>
              )}

              {show("pdfs") && (
                <Section title="PDFs">
                  {pdfs.length ? (
                    <ul className={`${CARD} divide-y divide-rule`}>
                      {pdfs.map((p) => (
                        <Row
                          key={p.id}
                          check={check(`pdf:${p.id}`, p.title)}
                          thumb={<KindTile kind="pdf" cover={p.thumbnail_url} size="md" />}
                          title={p.title}
                          meta={[p.folder, p.page_count ? `${p.page_count} pages` : "", formatBytes(p.bytes)]
                            .filter(Boolean)
                            .join(" · ")}
                          href={selecting ? undefined : readerPath(p.node, p.id)}
                          onTap={selecting ? () => toggle(`pdf:${p.id}`) : undefined}
                          end={trash(p.title, () => void d.removePdf(p.id))}
                        />
                      ))}
                    </ul>
                  ) : (
                    <Hint>No PDFs saved. In the Library, open a PDF’s ⋯ menu and choose Save offline.</Hint>
                  )}
                </Section>
              )}

              {show("audio") && (
                <Section
                  title="Audio"
                  action={
                    d.audio.length > 1 && !selecting ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Remove all saved audio from this device?")) void d.removeAllAudio();
                        }}
                        className="inline-flex min-h-11 items-center text-sm font-semibold text-accent-ink"
                      >
                        Remove all
                      </button>
                    ) : undefined
                  }
                >
                  {groups.length ? (
                    <div className="flex flex-col gap-3">
                      {groups.map((g, i) => (
                        <AudioGroup
                          key={g.code}
                          code={g.code}
                          title={g.title}
                          cover={covers[g.code] ?? null}
                          items={g.items}
                          bytes={g.bytes}
                          initiallyOpen={i === 0}
                          check={check}
                          selecting={selecting}
                          onToggle={toggle}
                          trash={trash}
                          onRemove={(url) => void d.removeAudio(url)}
                        />
                      ))}
                    </div>
                  ) : (
                    <Hint icon>No audio saved. Open a chapter’s audio mode and tap the download size.</Hint>
                  )}
                </Section>
              )}
            </>
          )}
        </div>
      </div>

      {selecting && picked.size > 0 && (
        <div
          className="fixed inset-x-0 z-30 mx-auto flex max-w-md items-center gap-3 px-4"
          style={{ bottom: "calc(var(--bottom-nav-h, 4.5rem) + 0.75rem + env(safe-area-inset-bottom))" }}
        >
          <div className="flex w-full items-center gap-3 rounded-card bg-ink p-2 ps-4 text-sm text-card shadow-lg">
            <span className="flex-1 tabular-nums">
              {picked.size} selected{pickedBytes ? ` · ${formatBytes(pickedBytes)}` : ""}
            </span>
            <button
              type="button"
              onClick={() => void removePicked()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-control bg-card/15 px-4 font-semibold hover:bg-card/25"
            >
              <TrashIcon className="h-4 w-4" />
              Remove
            </button>
          </div>
        </div>
      )}
    </AppAccent>
  );
}

function splitKey(key: string): [string, string] {
  const i = key.indexOf(":");
  return [key.slice(0, i), key.slice(i + 1)];
}

/** A sliver stays drawn for anything saved at all — a bar that looks empty says nothing is. */
function share(n: number, total: number): string {
  return n ? `${Math.max((n / total) * 100, 1.5)}%` : "0%";
}

function Legend({
  swatch,
  swatchClass = "",
  label,
  bytes,
}: {
  swatch?: React.CSSProperties;
  swatchClass?: string;
  label: string;
  bytes: number;
}) {
  return (
    <span className="flex items-center gap-2 tabular-nums">
      <span className={`h-2.5 w-2.5 rounded-sm ${swatchClass}`} style={swatch} />
      {label} {bytes ? formatBytes(bytes) : "—"}
    </span>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4">
      <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
        <h2 className={EYEBROW}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Hint({ children, icon = false }: { children: React.ReactNode; icon?: boolean }) {
  return (
    <div className={`${CARD} flex items-center gap-4 px-5 py-4`}>
      {icon && <AudioGlyph />}
      <p className="text-sm text-ink-soft">{children}</p>
    </div>
  );
}

function Empty() {
  return (
    <div className={`${CARD} mt-6 px-6 py-8 text-center`}>
      <p className="text-title font-semibold text-ink">Keep reading with no connection</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
        Download a book from its page, save a chapter’s audio from audio mode, or save a library PDF
        from its ⋯ menu. Everything you save shows up here.
      </p>
      <Link
        href="/books"
        className="mt-5 inline-flex min-h-11 items-center rounded-control border border-rule px-5 text-sm font-semibold text-accent-ink hover:bg-inset"
      >
        Browse books
      </Link>
    </div>
  );
}

function Row({
  check,
  thumb,
  title,
  meta,
  href,
  onTap,
  end,
}: {
  check: React.ReactNode;
  thumb: React.ReactNode;
  title: string;
  meta: React.ReactNode;
  href?: string;
  onTap?: () => void;
  end: React.ReactNode;
}) {
  const t = contentLang(title);
  const name = (
    <span {...t} className={`${t.className} hi-tight line-clamp-2 block text-base text-ink`}>
      {title}
    </span>
  );
  return (
    <li className="relative flex items-center gap-3 px-4 py-3 sm:px-5">
      {check}
      {thumb}
      <span className="min-w-0 flex-1">
        {href ? (
          <Link href={href} className="after:absolute after:inset-0">
            {name}
          </Link>
        ) : onTap ? (
          <button type="button" onClick={onTap} className="text-start after:absolute after:inset-0">
            {name}
          </button>
        ) : (
          name
        )}
        <span className="mt-0.5 block text-sm text-ink-soft tabular-nums">{meta}</span>
      </span>
      {end}
    </li>
  );
}

function Cover({
  code,
  title,
  src,
  small = false,
}: {
  code: string;
  title: string;
  src: string | null;
  small?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      aria-hidden
      className={`${small ? "h-9 w-[26px] rounded-md" : "h-14 w-[41px] rounded-control"} relative flex shrink-0 items-center justify-center overflow-hidden border border-rule`}
      style={{ background: coverGradient(bookHue(code)) }}
    >
      {src && !broken ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span lang="hi" className={`hi leading-none text-white/90 ${small ? "text-sm" : "text-lg"}`}>
          {title?.[0] ?? "ग्र"}
        </span>
      )}
    </span>
  );
}

function AudioGlyph() {
  return (
    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-inset text-ink-soft">
      <HeadphonesIcon className="h-4.5 w-4.5" />
    </span>
  );
}

function AudioGroup({
  code,
  title,
  cover,
  items,
  bytes,
  initiallyOpen,
  check,
  selecting,
  onToggle,
  trash,
  onRemove,
}: {
  code: string;
  title: string;
  cover: string | null;
  items: SavedAudio[];
  bytes: number;
  initiallyOpen: boolean;
  check: (key: string, title: string) => React.ReactNode;
  selecting: boolean;
  onToggle: (key: string) => void;
  trash: (label: string, onRemove: () => void) => React.ReactNode;
  onRemove: (url: string) => void;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, GROUP_PREVIEW);
  const t = contentLang(title);

  return (
    <div className={CARD}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center gap-3 rounded-card px-4 py-2.5 text-start sm:px-5"
      >
        <Cover code={code} title={title} src={cover} small />
        <span {...t} className={`${t.className} min-w-0 flex-1 truncate text-base font-semibold text-ink`}>
          {title}
        </span>
        <span className="shrink-0 text-sm tabular-nums text-ink-soft">
          {items.length} · {formatBytes(bytes)}
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="divide-y divide-rule border-t border-rule">
          {shown.map((a) => (
            <Row
              key={a.url}
              check={check(`audio:${a.url}`, a.chapter_title)}
              thumb={<AudioGlyph />}
              title={`${a.chapter_number}. ${a.chapter_title}`}
              meta={`${a.voice_label} · ${formatBytes(a.bytes)}`}
              href={selecting ? undefined : `/books/${encodeURIComponent(a.book_code)}/${a.chapter_number}`}
              onTap={selecting ? () => onToggle(`audio:${a.url}`) : undefined}
              end={trash(a.chapter_title, () => onRemove(a.url))}
            />
          ))}
          {items.length > GROUP_PREVIEW && (
            <li>
              <button
                type="button"
                onClick={() => setAll((v) => !v)}
                className="flex min-h-11 w-full items-center justify-center text-sm font-semibold text-accent-ink"
              >
                {all ? "Show fewer" : `Show ${items.length - GROUP_PREVIEW} more`}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
