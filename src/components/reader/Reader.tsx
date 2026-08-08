"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { AudioMode } from "@/components/player/AudioMode";
import { spokenParas } from "@/components/player/deviceSpeech";
import {
  activeRendition,
  paraAtPosition,
  usePlayer,
} from "@/components/player/PlayerProvider";
import {
  BackIcon,
  BookmarkIcon,
  HeadphonesIcon,
  TocIcon,
  TypeIcon,
} from "@/components/shell/icons";
import { track } from "@/lib/analytics";
import {
  flushProgress,
  localProgressFor,
  saveBookmark,
  saveNote,
  saveProgress as savePersonalProgress,
  syncPersonal,
} from "@/lib/personal";
import { citationText, paraAnchorId, parseRef } from "@/lib/refs";
import { documentHref, documentTextHref } from "@/lib/routes";
import {
  getListeningPosition,
  getPrefs,
  nearestStep,
  rememberReadingHome,
  setPrefs,
  FONT_SCALES,
  FONT_FACES,
  LINE_HEIGHTS,
  type ReaderFace,
  type ReadingMode,
} from "@/lib/storage";
import type { ChapterPayload, ChapterTocEntry, Paragraph } from "@/lib/types";
import type { Matcher, Segment } from "@/lib/paribhasha";
import { Block } from "./blocks";
import { ParibhashaTrailSheet } from "@/components/paribhasha/WordTrail";
import { GlossaryProvider, useGlossary } from "./GlossaryProvider";

import { DisplaySheet } from "@/components/shell/DisplaySheet";
import { Sheet } from "./Sheet";
import { SettingsSheet } from "./SettingsSheet";
import { TocSheet } from "./TocSheet";
import { useReaderChrome } from "./useReaderChrome";
import { groupPages, useChapterLoader, useSeedCache, type ReaderPage } from "./useChapter";

export interface ReaderBook {
  code: string;
  title_hi: string;
  book_type: "print" | "digital";
  /** shown in Audio Mode and on the lock screen */
  cover_image?: string | null;
  chapters: ChapterTocEntry[];
}

/**
 * Where this reading lives, when it does not live on the books shelf.
 *
 * A **compilation** is a library PDF whose text has been through the book
 * pipeline (Compilations.md D5). It reads like a book because it *is* one
 * underneath — same chapters, same paragraphs, same everything below this
 * component — but for the reader it is a file in a folder, and it is reached at
 * `/library/{node}/read/{item}`, never from the shelf. `/books/{code}` is not a
 * URL it has.
 *
 * So the reader keeps every one of its own behaviours and is told only what is
 * actually about *where it is*: the file it belongs to, the way back, and what
 * to call this text. Everything else — the path it stays on, the URL each
 * chapter pushes, the link back to the pages — is derived from the file, so
 * those three cannot disagree with each other. Passing data rather than
 * callbacks is the same instinct: a component that can be handed arbitrary
 * URL-building is one that can be handed wrong URL-building.
 *
 * Chapters move in the query rather than in the path, which is the whole point:
 * §9 asks that the URL stay the library's, and `/library/12/read/88?ch=3` is
 * still that file's address in a way `/library/12/read/88/3` is not — it is
 * also still matched by `PDF_READER_ROUTE`, so the app shell stays gone.
 */
export interface ReaderHome {
  /**
   * The library file this text came out of. Its address *and* its identity —
   * the path, the way back to the pages, and the entry this reader records so
   * that a bookmark made here can still be followed tomorrow all come from
   * these two numbers.
   */
  at: { node: number; item: number };
  /** where Back goes — the folder, not the book */
  backHref: string;
  backLabel: string;
  /**
   * What this text is, said plainly in the chrome. A text edition is not the
   * original work and the reader is entitled to know that before they quote
   * it — §9 lists the label among the things they get, not among the polish.
   *
   * "Text edition" rather than "संकलन": that word is already spoken for in the
   * library as a *provenance* — whose word this is — and two meanings of one
   * word is worse than either. It is also not true of everything coming: a
   * संवाद transcript has an edition and is not a book.
   */
  note: string;
}

interface ReaderProps {
  book: ReaderBook;
  initialChapterNumber: number;
  initialChapter: ChapterPayload | null;
  /** absent on the books shelf, which is every reader but the compilation one */
  home?: ReaderHome;
}

interface Toast {
  text: string;
  href?: string;
  hrefLabel?: string;
  /** chapter to re-request when the toast's Retry is pressed */
  retry?: { n: number; targetPage?: string; push?: boolean };
}

/** what the user has highlighted, and which paragraph it belongs to */
interface Selection {
  para: Paragraph;
  text: string;
}

/** an offer to jump to a saved position in another chapter */
interface ResumeHint {
  chapter: number;
  ref: string;
  /** where it came from — worth saying, because one of them is surprising */
  kind: "saved" | "other-device";
}

/**
 * The glossary is loaded once for the whole reading session and shared by the
 * page text, the selection bar and the definition sheet — hence the provider
 * here rather than inside any one of them.
 */
export function Reader(props: ReaderProps) {
  return (
    <GlossaryProvider>
      <ReaderView {...props} />
    </GlossaryProvider>
  );
}

function ReaderView({ book, initialChapterNumber, initialChapter, home }: ReaderProps) {
  const { user, loading: authLoading } = useAuth();
  const { open: openFeedback } = useFeedback();
  const { matcher } = useGlossary();
  const player = usePlayer();
  const loadChapter = useChapterLoader(book.code);
  useSeedCache(book.code, initialChapter);

  const [chapter, setChapter] = useState<ChapterPayload | null>(initialChapter);
  const [chapterNumber, setChapterNumber] = useState(initialChapterNumber);
  const [chapterLoading, setChapterLoading] = useState(initialChapter === null);
  const [mode, setMode] = useState<ReadingMode>(book.book_type === "print" ? "page" : "scroll");
  const [fontScale, setFontScale] = useState(1);
  const [face, setFace] = useState<ReaderFace>("serif");
  const [lineHeight, setLineHeight] = useState(1.85);
  const [margin, setMargin] = useState(1);
  const [tapZones, setTapZones] = useState(true);
  const [glossaryUnderline, setGlossaryUnderline] = useState(false);
  /** the word whose definition is open, if any */
  const [defineWord, setDefineWord] = useState<string | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [selection, setSelection] = useState<Selection | null>(null);
  // snapshot taken when the note sheet opens: focusing the textarea drops the
  // document selection, which would otherwise close the sheet mid-typing
  const [noteTarget, setNoteTarget] = useState<Selection | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [gotoOpen, setGotoOpen] = useState(false);
  const [gotoValue, setGotoValue] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [resumeHint, setResumeHint] = useState<ResumeHint | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const [currentRef, setCurrentRef] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);
  const pendingPage = useRef<string | null>(null);
  const pageTurns = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // any modal surface pins the chrome open
  const modalOpen = settingsOpen || tocOpen || noteOpen || gotoOpen || defineWord !== null;
  const chrome = useReaderChrome(mode, modalOpen);

  const pages: ReaderPage[] = useMemo(
    () => (chapter ? groupPages(chapter.paragraphs) : []),
    [chapter]
  );
  const paraByRef = useMemo(() => {
    const m = new Map<string, Paragraph>();
    for (const p of chapter?.paragraphs ?? []) m.set(p.canonical_ref, p);
    return m;
  }, [chapter]);
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
    setFontScale(nearestStep(FONT_SCALES, p.fontScale));
    setFace(FONT_FACES.includes(p.face) ? p.face : "serif");
    setLineHeight(nearestStep(LINE_HEIGHTS, p.lineHeight));
    setMargin(p.margin);
    setTapZones(p.tapZones);
    setGlossaryUnderline(p.glossaryUnderline);
    if (p.readingMode) setMode(p.readingMode);
    setPrefsLoaded(true);
    if (!p.immersiveHintShown) {
      setHint(true);
      setPrefs({ immersiveHintShown: true });
      setTimeout(() => setHint(false), 4200);
    }
  }, []);

  // ---- type applied to <html> ----
  // Theme, app text size and weight are the shell's (DisplayProvider); what is
  // left here is the four settings that only mean something inside a book.
  // The inline script in layout.tsx already painted the saved values; this
  // keeps them in sync afterwards and on soft navigations. Guarded on
  // prefsLoaded so the defaults never overwrite a saved choice.
  useEffect(() => {
    if (!prefsLoaded) return;
    const root = document.documentElement;
    root.style.setProperty("--reader-font-scale", String(fontScale));
    root.style.setProperty("--reader-line-height", String(lineHeight));
    root.setAttribute("data-reader-margin", String(margin));
    root.setAttribute("data-reader-face", face);
  }, [fontScale, lineHeight, margin, face, prefsLoaded]);

  // Reading takes over the whole page, so the background has to reach the
  // edges — no white rubber-band on iOS. It no longer restores anything on the
  // way out: the shell is on the same theme as the book now, so there is
  // nothing left to restore.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-reading", "1");
    return () => root.removeAttribute("data-reading");
  }, []);

  // ---- analytics ----
  useEffect(() => {
    track("book_open", { book: book.code });
  }, [book.code]);
  useEffect(() => {
    track("chapter_read", { book: book.code, chapter: chapterNumber });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterNumber]);

  // ---- where a chapter lives in the URL ----
  // One pair of functions, because the two have to agree: whatever `chapterHref`
  // pushes, `chapterAtLocation` has to be able to read back when the reader
  // presses Back. On the shelf that is the path; in a compilation it is the
  // query, and the path stays the library file's own (see `ReaderHome`).
  const chapterHref = useCallback(
    (n: number) =>
      home
        ? documentTextHref(home.at.node, home.at.item, n)
        : `/books/${encodeURIComponent(book.code)}/${n}`,
    [home, book.code]
  );

  const chapterAtLocation = useCallback((): number | null => {
    if (home) {
      if (window.location.pathname !== documentHref(home.at.node, home.at.item)) {
        return null;
      }
      const params = new URLSearchParams(window.location.search);
      // The pages mode is this same path without `text=1`. Popping back to it
      // is a navigation out of this reader, which the route handles — not a
      // chapter change within it.
      if (params.get("text") !== "1") return null;
      const raw = params.get("ch");
      // No chapter named is not "no chapter": it is the URL the पाठ toggle
      // links to, and the route renders the first chapter for it. This has to
      // resolve it the same way the route does, or pressing Back out of
      // chapter 2 leaves the URL saying one thing and the page showing another.
      if (raw === null) return book.chapters[0]?.number ?? null;
      const n = Number(raw);
      return Number.isSafeInteger(n) && n > 0 ? n : null;
    }
    const m = window.location.pathname.match(/\/books\/[^/]+\/(\d+)$/);
    return m ? Number(m[1]) : null;
  }, [home, book.chapters]);

  // Where this book code is read, so that a bookmark, a note or a resume
  // position made here can be turned back into a URL later — by surfaces that
  // will only ever see the canonical ref. See `refToHref`.
  useEffect(() => {
    if (home) rememberReadingHome(book.code, home.at);
  }, [home, book.code]);

  // ---- chapter switching (client-side; URL kept in sync) ----
  const goToChapter = useCallback(
    async (
      n: number,
      opts: { targetPage?: string; push?: boolean } = {}
    ): Promise<ChapterPayload | null> => {
      setChapterLoading(true);
      setSelection(null);
      pendingPage.current = opts.targetPage ?? null;
      const result = await loadChapter(n);
      if (!result.ok) {
        setChapterLoading(false);
        showToast(
          result.reason === "offline"
            ? { text: "You're offline and this chapter isn't downloaded." }
            : { text: "Couldn't load this chapter.", retry: { n, ...opts } }
        );
        return null;
      }
      const payload = result.payload;
      setChapter(payload);
      setChapterNumber(n);
      setPageIndex(0);
      setChapterLoading(false);
      if (opts.push !== false) {
        window.history.pushState(null, "", chapterHref(n));
      }
      window.scrollTo({ top: 0 });
      return payload;
    },
    [chapterHref, loadChapter, showToast]
  );

  // back/forward between chapters we pushed
  useEffect(() => {
    const onPop = () => {
      const n = chapterAtLocation();
      if (n !== null && n !== chapterNumber) void goToChapter(n, { push: false });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [chapterAtLocation, chapterNumber, goToChapter]);

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

  /** Go to a saved ref, or offer it as a banner when it lives elsewhere. */
  const restoreRef = useCallback(
    (ref: string, hint: ResumeHint["kind"]) => {
      const m = ref.match(/^\S+\s+([^.]+)\.([^.]+)\.([^.]+)$/);
      if (!m) return;
      const refChapter = m[1] === "fm" ? null : Number(m[1]);
      if (refChapter === chapterNumber || (m[1] === "fm" && isFrontMatter)) {
        jumpToPage(m[2], Number(m[3]) || undefined);
      } else if (refChapter !== null) {
        setResumeHint({ chapter: refChapter, ref, kind: hint });
      }
    },
    [chapterNumber, isFrontMatter, jumpToPage]
  );

  // Resume, identical whether or not anyone is signed in: the position is read
  // from the local store, which is where every reader's writes land first. No
  // auth check, no await, no network — so it is instant and it works offline.
  // `restored` also gates the first progress write below, so opening at page 1
  // cannot overwrite the place we are about to jump to.
  const restored = useRef(false);
  useEffect(() => {
    if (pages.length === 0 || restored.current) return;
    restored.current = true;
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
    // 3. saved position
    const local = localProgressFor(book.code);
    if (local) restoreRef(local.canonical_ref, "saved");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  // The one thing an account genuinely adds: a position set on another device.
  // It arrives late by nature, so it is offered rather than applied — nobody
  // wants the page yanked out from under them two seconds into a paragraph.
  const otherDeviceChecked = useRef(false);
  useEffect(() => {
    if (authLoading || !user || otherDeviceChecked.current || pages.length === 0) return;
    otherDeviceChecked.current = true;
    if (window.location.hash) return;
    const before = localProgressFor(book.code)?.canonical_ref;
    void syncPersonal().then(() => {
      const after = localProgressFor(book.code);
      if (!after || after.canonical_ref === before) return;
      restoreRef(after.canonical_ref, "other-device");
    });
  }, [authLoading, user, pages, book.code, restoreRef]);

  // ---- progress write-behind (debounced; top visible ref) ----
  // One path for everyone: the local store takes it immediately, and the sync
  // layer carries it to the server in the background when there is an account
  // behind it. Held until the restore above has run, so the position we open
  // at cannot overwrite the position we are restoring to.
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProgress = useRef<{ ref: string; chapter: number } | null>(null);

  const commitProgress = useCallback(() => {
    const p = pendingProgress.current;
    if (!p) return;
    pendingProgress.current = null;
    if (progressTimer.current) clearTimeout(progressTimer.current);
    savePersonalProgress(
      {
        book_code: book.code,
        book_title: book.title_hi,
        canonical_ref: p.ref,
        chapter_number: p.chapter,
      },
      !!user
    );
  }, [user, book.code, book.title_hi]);

  const saveProgress = useCallback(
    (ref: string) => {
      setCurrentRef(ref);
      if (!restored.current) return;
      pendingProgress.current = { ref, chapter: chapterNumber };
      if (progressTimer.current) clearTimeout(progressTimer.current);
      progressTimer.current = setTimeout(commitProgress, 1500);
    },
    [chapterNumber, commitProgress]
  );

  // Leaving the reader. The debounce above is still counting when someone taps
  // Back a second after turning a page, so commit it by hand rather than let
  // the timer die with the component — losing the last page turn is exactly
  // the case resume exists for.
  useEffect(() => {
    const flush = () => {
      commitProgress();
      flushProgress(!!user);
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [user, commitProgress]);

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

  /** page turn that rolls over into the neighbouring chapter at the edges */
  const advance = useCallback(
    (dir: 1 | -1) => {
      if (dir === 1) {
        if (pageIndex < pages.length - 1) turnPage(1);
        else if (chapter?.next) void goToChapter(chapter.next.number);
      } else {
        if (pageIndex > 0) turnPage(-1);
        else if (chapter?.prev) void goToChapter(chapter.prev.number);
      }
    },
    [pageIndex, pages.length, turnPage, chapter, goToChapter]
  );

  useEffect(() => {
    if (mode !== "page") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") advance(1);
      if (e.key === "ArrowLeft") advance(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, advance]);

  // ---- gestures: tap zones, swipe, tap-to-toggle-chrome ----
  const gesture = useRef<{ x: number; y: number; t: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = e.target as HTMLElement;
    // never hijack a control, a link, a glossary word, or a horizontally
    // scrollable table
    if (
      el.closest(
        "[data-reader-chrome],[data-paribhasha],a,button,input,textarea,select,label,table"
      )
    ) {
      gesture.current = null;
      return;
    }
    gesture.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const g = gesture.current;
      gesture.current = null;
      if (!g) return;

      // a highlight is an intent of its own — leave it alone
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;

      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      const dt = Date.now() - g.t;

      if (
        mode === "page" &&
        Math.abs(dx) > 56 &&
        Math.abs(dx) > Math.abs(dy) * 1.6 &&
        dt < 700
      ) {
        advance(dx < 0 ? 1 : -1);
        return;
      }

      if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 400) {
        const zone = g.x / window.innerWidth;
        if (mode === "page" && tapZones && !chrome.visible) {
          if (zone < 0.28) return advance(-1);
          if (zone > 0.72) return advance(1);
        }
        chrome.toggle();
      }
    },
    [mode, tapZones, advance, chrome]
  );

  /**
   * One handler for every marked word on the page, rather than a listener per
   * span — a page carries a few hundred of them.
   *
   * A tap that ends a text selection is ignored: the reader was highlighting a
   * phrase, and yanking a dictionary over it is not what they asked for.
   */
  const onContentClick = useCallback((e: React.MouseEvent) => {
    const mark = (e.target as HTMLElement).closest?.("[data-paribhasha]");
    if (!mark) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const word = mark.getAttribute("data-paribhasha");
    if (!word) return;
    track("paribhasha_lookup", { source: "underline" });
    setDefineWord(word);
  }, []);

  /** the selection bar's Paribhasha action — shown only for an exact headword */
  const selectedHeadword = useMemo(() => {
    const text = selection?.text.trim();
    if (!text || !matcher) return null;
    const normalized = text.replace(/\s+/g, " ");
    return matcher.has(normalized) ? normalized : null;
  }, [selection, matcher]);

  // prefetch next chapter near the end of this one (PRD §0.4)
  useEffect(() => {
    if (!chapter?.next || pages.length === 0) return;
    const nearEnd = mode === "page" ? pageIndex / pages.length >= 0.8 : false;
    if (nearEnd) void loadChapter(chapter.next.number);
  }, [pageIndex, pages.length, mode, chapter, loadChapter]);

  // scroll mode: chapter progress + prefetch, on one listener
  useEffect(() => {
    if (mode !== "scroll") {
      setScrollProgress(0);
      return;
    }
    let ticking = false;
    const measure = () => {
      const el = contentRef.current;
      if (!el) return;
      const top = el.offsetTop;
      const height = el.offsetHeight;
      const seen = window.scrollY + window.innerHeight - top;
      const pct = height > 0 ? Math.min(1, Math.max(0, seen / height)) : 0;
      setScrollProgress(pct);
      if (pct >= 0.8 && chapter?.next) void loadChapter(chapter.next.number);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        measure();
        ticking = false;
      });
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [mode, chapter, loadChapter, pages]);

  // ---- TTS follow-along (PRD §5) ----
  const isThisChapter =
    (player.source?.kind === "tts" || player.source?.kind === "device") &&
    player.source.bookCode === book.code &&
    player.source.chapterNumber === chapterNumber;
  const ttsActive = isThisChapter && player.source?.kind === "tts";
  // Device-voice fallback for chapters with no generated audio yet.
  const deviceActive = isThisChapter && player.source?.kind === "device";
  const listening = ttsActive || deviceActive;
  const rendition = ttsActive ? activeRendition(player.source) : null;
  // Generated audio locates the paragraph by timestamp; the device voice
  // reports it directly (the Web Speech API has no timeline).
  const activeSeq = rendition
    ? paraAtPosition(rendition.para_timings, player.positionMs)
    : deviceActive
      ? player.deviceParaSeq
      : null;

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

  /**
   * Where a previous listening session stopped in *this* chapter, or null.
   *
   * Scoped to the chapter on purpose. The playhead is stored per book, so a
   * reader who listened to chapter 3 and then opened chapter 1 would otherwise
   * be thrown into chapter 3 by a button that says "listen to this". Returning
   * to a book at large is what the resume card on Home is for; this button
   * only ever means "read me this page".
   *
   * The paragraph wins over the milliseconds when both are on offer: a
   * regenerated rendition moves every timestamp, and a paragraph boundary is
   * also a better place to be dropped back into than mid-clause.
   */
  const savedListening = useCallback((): { startMs?: number; fromSeq?: number } | null => {
    const saved = getListeningPosition(book.code);
    if (!saved || saved.chapter_number !== chapterNumber) return null;
    if (saved.para_seq !== null) return { fromSeq: saved.para_seq };
    return saved.position_ms > 0 ? { startMs: saved.position_ms } : null;
  }, [book.code, chapterNumber]);

  /**
   * Start (or restart) listening to a chapter payload.
   *
   * Takes the payload rather than reading `chapter` state so that auto-advance
   * can play the chapter it has just fetched: the state setter has not landed
   * yet at that point, and playing "the current chapter" would replay the one
   * that just finished.
   */
  // Destructured, not reached through `player`: the context value is a new
  // object on every position tick, and a nav callback that depends on it would
  // be re-registered 4× a second — which, with registration living in an
  // effect, is a render loop rather than a slow render.
  const { playTts, playDeviceTts, deviceVoiceAvailable, setChapterNav } = player;

  const startListeningFor = useCallback(
    (payload: ChapterPayload, opts: { fromSeq?: number; resume?: boolean } = {}) => {
      const common = {
        bookCode: book.code,
        chapterNumber: payload.number,
        chapterTitle: payload.title_hi,
        bookTitle: book.title_hi,
        coverImage: book.cover_image ?? null,
      };
      // An explicit paragraph — "play from here" — always beats the playhead,
      // and so does rolling into a fresh chapter, which starts at its top.
      const resume =
        opts.fromSeq === undefined && opts.resume !== false ? savedListening() : null;
      const seq = opts.fromSeq ?? resume?.fromSeq;
      if (payload.audio_renditions.length > 0) {
        const def = payload.audio_renditions[0];
        const startMs =
          seq !== undefined
            ? (def.para_timings[String(seq)]?.[0] ?? 0)
            : (resume?.startMs ?? 0);
        playTts({ ...common, renditions: payload.audio_renditions }, { startMs });
        return;
      }
      // No generated rendition — read it with the device's own Hindi voice.
      if (!deviceVoiceAvailable) return;
      playDeviceTts(
        { ...common, paras: spokenParas(payload.paragraphs) },
        { fromSequence: seq }
      );
    },
    [
      playTts,
      playDeviceTts,
      deviceVoiceAvailable,
      book.code,
      book.title_hi,
      book.cover_image,
      savedListening,
    ]
  );

  const startListening = useCallback(
    (fromSeq?: number) => {
      if (chapter) startListeningFor(chapter, { fromSeq });
    },
    [chapter, startListeningFor]
  );

  /**
   * Move listening to another chapter: turn the page *and* keep the voice
   * going. This is what ⏮/⏭ mean on the lock screen and in Audio Mode, and
   * what the end of a chapter does on its own — the listener's hands may be
   * nowhere near the phone.
   */
  const listenToChapter = useCallback(
    async (n: number) => {
      const payload = await goToChapter(n);
      if (payload) startListeningFor(payload, { resume: false });
    },
    [goToChapter, startListeningFor]
  );

  // What ⏮/⏭ mean while this chapter is the one playing — registered only then,
  // so the lock screen of a chapter nobody is listening to grows no buttons.
  const chapterNav = useMemo(() => {
    if (!listening || !chapter) return null;
    const prev = chapter.prev;
    const next = chapter.next;
    return {
      prev: prev ? () => void listenToChapter(prev.number) : null,
      next: next ? () => void listenToChapter(next.number) : null,
    };
  }, [listening, chapter, listenToChapter]);

  useEffect(() => {
    setChapterNav(chapterNav);
    return () => setChapterNav(null);
  }, [chapterNav, setChapterNav]);

  /** 🎧 — start if silent, and either way show the listening screen. */
  const openListening = useCallback(() => {
    if (!listening) startListening();
    player.openAudioMode();
    track("audio_mode_open");
  }, [listening, startListening, player]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, []);

  const playFromPara = useCallback(
    (p: Paragraph) => {
      if (ttsActive && rendition) {
        const t = rendition.para_timings[String(p.sequence)];
        if (t) player.seekMs(t[0]);
      } else {
        // Device mode has no seek — restart the queue at this paragraph.
        startListening(p.sequence);
      }
      clearSelection();
    },
    [ttsActive, rendition, player, startListening, clearSelection]
  );

  // ---- selection drives the action bar ----
  // Tapping a paragraph used to open this bar, which fired constantly by
  // accident while reading. Highlighting text is deliberate, native on every
  // platform, and tells us exactly what to cite.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const read = () => {
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelection(null);
        return;
      }
      const node = sel.anchorNode;
      const host = (node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement | null))
        ?.closest?.("[data-ref]");
      if (!host || !contentRef.current?.contains(host)) {
        setSelection(null);
        return;
      }
      const para = paraByRef.get(host.getAttribute("data-ref") ?? "");
      if (!para) {
        setSelection(null);
        return;
      }
      setSelection({ para, text: sel.toString().trim() });
    };
    const onChange = () => {
      // settle until the drag stops, so the bar doesn't flicker mid-swipe
      if (timer) clearTimeout(timer);
      timer = setTimeout(read, 220);
    };
    document.addEventListener("selectionchange", onChange);
    return () => {
      document.removeEventListener("selectionchange", onChange);
      if (timer) clearTimeout(timer);
    };
  }, [paraByRef]);

  // ---- selection actions ----
  // Saving always succeeds and always feels instant, because it is a local
  // write; the account only decides whether it also travels. The old code
  // could tell a signed-in reader "Couldn't save bookmark" and drop it, which
  // is the one outcome a reading app must never produce.
  const confirmSaved = useCallback(
    (what: string) => {
      const p = getPrefs();
      if (!user && !p.syncNudgeShown) {
        setPrefs({ syncNudgeShown: true });
        showToast({
          text: `${what} — saved on this device.`,
          href: "/login",
          hrefLabel: "Sign in to sync",
        });
      } else {
        showToast({ text: `${what}.` });
      }
    },
    [user, showToast]
  );

  const doBookmark = useCallback(
    (ref: string) => {
      track("bookmark_add");
      saveBookmark(
        {
          canonical_ref: ref,
          book_code: book.code,
          book_title: book.title_hi,
          text_hi: paraByRef.get(ref)?.text_hi,
        },
        !!user
      );
      confirmSaved("Bookmarked");
      clearSelection();
    },
    [user, book.code, book.title_hi, paraByRef, confirmSaved, clearSelection]
  );

  const doCopy = useCallback(
    async (s: Selection) => {
      try {
        await navigator.clipboard.writeText(
          citationText(s.text || s.para.text_hi, s.para.canonical_ref)
        );
        showToast({ text: "Copied with citation." });
      } catch {
        showToast({ text: "Copy failed." });
      }
      clearSelection();
    },
    [showToast, clearSelection]
  );

  const doReport = useCallback(
    (s: Selection) => {
      // The selected words, or the whole paragraph when the reader tapped
      // rather than dragged — a correction with no passage attached is one
      // somebody has to go and find.
      openFeedback({
        kind: "content",
        canonical_ref: s.para.canonical_ref,
        quoted_text: s.text || s.para.text_hi,
        source: "reader",
      });
      clearSelection();
    },
    [openFeedback, clearSelection]
  );

  const commitNote = useCallback(() => {
    if (!noteTarget || !noteText.trim()) return;
    track("note_add");
    saveNote(
      {
        canonical_ref: noteTarget.para.canonical_ref,
        book_code: book.code,
        book_title: book.title_hi,
        text_hi: noteTarget.para.text_hi,
      },
      noteText.trim(),
      !!user
    );
    confirmSaved("Note saved");
    setNoteOpen(false);
    setNoteText("");
    setNoteTarget(null);
    clearSelection();
  }, [noteTarget, noteText, user, book.code, book.title_hi, confirmSaved, clearSelection]);

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
  const changeFontScale = (s: number) => {
    setFontScale(s);
    setPrefs({ fontScale: s });
    track("font_size_change", { scale: s });
  };
  const changeFace = (v: ReaderFace) => {
    setFace(v);
    setPrefs({ face: v });
    track("reader_face_change", { face: v });
  };
  const changeLineHeight = (v: number) => {
    setLineHeight(v);
    setPrefs({ lineHeight: v });
  };
  const changeMargin = (v: number) => {
    setMargin(v);
    setPrefs({ margin: v });
  };
  const changeMode = (m: ReadingMode) => {
    setMode(m);
    setPrefs({ readingMode: m });
  };
  const changeTapZones = (v: boolean) => {
    setTapZones(v);
    setPrefs({ tapZones: v });
  };
  const changeGlossaryUnderline = (v: boolean) => {
    setGlossaryUnderline(v);
    setPrefs({ glossaryUnderline: v });
    track("paribhasha_underline_toggle", { state: v ? "on" : "off" });
  };

  // ---- render ----
  const page = pages[pageIndex];
  /**
   * The printed page under the reader right now, for the way back to the
   * document's own pages. Only a compilation has one to go back to.
   *
   * Front matter is deliberately excluded rather than mapped: `fm.iii.2` has a
   * roman numeral where a page number goes, and `Number("iii")` is NaN. The
   * link simply drops the page and opens the document, which is right — front
   * matter is the one part of a text whose place in the scan is least
   * predictable.
   */
  const pagesAt = ((): number | undefined => {
    if (!home) return undefined;
    const parsed = currentRef ? parseRef(currentRef) : null;
    const n = parsed ? Number(parsed.page) : NaN;
    if (Number.isSafeInteger(n) && n > 0) return n;
    return book.chapters.find((c) => c.number === chapterNumber)?.start_page;
  })();
  const hasAudio = (chapter?.audio_renditions.length ?? 0) > 0;
  // Without a generated rendition we can still read aloud, but only if this
  // device has a Hindi voice — an English engine on Devanagari is gibberish.
  const deviceFallback = !hasAudio && player.deviceVoiceAvailable;
  const canListen = hasAudio || deviceFallback;
  const progress =
    mode === "page"
      ? pages.length > 0
        ? (pageIndex + 1) / pages.length
        : 0
      : scrollProgress;
  const positionLabel =
    mode === "page" && page
      ? book.book_type === "print" && page.label === String(Number(page.label))
        ? `Page ${page.label} · ${pageIndex + 1}/${pages.length}`
        : `${pageIndex + 1} / ${pages.length}`
      : `${Math.round(progress * 100)}%`;

  const pageChrome = (p: ReaderPage) =>
    isFrontMatter || p.label !== String(Number(p.label)) ? (
      <span className="text-xs tracking-widest text-(--reader-ink-soft)">{p.label}</span>
    ) : book.book_type === "print" ? (
      <span className="text-sm font-semibold tracking-wide">Page {p.label}</span>
    ) : (
      <span className="text-xs text-(--reader-ink-soft) opacity-70">{p.label}</span>
    );

  const bottomOffset = "calc(var(--player-h, 0px) + env(safe-area-inset-bottom))";

  return (
    <div
      className="reader-surface min-h-dvh"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {/* ---- top chrome ---- */}
      <div
        data-reader-chrome
        data-hidden={!chrome.visible}
        className="reader-chrome reader-chrome-top fixed inset-x-0 top-0 z-40 border-b border-(--reader-rule) bg-(--reader-bg)/95 pt-[env(safe-area-inset-top)] backdrop-blur"
      >
        <div className="reader-content flex items-center gap-1 py-1.5">
          <Link
            href={home?.backHref ?? `/books/${encodeURIComponent(book.code)}`}
            className="-ms-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:bg-current/10"
            aria-label={home?.backLabel ?? "Back to book"}
          >
            <BackIcon className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p lang="hi" className="hi truncate text-xs font-semibold leading-tight">
              {chapter?.title_hi ?? book.title_hi}
            </p>
            <p className="truncate text-xs leading-tight text-(--reader-ink-soft)">
              <span lang="hi" className="hi">{book.title_hi}</span>
              {/* What this text is, on the line that is already about what the
                  reader is in — not a badge somewhere they have to go looking.
                  A compilation reads exactly like a book, which is precisely
                  why it has to say that it is not one. */}
              {home && <>{" · "}{home.note}</>}
            </p>
          </div>
          {/* Back to the document as it was printed. The pages are the original
              object and this text is derived from them (§12), so the way back
              is never more than one tap from the way in. */}
          {home ? (
            <Link
              // At the page being read, not at page one — the same bargain
              // the पाठ toggle makes coming the other way. The two modes share
              // a page axis because the text was pipelined from this very
              // file; see `textEditionAtPage`.
              //
              // The *paragraph's* page rather than the chapter's start, and
              // the difference is the whole point on a one-chapter edition
              // like `S-A` — 52 pages under a single heading, where a chapter
              // start is always page 1 and would send a reader forty pages
              // back. The chapter start is the fallback for the moment before
              // the first paragraph has been observed.
              href={documentHref(home.at.node, home.at.item, pagesAt)}
              // Spelled "Pages" and not "Original pages" only because this bar
              // is 40-odd characters wide on a phone and the title has first
              // claim on them; the full sentence is in the label a screen
              // reader and a hover both get.
              title="Read the original pages"
              aria-label="Read the original pages"
              className="flex h-11 shrink-0 items-center rounded-full px-3 text-xs font-semibold active:bg-current/10"
            >
              Pages
            </Link>
          ) : (
            <span className="h-11 w-11 shrink-0" aria-hidden />
          )}
        </div>
      </div>

      {/* ---- content ---- */}
      {/* padding matches the top bar exactly, so revealing chrome never
          covers the line you are reading */}
      <div className="pt-[calc(3.5rem+env(safe-area-inset-top))]">
        {resumeHint && (
          <div className="reader-content flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                const m = resumeHint.ref.match(/^\S+\s+[^.]+\.([^.]+)\.([^.]+)$/);
                void goToChapter(resumeHint.chapter, { targetPage: m?.[1] });
                setResumeHint(null);
              }}
              className="min-w-0 flex-1 rounded-xl border border-(--reader-rule) px-4 py-2.5 text-left text-sm"
            >
              {resumeHint.kind === "other-device"
                ? "Continue from your other device"
                : "Resume where you left off"}{" "}
              — chapter {resumeHint.chapter} →
            </button>
            <button
              type="button"
              onClick={() => setResumeHint(null)}
              aria-label="Dismiss resume suggestion"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-(--reader-ink-soft) active:bg-current/10"
            >
              ✕
            </button>
          </div>
        )}

        <div
          ref={contentRef}
          onClick={onContentClick}
          className="reader-content min-h-[70dvh] pb-24 pt-3"
        >
          {chapterLoading && (
            <p className="py-16 text-center text-sm text-(--reader-ink-soft)">Loading…</p>
          )}

          {!chapterLoading && chapter && mode === "page" && page && (
            <section aria-label={`Page ${page.label}`}>
              <div className="mb-4 flex justify-center">{pageChrome(page)}</div>
              <PageParas
                page={page}
                matcher={glossaryUnderline ? matcher : null}
                activeSeq={activeSeq}
                selectedRef={selection?.para.canonical_ref}
              />
              <nav aria-label="Page navigation" className="mt-10 flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => advance(-1)}
                  disabled={pageIndex === 0 && !chapter.prev}
                  className="min-h-11 rounded-full border border-(--reader-rule) px-4 disabled:opacity-40"
                >
                  ← {pageIndex === 0 && chapter.prev ? "Previous chapter" : "Previous"}
                </button>
                <span className="text-xs tabular-nums text-(--reader-ink-soft)">
                  {pageIndex + 1} / {pages.length}
                </span>
                <button
                  type="button"
                  onClick={() => advance(1)}
                  disabled={pageIndex === pages.length - 1 && !chapter.next}
                  className="min-h-11 rounded-full border border-(--reader-rule) px-4 disabled:opacity-40"
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
                  <PageParas
                    page={pg}
                    matcher={glossaryUnderline ? matcher : null}
                    activeSeq={activeSeq}
                    selectedRef={selection?.para.canonical_ref}
                  />
                </section>
              ))}
              <nav aria-label="Chapter navigation" className="mt-12 flex items-center justify-between gap-3 text-sm">
                {chapter.prev ? (
                  <button
                    type="button"
                    onClick={() => void goToChapter(chapter.prev!.number)}
                    className="min-h-11 min-w-0 rounded-full border border-(--reader-rule) px-4"
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
                    className="min-h-11 min-w-0 rounded-full px-4 font-semibold text-white"
                    style={{ background: "var(--ws-color)" }}
                  >
                    <span lang="hi" className="hi">{chapter.next.title_hi}</span> →
                  </button>
                )}
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* ---- progress hairline: the one thing that never hides ---- */}
      <div
        className="pointer-events-none fixed inset-x-0 z-30 h-0.5"
        style={{ bottom: bottomOffset }}
        aria-hidden
      >
        <div
          className="h-full transition-[width] duration-200"
          style={{ width: `${progress * 100}%`, background: "var(--ws-ink)", opacity: 0.75 }}
        />
      </div>

      {/* ---- bottom chrome ---- */}
      <div
        data-reader-chrome
        data-hidden={!chrome.visible}
        className="reader-chrome reader-chrome-bottom fixed inset-x-0 z-40 border-t border-(--reader-rule) bg-(--reader-bg)/95 backdrop-blur"
        style={{ bottom: bottomOffset }}
      >
        <div className="reader-content flex items-center gap-1 py-1">
          <ChromeBtn onClick={() => setTocOpen(true)} label="Contents">
            <TocIcon className="h-5 w-5" />
          </ChromeBtn>
          <ChromeBtn
            onClick={() => currentRef && doBookmark(currentRef)}
            label="Bookmark this position"
            disabled={!currentRef}
          >
            <BookmarkIcon className="h-5 w-5" />
          </ChromeBtn>
          <span className="flex-1 truncate text-center text-xs tabular-nums text-(--reader-ink-soft)">
            {positionLabel}
          </span>
          {canListen && (
            <ChromeBtn
              onClick={openListening}
              label={
                deviceFallback
                  ? "Listen with this device's voice (no recorded audio yet)"
                  : "Listen to this chapter"
              }
              active={listening}
            >
              <span className="relative">
                <HeadphonesIcon className="h-5 w-5" />
                {deviceFallback && (
                  <span
                    aria-hidden
                    className="absolute -end-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-(--reader-ink-soft)"
                  />
                )}
              </span>
            </ChromeBtn>
          )}
          <ChromeBtn onClick={() => setSettingsOpen(true)} label="Reading settings">
            <TypeIcon className="h-5 w-5" />
          </ChromeBtn>
        </div>
      </div>

      {/* one-time coach mark */}
      {hint && !chrome.visible && (
        <div className="pointer-events-none fixed inset-x-0 top-1/2 z-30 flex justify-center px-8">
          <p className="rounded-full bg-black/75 px-4 py-2 text-center text-xs text-white">
            Tap the middle of the page for controls
          </p>
        </div>
      )}

      {/* ---- selection action bar ---- */}
      {selection && !noteOpen && (
        <div
          data-reader-chrome
          role="toolbar"
          aria-label="Selection actions"
          className="fixed inset-x-0 z-50 mx-auto flex w-fit max-w-[95vw] items-center gap-0.5 rounded-full border border-(--reader-rule) bg-(--reader-bg) px-1.5 py-1 shadow-xl"
          style={{ bottom: `calc(${bottomOffset} + 3.5rem)` }}
        >
          {/* The way a definition is reached with underlining off: press and
              hold selects the word, and this appears only when the glossary
              actually has it — so it never offers a meaning it cannot give. */}
          {selectedHeadword && (
            <ActionBtn
              onClick={() => {
                track("paribhasha_lookup", { source: "selection" });
                setDefineWord(selectedHeadword);
                clearSelection();
              }}
            >
              <span>Paribhasha</span>
            </ActionBtn>
          )}
          <ActionBtn onClick={() => doBookmark(selection.para.canonical_ref)}>Bookmark</ActionBtn>
          <ActionBtn
            onClick={() => {
              setNoteTarget(selection);
              setNoteOpen(true);
            }}
          >
            Note
          </ActionBtn>
          <ActionBtn onClick={() => void doCopy(selection)}>Copy</ActionBtn>
          {/* The reason the whole feedback module earns its place: the corpus
              came out of OCR, and the person who spots a broken matra is the
              one reading the line. This hands us the exact paragraph, so the
              editor opens proofreading on it instead of hunting for it. */}
          <ActionBtn onClick={() => doReport(selection)} ariaLabel="Report a problem with this passage">
            Report
          </ActionBtn>
          {canListen && (
            <ActionBtn onClick={() => playFromPara(selection.para)}>▶ Here</ActionBtn>
          )}
          <ActionBtn onClick={clearSelection} ariaLabel="Dismiss">✕</ActionBtn>
        </div>
      )}

      {/* ---- Audio Mode ----
          Rendered here, by the reader, because it is the reader that holds the
          chapter's paragraphs — the text Audio Mode follows. Only for the
          chapter actually playing: with two reader tabs open, the silent one
          must not put up a player. */}
      {player.audioModeOpen && listening && chapter && (
        <AudioMode
          paragraphs={chapter.paragraphs}
          activeSeq={activeSeq}
          onSeekPara={playFromPara}
          prevChapterTitle={chapter.prev?.title_hi}
          nextChapterTitle={chapter.next?.title_hi}
          onOpenContents={() => setTocOpen(true)}
        />
      )}

      {/* ---- sheets ---- */}
      {/* The same Paribhasha card the glossary uses — recursive underlines and
          the trail included, so a word means the same thing wherever it is
          tapped. */}
      <ParibhashaTrailSheet word={defineWord} onClose={() => setDefineWord(null)} />

      <TocSheet
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        chapters={book.chapters}
        current={chapterNumber}
        bookType={book.book_type}
        onSelect={(n) => void goToChapter(n)}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fontScale={fontScale}
        onFontScale={changeFontScale}
        face={face}
        onFace={changeFace}
        lineHeight={lineHeight}
        onLineHeight={changeLineHeight}
        margin={margin}
        onMargin={changeMargin}
        mode={mode}
        onMode={changeMode}
        tapZones={tapZones}
        onTapZones={changeTapZones}
        showTapZones={mode === "page"}
        glossaryUnderline={glossaryUnderline}
        onGlossaryUnderline={changeGlossaryUnderline}
        onGoToPage={() => {
          setSettingsOpen(false);
          setGotoOpen(true);
        }}
        onAppDisplay={() => {
          setSettingsOpen(false);
          setDisplayOpen(true);
        }}
      />

      {/* The other half of the pair. A reader who has just made the book text
          as large as it goes is the likeliest person in the app to want the
          menus larger too, and this is the moment they want it. */}
      <DisplaySheet open={displayOpen} onClose={() => setDisplayOpen(false)} />

      <Sheet
        open={noteOpen && !!noteTarget}
        onClose={() => {
          setNoteOpen(false);
          setNoteTarget(null);
        }}
        title="Add note"
      >
        {noteTarget && (
          <div className="px-5">
            <p lang="hi" className="hi line-clamp-3 text-sm text-(--reader-ink-soft)">
              {noteTarget.text || noteTarget.para.text_hi}
            </p>
            <p className="mt-1 text-xs text-(--reader-ink-soft)">
              {noteTarget.para.canonical_ref}
            </p>
            <textarea
              autoFocus
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              placeholder="Your note…"
              className="mt-3 w-full rounded-xl border border-(--reader-rule) bg-transparent p-3 text-base outline-none focus:border-(--ws-ink)"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setNoteOpen(false);
                  setNoteText("");
                  setNoteTarget(null);
                }}
                className="min-h-11 rounded-full border border-(--reader-rule) px-4 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commitNote}
                disabled={!noteText.trim()}
                className="min-h-11 rounded-full px-5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--ws-color)" }}
              >
                Save note
              </button>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={gotoOpen} onClose={() => setGotoOpen(false)} title="Go to printed page">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(gotoValue);
            if (n > 0) goToPrintedPage(n);
          }}
          className="px-5"
        >
          <input
            id="goto-page"
            autoFocus
            inputMode="numeric"
            aria-label="Printed page number"
            value={gotoValue}
            onChange={(e) => setGotoValue(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-xl border border-(--reader-rule) bg-transparent p-3 text-base outline-none focus:border-(--ws-ink)"
            placeholder="e.g. 142"
          />
          <button
            type="submit"
            className="mt-3 min-h-11 w-full rounded-full text-sm font-semibold text-white"
            style={{ background: "var(--ws-color)" }}
          >
            Go
          </button>
        </form>
      </Sheet>

      {/* ---- toast ---- */}
      {toast && (
        <div
          className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
          style={{ bottom: `calc(${bottomOffset} + 4.5rem)` }}
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
            {toast.text}
            {toast.href && (
              <Link href={toast.href} className="font-semibold underline underline-offset-2">
                {toast.hrefLabel}
              </Link>
            )}
            {toast.retry && (
              <button
                type="button"
                onClick={() => {
                  const { n, ...opts } = toast.retry!;
                  setToast(null);
                  void goToChapter(n, opts);
                }}
                className="font-semibold underline underline-offset-2"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChromeBtn({
  children,
  onClick,
  label,
  active,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors active:bg-current/10 disabled:opacity-35"
      style={active ? { color: "var(--ws-ink)" } : undefined}
    >
      {children}
    </button>
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
      className="min-h-10 rounded-full px-3 text-sm font-medium active:bg-current/10"
    >
      {children}
    </button>
  );
}

/**
 * Block types that are never marked for Paribhasha: headings and subheadings are
 * titles rather than reading, and a figure caption or table cell is too tight
 * to carry underlines.
 */
const UNMARKED_BLOCKS = new Set(["heading", "subheading", "figure", "table"]);

/**
 * One display page's paragraphs, with the glossary marks worked out for the
 * page as a whole.
 *
 * The page is the unit on purpose: `matcher.segment` marks each word only on
 * its first appearance, and "first" has to mean something the reader can see.
 * Doing it per paragraph would underline the same word six times down a page;
 * doing it per chapter would mark a word on page 3 and leave it bare on page
 * 40, where the reader has long since lost the definition.
 */
function PageParas({
  page,
  matcher,
  activeSeq,
  selectedRef,
}: {
  page: ReaderPage;
  /** null when the reader has underlining off, or the index has not arrived */
  matcher: Matcher | null;
  activeSeq: number | null;
  selectedRef?: string;
}) {
  const segments = useMemo(
    () =>
      matcher?.segment(
        page.paragraphs.map((p) => (UNMARKED_BLOCKS.has(p.block_type) ? null : p.text_hi))
      ) ?? null,
    [matcher, page]
  );

  return (
    <>
      {page.paragraphs.map((p, i) => (
        <ParaWrap
          key={p.canonical_ref}
          para={p}
          pageKey={page.key}
          activeSeq={activeSeq}
          selectedRef={selectedRef}
          segments={segments?.[i] ?? null}
        />
      ))}
    </>
  );
}

function ParaWrap({
  para,
  pageKey,
  activeSeq,
  selectedRef,
  segments,
}: {
  para: Paragraph;
  pageKey: string;
  activeSeq: number | null;
  selectedRef?: string;
  segments?: Segment[] | null;
}) {
  const isActive = activeSeq === para.sequence;
  const isSelected = selectedRef === para.canonical_ref;
  return (
    <div
      id={`p-${pageKey}-${para.para_number}`}
      data-ref={para.canonical_ref}
      data-seq={para.sequence}
      className={`-mx-1 rounded-md px-1 ${isActive ? "para-active" : ""} ${
        isSelected ? "bg-(--ws-color)/8" : ""
      }`}
    >
      <Block para={para} segments={segments} />
    </div>
  );
}
