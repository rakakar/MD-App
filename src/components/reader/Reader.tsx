"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
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
import { citationText, paraAnchorId } from "@/lib/refs";
import {
  getPrefs,
  nearestStep,
  resolveTheme,
  setPrefs,
  FONT_SCALES,
  FONT_FACES,
  LINE_HEIGHTS,
  type ReaderFace,
  type ReaderTheme,
  type ReadingMode,
} from "@/lib/storage";
import type { ChapterPayload, ChapterTocEntry, Paragraph } from "@/lib/types";
import { Block } from "./blocks";
import { Sheet } from "./Sheet";
import { SettingsSheet } from "./SettingsSheet";
import { TocSheet } from "./TocSheet";
import { useReaderChrome } from "./useReaderChrome";
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

/** matches the swatches in SettingsSheet */
const THEME_BG: Record<string, string> = {
  light: "#fdfbf7",
  sepia: "#f4e8d3",
  dark: "#17140f",
};

export function Reader({ book, initialChapterNumber, initialChapter }: ReaderProps) {
  const { user, loading: authLoading } = useAuth();
  const player = usePlayer();
  const loadChapter = useChapterLoader(book.code);
  useSeedCache(book.code, initialChapter);

  const [chapter, setChapter] = useState<ChapterPayload | null>(initialChapter);
  const [chapterNumber, setChapterNumber] = useState(initialChapterNumber);
  const [chapterLoading, setChapterLoading] = useState(initialChapter === null);
  const [mode, setMode] = useState<ReadingMode>(book.book_type === "print" ? "page" : "scroll");
  const [theme, setTheme] = useState<ReaderTheme>("system");
  const [fontScale, setFontScale] = useState(1);
  const [face, setFace] = useState<ReaderFace>("serif");
  const [lineHeight, setLineHeight] = useState(1.85);
  const [margin, setMargin] = useState(1);
  const [tapZones, setTapZones] = useState(true);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
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
  const modalOpen = settingsOpen || tocOpen || noteOpen || gotoOpen;
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
    setTheme(p.theme);
    setFontScale(nearestStep(FONT_SCALES, p.fontScale));
    setFace(FONT_FACES.includes(p.face) ? p.face : "serif");
    setLineHeight(nearestStep(LINE_HEIGHTS, p.lineHeight));
    setMargin(p.margin);
    setTapZones(p.tapZones);
    if (p.readingMode) setMode(p.readingMode);
    setPrefsLoaded(true);
    if (!p.immersiveHintShown) {
      setHint(true);
      setPrefs({ immersiveHintShown: true });
      setTimeout(() => setHint(false), 4200);
    }
  }, []);

  // ---- theme + type applied to <html> ----
  // The inline script in layout.tsx already painted the saved values; this
  // keeps them in sync afterwards and on soft navigations. Guarded on
  // prefsLoaded so the defaults never overwrite a saved dark theme.
  useEffect(() => {
    if (!prefsLoaded) return;
    const root = document.documentElement;
    const apply = () => {
      const resolved = resolveTheme(theme);
      root.setAttribute("data-reader-theme", resolved);
      root.style.colorScheme = resolved === "dark" ? "dark" : "light";
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "theme-color";
        document.head.appendChild(meta);
      }
      meta.content = THEME_BG[resolved] ?? THEME_BG.light;
    };
    apply();
    // follow the OS while "Auto" is selected
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (theme === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme, prefsLoaded]);

  useEffect(() => {
    if (!prefsLoaded) return;
    const root = document.documentElement;
    root.style.setProperty("--reader-font-scale", String(fontScale));
    root.style.setProperty("--reader-line-height", String(lineHeight));
    root.setAttribute("data-reader-margin", String(margin));
    root.setAttribute("data-reader-face", face);
  }, [fontScale, lineHeight, margin, face, prefsLoaded]);

  // reading takes over the whole page: no white rubber-band, no light
  // scrollbars, and the app's own chrome colours are restored on the way out
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-reading", "1");
    return () => {
      root.removeAttribute("data-reading");
      root.style.colorScheme = "";
      const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (meta) meta.content = "#A54F14";
    };
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
      setSelection(null);
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
    // never hijack a control, a link, or a horizontally scrollable table
    if (el.closest("[data-reader-chrome],a,button,input,textarea,select,label,table")) {
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

  // ---- render ----
  const page = pages[pageIndex];
  const hasAudio = (chapter?.audio_renditions.length ?? 0) > 0;
  const progress =
    mode === "page"
      ? pages.length > 0
        ? (pageIndex + 1) / pages.length
        : 0
      : scrollProgress;
  const positionLabel =
    mode === "page" && page
      ? book.book_type === "print" && page.label === String(Number(page.label))
        ? `पृष्ठ ${page.label} · ${pageIndex + 1}/${pages.length}`
        : `${pageIndex + 1} / ${pages.length}`
      : `${Math.round(progress * 100)}%`;

  const pageChrome = (p: ReaderPage) =>
    isFrontMatter || p.label !== String(Number(p.label)) ? (
      <span className="text-xs tracking-widest text-(--reader-ink-soft)">{p.label}</span>
    ) : book.book_type === "print" ? (
      <span className="text-sm font-semibold tracking-wide">पृष्ठ {p.label}</span>
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
            href={`/books/${encodeURIComponent(book.code)}`}
            className="-ms-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:bg-current/10"
            aria-label="Back to book"
          >
            <BackIcon className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p lang="hi" className="hi truncate text-[13px] font-semibold leading-tight">
              {chapter?.title_hi ?? book.title_hi}
            </p>
            <p className="truncate text-[11px] leading-tight text-(--reader-ink-soft)">
              <span lang="hi" className="hi">{book.title_hi}</span>
            </p>
          </div>
          <span className="h-11 w-11 shrink-0" aria-hidden />
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
          className="reader-content min-h-[70dvh] pb-24 pt-3"
        >
          {chapterLoading && (
            <p className="py-16 text-center text-sm text-(--reader-ink-soft)">Loading…</p>
          )}

          {!chapterLoading && chapter && mode === "page" && page && (
            <section aria-label={`Page ${page.label}`}>
              <div className="mb-4 flex justify-center">{pageChrome(page)}</div>
              {page.paragraphs.map((p) => (
                <ParaWrap key={p.canonical_ref} para={p} activeSeq={activeSeq} pageKey={page.key} selectedRef={selection?.para.canonical_ref} />
              ))}
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
                  {pg.paragraphs.map((p) => (
                    <ParaWrap key={p.canonical_ref} para={p} activeSeq={activeSeq} pageKey={pg.key} selectedRef={selection?.para.canonical_ref} />
                  ))}
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
          {hasAudio && (
            <ChromeBtn
              onClick={() => (ttsActive ? player.toggle() : startListening())}
              label="Listen to this chapter"
              active={ttsActive}
            >
              <HeadphonesIcon className="h-5 w-5" />
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
          {hasAudio && (
            <ActionBtn onClick={() => playFromPara(selection.para)}>▶ Here</ActionBtn>
          )}
          <ActionBtn onClick={clearSelection} ariaLabel="Dismiss">✕</ActionBtn>
        </div>
      )}

      {/* ---- sheets ---- */}
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
        theme={theme}
        onTheme={changeTheme}
        mode={mode}
        onMode={changeMode}
        tapZones={tapZones}
        onTapZones={changeTapZones}
        showTapZones={mode === "page"}
        onGoToPage={() => {
          setSettingsOpen(false);
          setGotoOpen(true);
        }}
      />

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
            <p className="mt-1 text-[11px] text-(--reader-ink-soft)">
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

function ParaWrap({
  para,
  pageKey,
  activeSeq,
  selectedRef,
}: {
  para: Paragraph;
  pageKey: string;
  activeSeq: number | null;
  selectedRef?: string;
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
      <Block para={para} />
    </div>
  );
}
