"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { track } from "@/lib/analytics";
import { ownsViewport } from "@/lib/routes";
import {
  DEFAULT_PREFS,
  getPrefs,
  resolveTheme,
  setPrefs,
  type ReaderSurface,
  type ResolvedTheme,
  type Theme,
} from "@/lib/storage";

/**
 * Who owns the look of the app.
 *
 * Theme used to live inside the reader, which is why choosing Dark gave you a
 * dark chapter inside a white app: the reader was the only component that ever
 * wrote the attribute, so every other screen kept the light tokens. It is
 * hoisted here, above the router, and the reader now asks this for the theme
 * like everything else does.
 *
 * Everything here is device-local and works signed out — a phone and a laptop
 * legitimately want different sizes, so none of it syncs to the account.
 */

/** what the browser's chrome is painted with, per resolved theme */
const THEME_BG: Record<ResolvedTheme, string> = {
  light: "#faf7f3",
  sepia: "#f5ebdc",
  dark: "#14110f",
};

/**
 * And the same, for the surfaces the book can be printed on — used only while
 * a book is actually open, where the status bar is touching the page rather
 * than the shell. `original` and `bold` are absent on purpose: neither paints
 * its own paper, so both fall through to THEME_BG. Must match the reader-theme
 * blocks in globals.css and the map in layout.tsx's inline script.
 */
const READER_BG: Partial<Record<ReaderSurface, string>> = {
  paper: "#ededed",
  calm: "#f4e1c5",
  focus: "#fefcf2",
  quiet: "#1f1f21",
};

interface DisplayValue {
  theme: Theme;
  /** `system` already resolved against the OS — what is actually painted */
  resolved: ResolvedTheme;
  /** the book's own paper; app chrome ignores it */
  readerTheme: ReaderSurface;
  appTextScale: number;
  boldText: boolean;
  setTheme: (v: Theme) => void;
  setReaderTheme: (v: ReaderSurface) => void;
  setAppTextScale: (v: number) => void;
  setBoldText: (v: boolean) => void;
  /** back to the shipped defaults, for a reader who has painted themselves into a corner */
  reset: () => void;
  /** false until the saved prefs have been read, so nothing writes a default over them */
  loaded: boolean;
}

const DisplayContext = createContext<DisplayValue | null>(null);

export function DisplayProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_PREFS.theme);
  const [readerTheme, setReaderThemeState] = useState<ReaderSurface>(
    DEFAULT_PREFS.readerTheme
  );
  const [appTextScale, setScaleState] = useState(DEFAULT_PREFS.appTextScale);
  const [boldText, setBoldState] = useState(DEFAULT_PREFS.boldText);
  const [loaded, setLoaded] = useState(false);
  // Only meaningful while `theme` is "system"; kept in state so an OS flip at
  // sunset repaints without a reload.
  const [resolved, setResolved] = useState<ResolvedTheme>("light");
  // The status bar follows the book while one is open, so this has to move
  // with the route as well as with the settings.
  const reading = ownsViewport(usePathname() ?? "/");

  useEffect(() => {
    const p = getPrefs();
    setThemeState(p.theme);
    setReaderThemeState(p.readerTheme);
    setScaleState(p.appTextScale);
    setBoldState(p.boldText);
    setLoaded(true);
  }, []);

  // ---- paint the theme on <html> ----
  //
  // The inline script in layout.tsx has already done this for the first paint;
  // this keeps it true afterwards, on soft navigations, and while the OS
  // changes underneath a reader who chose Auto.
  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    const apply = () => {
      const next = resolveTheme(theme);
      setResolved(next);
      root.setAttribute("data-theme", next);
      root.setAttribute("data-reader-theme", readerTheme);
      // Inside a book the document *is* the book, so both of these follow the
      // paper rather than the shell — the two can now disagree, and a reader
      // who chose Quiet inside a light app was getting a cream status bar
      // welded to the top of a near-black page.
      const paper = reading ? READER_BG[readerTheme] : undefined;
      // form controls, scrollbars and the iOS overscroll gutter follow this
      // rather than our tokens, and look obviously wrong without it
      root.style.colorScheme =
        (paper ? readerTheme === "quiet" : next === "dark") ? "dark" : "light";
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "theme-color";
        document.head.appendChild(meta);
      }
      // Most of this audience installs to the home screen, where this is the
      // status bar. A terracotta bar over a dark app reads as a broken app.
      meta.content = paper ?? THEME_BG[next];
    };
    apply();
    if (theme !== "system") return;

    // Three ways the OS setting can move under us, and `change` alone catches
    // only the first:
    //
    // - it changes while the app is in front — the event fires;
    // - it changes while the app is backgrounded, which on a phone is the
    //   common case (Android and iOS both flip at sunset, and nobody is
    //   looking at the app at sunset). A hidden page is throttled or frozen
    //   and may never deliver the event, so we re-resolve on the way back in;
    // - the page is restored from the back/forward cache, where the whole DOM
    //   comes back as it was and no effect re-runs at all.
    //
    // `apply` reads matchMedia fresh every time and writes the same three
    // things, so calling it more often than strictly needed costs nothing.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onReturn = () => {
      if (document.visibilityState === "visible") apply();
    };
    mq.addEventListener("change", apply);
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("pageshow", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("pageshow", apply);
    };
  }, [theme, readerTheme, reading, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    root.style.setProperty("--app-text-scale", String(appTextScale));
    if (boldText) root.setAttribute("data-bold", "1");
    else root.removeAttribute("data-bold");
  }, [appTextScale, boldText, loaded]);

  const setTheme = useCallback((v: Theme) => {
    setThemeState(v);
    setPrefs({ theme: v });
    // Tracked here rather than at the control: the theme can now be changed
    // from the header, from Settings and from inside a book, and one event
    // per door was three events measuring the same decision.
    track("theme_change", { theme: v });
  }, []);

  const setReaderTheme = useCallback((v: ReaderSurface) => {
    setReaderThemeState(v);
    setPrefs({ readerTheme: v });
    track("reader_surface_change", { surface: v });
  }, []);

  const setAppTextScale = useCallback((v: number) => {
    setScaleState(v);
    setPrefs({ appTextScale: v });
  }, []);

  const setBoldText = useCallback((v: boolean) => {
    setBoldState(v);
    setPrefs({ boldText: v });
  }, []);

  const reset = useCallback(() => {
    setThemeState(DEFAULT_PREFS.theme);
    setReaderThemeState(DEFAULT_PREFS.readerTheme);
    setScaleState(DEFAULT_PREFS.appTextScale);
    setBoldState(DEFAULT_PREFS.boldText);
    setPrefs({
      theme: DEFAULT_PREFS.theme,
      readerTheme: DEFAULT_PREFS.readerTheme,
      appTextScale: DEFAULT_PREFS.appTextScale,
      boldText: DEFAULT_PREFS.boldText,
    });
  }, []);

  return (
    <DisplayContext.Provider
      value={{
        theme,
        resolved,
        readerTheme,
        appTextScale,
        boldText,
        setTheme,
        setReaderTheme,
        setAppTextScale,
        setBoldText,
        reset,
        loaded,
      }}
    >
      {children}
    </DisplayContext.Provider>
  );
}

export function useDisplay(): DisplayValue {
  const ctx = useContext(DisplayContext);
  if (!ctx) throw new Error("useDisplay must be used inside DisplayProvider");
  return ctx;
}
