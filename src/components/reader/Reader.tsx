"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  activeRendition,
  paraAtPosition,
  usePlayer,
} from "@/components/player/PlayerProvider";
import { HeadphonesIcon } from "@/components/shell/icons";
import { track } from "@/lib/analytics";
import { createBookmark, createNote, upsertProgress } from "@/lib/me";
import { citationText, paraAnchorId } from "@/lib/refs";
import {
  addLocalBookmark,
  addLocalNote,
  getGuestStore,
  getPrefs,
  setLocalProgress,
  setPrefs,
  type ReaderTheme,
  type ReadingMode,
} from "@/lib/storage";
import type { ChapterPayload, ChapterTocEntry, Paragraph } from "@/lib/types";
import { Block } from "./blocks";
import { groupPages, useChapterLoader, useSeedCache, type ReaderPage } from "./useChapter";

export interface ReaderBook {
  code: string;
  title_hi: string;
  book_type: "print" | "digital";
  chapters: ChapterTocEntry[];
}

interface ReaderProps {
  book: ReaderBook;
  initialChapterNumber: number;
  initialChapter: ChapterPayload | null;
}

interface Toast {
  text: string;
  href?: string;
  hrefLabel?: string;
}

const FONT_SCALES = [0.85, 0.95, 1, 1.1, 1.2, 1.35, 1.5];

export function Reader({ book, initialChapterNumber, initialChapter }: ReaderProps) {
  const { user, loading: authLoading } = useAuth();
  const player = usePlayer();
  const loadChapter = useChapterLoader(book.code);
  useSeedCache(book.code, initialChapter);

  const [chapter, setChapter] = useState<ChapterPayload | null>(initialChapter);
  const [chapterNumber, setChapterNumber] = useState(initialChapterNumber);
  const [chapterLoading, setChapterLoading] = useState(initialChapter === null);
  const [mode, setMode] = useState<ReadingMode>(book.book_type === "print" ? "page" : "scroll");
  const [theme, setTheme] = useState<ReaderTheme>("light");
  const [fontScale, setFontScale] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);
  const [selected, setSelected] = useState<Paragraph | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [gotoOpen, setGotoOpen] = useState(false);
  const [gotoValue, setGotoValue] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [resumeHint, setResumeHint] = useState<{ chapter: number; ref: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const pendingPage = useRef<string | null>(null);
  const pageTurns = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pages: ReaderPage[] = useMemo(
    () => (chapter ? groupPages(chapter.paragraphs) : []),
    [chapter]
  );
  const isFrontMatter = useMemo(
    () => book.chapters.find((c) => c.number === chapterNumber)?.is_front_matter ?? false,
    [book.chapters, chapterNumber]
  );

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // ---- prefs bootstrap ----
  useEffect(() => {
    const p = getPrefs();
    setTheme(p.theme);
    setFontScale(p.fontScale);
    if (p.readingMode) setMode(p.readingMode);
  }, []);

  // ---- analytics ----
  useEffect(() => {
    track("book_open", { book: book.code });
  }, [book.code]);
  useEffect(() => {
    track("chapter_read", { book: book.code, chapter: chapterNumber });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterNumber]);

  // ---- chapter switching (client-side; URL kept in sync) ----
  const goToChapter = useCallback(
    async (n: number, opts: { targetPage?: string; push?: boolean } = {}) => {
      setChapterLoading(true);
      setSelected(null);
      pendingPage.current = opts.targetPage ?? null;
      const payload = await loadChapter(n);
      if (!payload) {
        setChapterLoading(false);
        showToast({ text: "Chapter unavailable offline." });
        return;
      }
      setChapter(payload);
      setChapterNumber(n);
      setPageIndex(0);
      setChapterLoading(false);
      if (opts.push !== false) {
        window.history.pushState(null, "", `/books/${encodeURIComponent(book.code)}/${n}`);
      }
      window.scrollTo({ top: 0 });
    },
    [book.code, loadChapter, showToast]
  );

  // back/forward between chapters we pushed
  useEffect(() => {
    const onPop = () => {
      const m = window.location.pathname.match(/\/books\/[^/]+\/(\d+)$/);
      if (m) {
        const n = Number(m[1]);
        if (n !== chapterNumber) void goToChapter(n, { push: false });
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [chapterNumber, goToChapter]);

  // if SSR couldn't fetch (offline shell), load from cache client-side
  useEffect(() => {
    if (initialChapter === null) {
      void goToChapter(initialChapterNumber, { push: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- pending page + hash + resume, applied after a chapter renders ----
  const jumpToPage = useCallback(
    (pageKey: string, paraNumber?: number) => {
      const idx = pages.findIndex((p) => p.key === pageKey);
      if (idx === -1) return false;
      if (mode === "page") {
        setPageIndex(idx);
        if (paraNumber !== undefined) {
          requestAnimationFrame(() => {
            document.getElementById(paraAnchorId(pageKey, paraNumber))?.scrollIntoView({ block: "center" });
          });
        }
      } else {
        requestAnimationFrame(() => {
          const el = paraNumber !== undefined
            ? document.getElementById(paraAnchorId(pageKey, paraNumber))
            : document.getElementById(`page-${pageKey}`);
          el?.scrollIntoView({ block: paraNumber !== undefined ? "center" : "start" });
        });
      }
      return true;
    },
    [pages, mode]
  );

  useEffect(() => {
    if (pages.length === 0) return;
    // 1. explicit deep link #p-{page}-{para}
    const hash = window.location.hash.match(/^#p-([^-]+)-(.+)$/);
    if (hash) {
      jumpToPage(hash[1], Number(hash[2]) || undefined);
      return;
    }
    // 2. pending go-to-page target from cross-chapter navigation
    if (pendingPage.current) {
      jumpToPage(pendingPage.current);
      pendingPage.current = null;
      return;
    }
    // 3. resume position (guest localStorage; logged-in progress read on open)
    const restore = (ref: string) => {
      const m = ref.match(/^\S+\s+([^.]+)\.([^.]+)\.([^.]+)$/);
      if (!m) return;
      const refChapter = m[1] === "fm" ? null : Number(m[1]);
      if (refChapter === chapterNumber || (m[1] === "fm" && isFrontMatter)) {
        jumpToPage(m[2], Number(m[3]) || undefined);
      } else if (refChapter !== null) {
        setResumeHint({ chapter: refChapter, ref });
      }
    };
    if (!authLoading && !user) {
      const local = getGuestStore().progress[book.code];
      if (local) restore(local.canonical_ref);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, authLoading]);

  // logged-in resume: read progress once auth resolves
  const serverResumeChecked = useRef(false);
  useEffect(() => {
    if (authLoading || !user || serverResumeChecked.current || pages.length === 0) return;
    serverResumeChecked.current = true;
    if (window.location.hash) return;
    import("@/lib/me").then(({ getProgress }) =>
      getProgress()
        .then((rows) => {
          const mine = rows.find((r) => r.book_code === book.code);
          if (!mine) return;
          const m = mine.canonical_ref.match(/^\S+\s+([^.]+)\.([^.]+)\.([^.]+)$/);
          if (!m) return;
          const refChapter = m[1] === "fm" ? null : Number(m[1]);
          if (refChapter === chapterNumber) {
            jumpToPage(m[2], Number(m[3]) || undefined);
          } else if (refChapter !== null) {
            setResumeHint({ chapter: refChapter, ref: mine.canonical_ref });
          }
        })
        .catch(() => undefined)
    );
  }, [authLoading, user, pages, book.code, chapterNumber, jumpToPage]);

  // ---- progress write-behind (debounced; top visible ref) ----
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveProgress = useCallback(
    (ref: string) => {
      if (progressTimer.current) clearTimeout(progressTimer.current);
      progressTimer.current = setTimeout(() => {
        if (user) {
          void upsertProgress(book.code, ref).catch(() => undefined);
        } else {
          setLocalProgress({
            book_code: book.code,
            book_title: book.title_hi,
            canonical_ref: ref,
            chapter_number: chapterNumber,
          });
        }
      }, 1500);
    },
    [user, book.code, book.title_hi, chapterNumber]
  );

  // page mode: current page's first para is the position
  useEffect(() => {
    if (mode !== "page") return;
    const first = pages[pageIndex]?.paragraphs[0];
    if (first) saveProgress(first.canonical_ref);
  }, [mode, pageIndex, pages, saveProgress]);

  // scroll mode: observe top visible paragraph
  useEffect(() => {
    if (mode !== "scroll" || pages.length === 0) return;
    const root = contentRef.current;
    if (!root) return;
    const paras = root.querySelectorAll<HTMLElement>("[data-ref]");
    const visible = new Set<HTMLElement>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target as HTMLElement);
          else visible.delete(e.target as HTMLElement);
        }
        let top: HTMLElement | null = null;
        for (const el of visible) {
          if (!top || el.offsetTop < top.offsetTop) top = el;
        }
        const ref = top?.dataset.ref;
        if (ref) saveProgress(ref);
      },
      { rootMargin: "0px 0px -60% 0px" }
    );
    paras.forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, [mode, pages, saveProgress]);

  // ---- page turns ----
  const turnPage = useCallback(
    (dir: 1 | -1) => {
      setPageIndex((i) => {
        const next = i + dir;
        if (next < 0 || next >= pages.length) return i;
        pageTurns.current += 1;
        if ([1, 5, 10, 25, 50, 100].includes(pageTurns.current)) {
          track("page_turn", { bucket: pageTurns.current });
        }
        window.scrollTo({ top: 0 });
        return next;
      });
    },
    [pages.length]
  );

  useEffect(() => {
    if (mode !== "page") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") turnPage(1);
      if (e.key === "ArrowLeft") turnPage(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, turnPage]);

  // prefetch next chapter near the end of this one (PRD §0.4)
  useEffect(() => {
    if (!chapter?.next || pages.length === 0) return;
    const nearEnd = mode === "page" ? pageIndex / pages.length >= 0.8 : false;
    if (nearEnd) void loadChapter(chapter.next.number);
  }, [pageIndex, pages.length, mode, chapter, loadChapter]);
  useEffect(() => {
    if (mode !== "scroll" || !chapter?.next) return;
    const onScroll = () => {
      const doc = document.documentElement;
      const progress = (window.scrollY + window.innerHeight) / doc.scrollHeight;
      if (progress >= 0.8) void loadChapter(chapter.next!.number);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mode, chapter, loadChapter]);

  // ---- TTS follow-along (PRD §5) ----
  const ttsActive =
    player.source?.kind === "tts" &&
    player.source.bookCode === book.code &&
    player.source.chapterNumber === chapterNumber;
  const rendition = ttsActive ? activeRendition(player.source) : null;
  const activeSeq = rendition ? paraAtPosition(rendition.para_timings, player.positionMs) : null;

  useEffect(() => {
    if (activeSeq === null || !player.playing) return;
    const el = document.querySelector<HTMLElement>(`[data-seq="${activeSeq}"]`);
    if (!el) {
      // paragraph is on another display page — flip to it in page mode
      if (mode === "page") {
        const idx = pages.findIndex((p) => p.paragraphs.some((q) => q.sequence === activeSeq));
        if (idx !== -1 && idx !== pageIndex) setPageIndex(idx);
      }
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.top < 80 || rect.bottom > window.innerHeight - 160) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeSeq, player.playing, mode, pages, pageIndex]);

  const startListening = useCallback(
    (fromSeq?: number) => {
      if (!chapter || chapter.audio_renditions.length === 0) return;
      const def = chapter.audio_renditions[0];
      const startMs =
        fromSeq !== undefined ? (def.para_timings[String(fromSeq)]?.[0] ?? 0) : 0;
      player.playTts(
        {
          bookCode: book.code,
          chapterNumber,
          chapterTitle: chapter.title_hi,
          bookTitle: book.title_hi,
          renditions: chapter.audio_renditions,
        },
        { startMs }
      );
    },
    [chapter, player, book.code, book.title_hi, chapterNumber]
  );

  const playFromPara = useCallback(
    (p: Paragraph) => {
      if (ttsActive && rendition) {
        const t = rendition.para_timings[String(p.sequence)];
        if (t) player.seekMs(t[0]);
      } else {
        startListening(p.sequence);
      }
      setSelected(null);
    },
    [ttsActive, rendition, player, startListening]
  );

  // ---- selection actions ----
  const nudgeSync = useCallback(() => {
    const p = getPrefs();
    if (!p.syncNudgeShown) {
      setPrefs({ syncNudgeShown: true });
      showToast({
        text: "Saved on this device.",
        href: "/login",
        hrefLabel: "Sign in to sync",
      });
    } else {
      showToast({ text: "Saved." });
    }
  }, [showToast]);

  const doBookmark = useCallback(
    async (p: Paragraph) => {
      track("bookmark_add");
      if (user) {
        try {
          await createBookmark(p.canonical_ref);
          showToast({ text: "Bookmarked." });
        } catch {
          showToast({ text: "Couldn't save bookmark." });
        }
      } else {
        addLocalBookmark(p.canonical_ref, book.code);
        nudgeSync();
      }
      setSelected(null);
    },
    [user, book.code, nudgeSync, showToast]
  );

  const doCopy = useCallback(
    async (p: Paragraph) => {
      try {
        await navigator.clipboard.writeText(citationText(p.text_hi, p.canonical_ref));
        showToast({ text: "Copied with citation." });
      } catch {
        showToast({ text: "Copy failed." });
      }
      setSelected(null);
    },
    [showToast]
  );

  const saveNote = useCallback(async () => {
    if (!selected || !noteText.trim()) return;
    track("note_add");
    if (user) {
      try {
        await createNote(selected.canonical_ref, noteText.trim());
        showToast({ text: "Note saved." });
      } catch {
        showToast({ text: "Couldn't save note." });
      }
    } else {
      addLocalNote(selected.canonical_ref, book.code, noteText.trim());
      nudgeSync();
    }
    setNoteOpen(false);
    setNoteText("");
    setSelected(null);
  }, [selected, noteText, user, book.code, nudgeSync, showToast]);

  // ---- go to page ----
  const goToPrintedPage = useCallback(
    (n: number) => {
      setGotoOpen(false);
      // TOC start/end lookup is client-side (PRD §5); resolver is SSR-only
      const target = book.chapters.find((c) => c.start_page <= n && c.end_page >= n);
      if (!target) {
        showToast({ text: `Page ${n} not found in this book.` });
        return;
      }
      if (target.number === chapterNumber) {
        if (!jumpToPage(String(n))) showToast({ text: `Page ${n} not in this chapter.` });
      } else {
        void goToChapter(target.number, { targetPage: String(n) });
      }
    },
    [book.chapters, chapterNumber, jumpToPage, goToChapter, showToast]
  );

  // ---- prefs setters ----
  const changeTheme = (t: ReaderTheme) => {
    setTheme(t);
    setPrefs({ theme: t });
    track("reader_theme_change", { theme: t });
  };
  const changeFontScale = (s: number) => {
    setFontScale(s);
    setPrefs({ fontScale: s });
    track("font_size_change", { scale: s });
  };
  const changeMode = (m: ReadingMode) => {
    setMode(m);
    setPrefs({ readingMode: m });
  };

  // ---- render ----
  const page = pages[pageIndex];
  const hasAudio = (chapter?.audio_renditions.length ?? 0) > 0;

  const pageChrome = (p: ReaderPage) =>
    isFrontMatter || p.label !== String(Number(p.label)) ? (
      <span className="text-xs tracking-widest text-(--reader-ink-soft)">{p.label}</span>
    ) : book.book_type === "print" ? (
      <span className="text-sm font-semibold tracking-wide">पृष्ठ {p.label}</span>
    ) : (
      <span className="text-xs text-(--reader-ink-soft) opacity-70">{p.label}</span>
    );

  return (
    <div
      data-reader-theme={theme}
      className="reader-surface min-h-dvh"
      style={{ fontSize: `${fontScale * 1.0625}rem` }}
    >
      {/* reader toolbar */}
      <div className="sticky top-0 z-30 border-b border-(--reader-rule) bg-(--reader-bg)/95 text-[1rem] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2">
          <Link
            href={`/books/${encodeURIComponent(book.code)}`}
            className="shrink-0 rounded-full p-1.5 hover:bg-black/5"
            aria-label="Book contents"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <p lang="hi" className="hi truncate text-sm font-semibold leading-tight">
              {chapter?.title_hi ?? book.title_hi}
            </p>
            <p className="truncate text-[11px] text-(--reader-ink-soft)">
              <span lang="hi" className="hi">{book.title_hi}</span>
              {chapter && ` · अध्याय ${chapter.number}`}
            </p>
          </div>
          {hasAudio && (
            <button
              type="button"
              onClick={() => (ttsActive ? player.toggle() : startListening())}
              aria-label="Listen to this chapter"
              className={`shrink-0 rounded-full p-2 ${ttsActive ? "text-white" : "hover:bg-black/5"}`}
              style={ttsActive ? { background: "var(--ws-color)" } : undefined}
            >
              <HeadphonesIcon className="h-4.5 w-4.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-label="Reading settings"
            aria-expanded={settingsOpen}
            className="shrink-0 rounded-full p-2 hover:bg-black/5"
          >
            Aa
          </button>
        </div>

        {settingsOpen && (
          <div className="border-t border-(--reader-rule)">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 text-[0.875rem]">
              <label className="flex items-center gap-2">
                <span className="text-xs text-(--reader-ink-soft)">Text</span>
                <input
                  type="range"
                  min={0}
                  max={FONT_SCALES.length - 1}
                  step={1}
                  value={FONT_SCALES.indexOf(fontScale) === -1 ? 2 : FONT_SCALES.indexOf(fontScale)}
                  onChange={(e) => changeFontScale(FONT_SCALES[Number(e.target.value)])}
                  aria-label="Font size"
                  className="w-28 accent-(--ws-color)"
                />
              </label>
              <div role="radiogroup" aria-label="Theme" className="flex gap-1.5">
                {(["light", "sepia", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={theme === t}
                    onClick={() => changeTheme(t)}
                    className={`h-7 w-7 rounded-full border ${
                      theme === t ? "ring-2 ring-(--ws-color) ring-offset-1" : "border-(--reader-rule)"
                    }`}
                    style={{
                      background: t === "light" ? "#fdfbf7" : t === "sepia" ? "#f4e8d3" : "#17140f",
                    }}
                    aria-label={`${t} theme`}
                  />
                ))}
              </div>
              <div role="radiogroup" aria-label="Reading mode" className="flex overflow-hidden rounded-full border border-(--reader-rule) text-xs">
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === "page"}
                  onClick={() => changeMode("page")}
                  className={mode === "page" ? "px-3 py-1 font-semibold text-white" : "px-3 py-1"}
                  style={mode === "page" ? { background: "var(--ws-color)" } : undefined}
                >
                  Pages
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === "scroll"}
                  onClick={() => changeMode("scroll")}
                  className={mode === "scroll" ? "px-3 py-1 font-semibold text-white" : "px-3 py-1"}
                  style={mode === "scroll" ? { background: "var(--ws-color)" } : undefined}
                >
                  Scroll
                </button>
              </div>
              <button
                type="button"
                onClick={() => setGotoOpen(true)}
                className="rounded-full border border-(--reader-rule) px-3 py-1 text-xs"
              >
                Go to page…
              </button>
            </div>
          </div>
        )}
      </div>

      {resumeHint && (
        <div className="mx-auto max-w-3xl px-4 pt-3 text-[1rem]">
          <button
            type="button"
            onClick={() => {
              const m = resumeHint.ref.match(/^\S+\s+[^.]+\.([^.]+)\.([^.]+)$/);
              void goToChapter(resumeHint.chapter, { targetPage: m?.[1] });
              setResumeHint(null);
            }}
            className="w-full rounded-xl border border-(--reader-rule) bg-black/[.03] px-4 py-2 text-left text-sm"
          >
            Resume where you left off — chapter {resumeHint.chapter} →
          </button>
        </div>
      )}

      {/* content */}
      <div ref={contentRef} className="mx-auto max-w-3xl px-5 pb-28 pt-4 sm:px-8">
        {chapterLoading && (
          <p className="py-16 text-center text-sm text-(--reader-ink-soft)">Loading…</p>
        )}

        {!chapterLoading && chapter && mode === "page" && page && (
          <section aria-label={`Page ${page.label}`}>
            <div className="mb-4 flex justify-center">{pageChrome(page)}</div>
            {page.paragraphs.map((p) => (
              <ParaWrap key={p.canonical_ref} para={p} activeSeq={activeSeq} pageKey={page.key} onSelect={setSelected} selected={selected} />
            ))}
            <nav aria-label="Page navigation" className="mt-10 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  if (pageIndex === 0) {
                    if (chapter.prev) void goToChapter(chapter.prev.number);
                  } else {
                    turnPage(-1);
                  }
                }}
                disabled={pageIndex === 0 && !chapter.prev}
                className="rounded-full border border-(--reader-rule) px-4 py-1.5 disabled:opacity-40"
              >
                ← {pageIndex === 0 && chapter.prev ? "Previous chapter" : "Previous"}
              </button>
              <span className="text-xs tabular-nums text-(--reader-ink-soft)">
                {pageIndex + 1} / {pages.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (pageIndex === pages.length - 1) {
                    if (chapter.next) void goToChapter(chapter.next.number);
                  } else {
                    turnPage(1);
                  }
                }}
                disabled={pageIndex === pages.length - 1 && !chapter.next}
                className="rounded-full border border-(--reader-rule) px-4 py-1.5 disabled:opacity-40"
              >
                {pageIndex === pages.length - 1 && chapter.next ? "Next chapter" : "Next"} →
              </button>
            </nav>
          </section>
        )}

        {!chapterLoading && chapter && mode === "scroll" && (
          <div>
            {pages.map((pg) => (
              <section key={pg.key} id={`page-${pg.key}`} aria-label={`Page ${pg.label}`}>
                <div className="my-6 flex items-center gap-3">
                  <span className="h-px flex-1 bg-(--reader-rule)" />
                  {pageChrome(pg)}
                  <span className="h-px flex-1 bg-(--reader-rule)" />
                </div>
                {pg.paragraphs.map((p) => (
                  <ParaWrap key={p.canonical_ref} para={p} activeSeq={activeSeq} pageKey={pg.key} onSelect={setSelected} selected={selected} />
                ))}
              </section>
            ))}
            <nav aria-label="Chapter navigation" className="mt-12 flex items-center justify-between text-sm">
              {chapter.prev ? (
                <button
                  type="button"
                  onClick={() => void goToChapter(chapter.prev!.number)}
                  className="rounded-full border border-(--reader-rule) px-4 py-1.5"
                >
                  ← <span lang="hi" className="hi">{chapter.prev.title_hi}</span>
                </button>
              ) : (
                <span />
              )}
              {chapter.next && (
                <button
                  type="button"
                  onClick={() => void goToChapter(chapter.next!.number)}
                  className="rounded-full border border-(--reader-rule) px-4 py-1.5"
                >
                  <span lang="hi" className="hi">{chapter.next.title_hi}</span> →
                </button>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* selection action bar */}
      {selected && !noteOpen && (
        <div
          role="toolbar"
          aria-label="Paragraph actions"
          className="fixed inset-x-0 bottom-[calc(3.4rem+env(safe-area-inset-bottom))] z-40 mx-auto flex w-fit max-w-[95vw] items-center gap-1 rounded-full border border-(--reader-rule) bg-(--reader-bg) px-2 py-1.5 text-[0.875rem] shadow-xl lg:bottom-6 lg:left-60"
        >
          <ActionBtn onClick={() => void doBookmark(selected)}>Bookmark</ActionBtn>
          <ActionBtn onClick={() => setNoteOpen(true)}>Note</ActionBtn>
          <ActionBtn onClick={() => void doCopy(selected)}>Copy</ActionBtn>
          {hasAudio && rendition?.para_timings[String(selected.sequence)] !== undefined && (
            <ActionBtn onClick={() => playFromPara(selected)}>▶ From here</ActionBtn>
          )}
          {hasAudio && !ttsActive && (
            <ActionBtn onClick={() => playFromPara(selected)}>▶ Listen</ActionBtn>
          )}
          <ActionBtn onClick={() => setSelected(null)} ariaLabel="Close">✕</ActionBtn>
        </div>
      )}

      {/* note dialog */}
      {noteOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-label="Add note">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-4 text-ink sm:rounded-2xl">
            <p lang="hi" className="hi line-clamp-2 text-sm text-ink-soft">{selected.text_hi}</p>
            <p className="mt-1 text-[11px] text-ink-soft">{selected.canonical_ref}</p>
            <textarea
              autoFocus
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              placeholder="Your note…"
              className="mt-3 w-full rounded-xl border border-rule p-3 text-sm outline-none focus:border-(--ws-color)"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setNoteOpen(false);
                  setNoteText("");
                }}
                className="rounded-full border border-rule px-4 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveNote()}
                disabled={!noteText.trim()}
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--ws-color)" }}
              >
                Save note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* go-to-page dialog */}
      {gotoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-label="Go to page">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(gotoValue);
              if (n > 0) goToPrintedPage(n);
            }}
            className="w-72 rounded-2xl bg-white p-4 text-ink"
          >
            <label htmlFor="goto-page" className="text-sm font-medium">
              Go to printed page
            </label>
            <input
              id="goto-page"
              autoFocus
              inputMode="numeric"
              value={gotoValue}
              onChange={(e) => setGotoValue(e.target.value.replace(/\D/g, ""))}
              className="mt-2 w-full rounded-xl border border-rule p-2.5 text-sm outline-none focus:border-(--ws-color)"
              placeholder="e.g. 142"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setGotoOpen(false)} className="rounded-full border border-rule px-4 py-1.5 text-sm">
                Cancel
              </button>
              <button type="submit" className="rounded-full px-4 py-1.5 text-sm font-semibold text-white" style={{ background: "var(--ws-color)" }}>
                Go
              </button>
            </div>
          </form>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-20 lg:pl-60">
          <div className="flex items-center gap-3 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
            {toast.text}
            {toast.href && (
              <Link href={toast.href} className="font-semibold underline underline-offset-2">
                {toast.hrefLabel}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-black/5"
    >
      {children}
    </button>
  );
}

function ParaWrap({
  para,
  pageKey,
  activeSeq,
  selected,
  onSelect,
}: {
  para: Paragraph;
  pageKey: string;
  activeSeq: number | null;
  selected: Paragraph | null;
  onSelect: (p: Paragraph | null) => void;
}) {
  const isActive = activeSeq === para.sequence;
  const isSelected = selected?.canonical_ref === para.canonical_ref;
  return (
    <div
      id={`p-${pageKey}-${para.para_number}`}
      data-ref={para.canonical_ref}
      data-seq={para.sequence}
      onClick={() => onSelect(isSelected ? null : para)}
      className={`cursor-pointer rounded-md px-1 -mx-1 ${isActive ? "para-active" : ""} ${
        isSelected ? "outline-2 outline-offset-2 outline-(--ws-color)" : ""
      }`}
    >
      <Block para={para} />
    </div>
  );
}
