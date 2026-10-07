"use client";

// The shell's sheet, not the book's: Display can be opened from the header on
// any screen, and a reader who has chosen Quiet paper for their books should
// not get a near-black panel over a cream app.
import { Sheet } from "@/components/ui/Sheet";
import { Dialog, useIsDesktop } from "@/components/ui/Dialog";
import { CloseIcon } from "./icons";
import { useWorkspace } from "./WorkspaceProvider";
import { APP_TEXT_LABELS, APP_TEXT_SCALES, type Theme } from "@/lib/storage";
import { useDisplay } from "./DisplayProvider";

/**
 * How the whole app looks — theme, text size, weight.
 *
 * One component behind three doors: the account menu (one tap from any
 * screen), the Appearance section of Settings, and a link out of the reader's
 * own settings. An accessibility control three taps deep is one nobody finds,
 * and this audience is the one that most needs to find it.
 *
 * Book-only controls — typeface, line spacing, margins, page vs scroll — stay
 * in the reader's sheet. The split is not app vs reader, it is "how the app is
 * drawn" vs "how this book is set".
 */

/**
 * Each swatch is painted in the theme it selects and carries that theme's ink,
 * so it is a paint chip rather than a colour block. Without the letters the
 * chip for the theme you are already in disappears into the sheet behind it —
 * a dark swatch on the dark sheet was an empty outline — and the ink is the
 * half of a theme a colour block cannot show you anyway.
 */
const THEMES: { id: Theme; label: string; bg: string; ink: string }[] = [
  {
    id: "system",
    label: "Auto",
    bg: "linear-gradient(135deg,#fdfbf8 50%,#14110f 50%)",
    ink: "#8a8073",
  },
  { id: "light", label: "Light", bg: "#fdfbf8", ink: "#1a1613" },
  { id: "sepia", label: "Sepia", bg: "#f5ebdc", ink: "#3d2f1e" },
  { id: "dark", label: "Dark", bg: "#14110f", ink: "#e8e2d8" },
];

export function DisplaySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useDisplay();
  const desktop = useIsDesktop();
  const { workspace } = useWorkspace();

  // Desktop: a dialog in the middle of the window, as the designer's comp
  // draws it (7 Oct 2026) — the same three settings, set larger, with Reset
  // and Done in a footer. The phone keeps its sheet.
  if (desktop) {
    return (
      <Dialog open={open} onClose={onClose} label="Display" accent={workspace.color} className="flex w-full max-w-lg flex-col">
        <div className="flex items-center justify-between px-6 pb-2 pt-6">
          <h2 className="text-lg font-semibold">Display</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-me-2 flex h-9 w-9 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <CloseIcon className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <DisplayControls variant="dialog" />
        </div>
        <div className="flex items-center justify-between border-t border-rule bg-inset px-6 py-3.5">
          <button
            type="button"
            onClick={d.reset}
            className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-control px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--ws-color)" }}
          >
            Done
          </button>
        </div>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="Display">
      <div className="space-y-6 px-5 pb-2 pt-1">
        <DisplayControls />
        <button
          type="button"
          onClick={d.reset}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-rule text-sm font-medium"
        >
          Reset to defaults
        </button>
      </div>
    </Sheet>
  );
}

/**
 * The theme chips, on their own so the reader's settings sheet shows the
 * same control rather than its own copy.
 *
 * It had a copy, and the copy drifted: its dark chip was a #14110F block on a
 * #14110F sheet, which is an empty outline. One component means the next fix
 * lands in both places.
 */
export function ThemeSwatches({
  rule = "--color-rule",
  variant = "sheet",
}: {
  rule?: string;
  /** the desktop dialog draws each theme as a small page rather than "Aa" */
  variant?: "sheet" | "dialog";
}) {
  const { theme, setTheme } = useDisplay();
  if (variant === "dialog") return <ThemePages />;
  return (
    <div role="radiogroup" aria-label="Theme" className="flex gap-3">
      {/* Sepia is hidden — the designer's call, 7 Oct 2026 — but still drawn
          for a reader already on it, so the theme they are in has a chip that
          says so. Choosing any other takes it away for good. */}
      {THEMES.filter((t) => t.id !== "sepia" || theme === "sepia").map((t) => {
        const active = theme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${t.label} theme`}
            onClick={() => setTheme(t.id)}
            className="flex flex-1 flex-col items-center gap-1.5"
          >
            <span
              className="flex h-11 w-full items-center justify-center rounded-xl border text-sm font-semibold"
              style={{
                background: t.bg,
                color: t.ink,
                borderColor: active ? "var(--ws-ink)" : `var(${rule})`,
                boxShadow: active ? "0 0 0 2px var(--ws-ink)" : undefined,
              }}
              aria-hidden
            >
              Aa
            </span>
            <span className={`text-xs ${active ? "font-semibold" : "text-ink-soft"}`}>
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The controls without the sheet around them, so the Settings screen can show
 * the same three rows inline instead of hiding them behind another tap.
 */
export function DisplayControls({ variant = "sheet" }: { variant?: "sheet" | "dialog" }) {
  const { appTextScale, setAppTextScale, boldText, setBoldText } = useDisplay();
  if (variant === "dialog") return <DialogControls />;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-medium">Theme</h3>
        <ThemeSwatches />
        <p className="mt-2 text-xs text-ink-soft">
          Auto follows your device&apos;s light and dark setting, and changes with it.
        </p>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium">Text size</h3>
        {/* A sample above the control, because "Larger" means nothing until
            you have seen what it does to a line you will actually read. It
            needs no sizing of its own — the scale is applied at the root, so
            this line is already set in whatever is currently chosen and
            changes under the thumb as the steps are tapped. */}
        <p className="mb-3 rounded-xl border border-rule bg-card px-3 py-2.5 text-sm">
          Books, shelves and menus are set at this size.
        </p>
        <div
          role="radiogroup"
          aria-label="Text size"
          className="flex overflow-hidden rounded-xl border border-rule"
        >
          {APP_TEXT_SCALES.map((s, i) => {
            const active = s === appTextScale;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setAppTextScale(s)}
                className={`min-h-11 flex-1 px-1 text-xs transition-colors ${
                  active ? "font-semibold text-white" : "text-ink-soft"
                } ${i > 0 ? "border-s border-rule" : ""}`}
                style={active ? { background: "var(--ws-color)" } : undefined}
              >
                {APP_TEXT_LABELS[i]}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          Starts from whatever text size your phone is already set to. The reader has
          its own size for book text.
        </p>
      </section>

      <label className="flex items-center justify-between gap-4">
        <span className="min-w-0">
          <span className="block text-sm font-medium">Bold text</span>
          <span className="block text-xs text-ink-soft">
            Heavier menus and labels. Book text is left as printed.
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={boldText}
          aria-label="Bold text"
          onClick={() => setBoldText(!boldText)}
          className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] ${
            boldText ? "" : "bg-ink/20"
          }`}
          style={boldText ? { background: "var(--ws-color)" } : undefined}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              boldText ? "translate-x-5" : ""
            }`}
          />
        </button>
      </label>
    </div>
  );
}

/**
 * The desktop dialog's theme row: each theme as a little page in its own
 * colours — a title bar and two lines of text — rather than "Aa" on a chip.
 * At a desk there is room to show what the theme *does* to a screen. Auto is
 * the page split corner to corner, light and dark.
 */
function ThemePages() {
  const { theme, setTheme } = useDisplay();
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-4">
      {THEMES.filter((t) => t.id !== "sepia" || theme === "sepia").map((t) => {
        const active = theme === t.id;
        const auto = t.id === "system";
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${t.label} theme`}
            onClick={() => setTheme(t.id)}
            className="group flex flex-col items-center gap-2.5"
          >
            <span
              aria-hidden
              className={`relative block h-18 w-full overflow-hidden rounded-control border transition-shadow ${
                active ? "border-transparent ring-2 ring-(--ws-color) ring-offset-3 ring-offset-card" : "border-rule group-hover:border-ink-soft"
              }`}
              style={{ background: t.bg }}
            >
              <span className="absolute left-3 right-3 top-3 flex flex-col gap-1.5">
                <span
                  className="block h-1.5 w-1/3 rounded-full"
                  style={{ background: t.ink, opacity: auto ? 0.45 : 0.18 }}
                />
                <span
                  className="block h-1 w-5/6 rounded-full"
                  style={{ background: t.ink, opacity: auto ? 0.7 : 0.3 }}
                />
                <span
                  className="block h-1 w-1/2 rounded-full"
                  style={{ background: t.ink, opacity: auto ? 0.7 : 0.3 }}
                />
              </span>
            </span>
            <span className={`text-sm ${active ? "font-semibold text-ink" : "text-ink-soft"}`}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The dialog's three settings, divided by rules, as the comp lays them out. */
function DialogControls() {
  const { appTextScale, setAppTextScale, boldText, setBoldText } = useDisplay();
  return (
    <div className="divide-y divide-rule">
      <section className="pb-6 pt-3">
        <h3 className="mb-3 text-sm font-semibold">Theme</h3>
        <ThemePages />
        <p className="mt-4 text-xs text-ink-soft">
          Auto follows your device&apos;s light and dark setting, and changes with it.
        </p>
      </section>

      <section className="py-6">
        <h3 className="mb-3 text-sm font-semibold">Text size</h3>
        {/* The sample sits at the chosen size already — the scale is applied at
            the root — so it changes as the steps are clicked. */}
        <p className="flex min-h-20 items-center rounded-control border border-rule bg-card px-4 text-sm">
          Books, shelves and menus are set at this size.
        </p>
        <div
          role="radiogroup"
          aria-label="Text size"
          className="mt-3 flex gap-1 rounded-control border border-rule bg-inset p-1"
        >
          {APP_TEXT_SCALES.map((sc, i) => {
            const active = sc === appTextScale;
            return (
              <button
                key={sc}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setAppTextScale(sc)}
                className={`min-h-9 flex-1 rounded-md border text-sm transition-colors ${
                  active ? "border-rule bg-card font-semibold shadow-sm" : "border-transparent text-ink hover:bg-ink/5"
                }`}
                style={active ? { color: "var(--ws-ink)" } : undefined}
              >
                {APP_TEXT_LABELS[i]}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          Starts from whatever text size your device is already set to. The reader has its own
          size for book text.
        </p>
      </section>

      <label className="flex items-center justify-between gap-4 pt-6">
        <span className="min-w-0">
          <span className="block text-sm font-semibold">Bold text</span>
          <span className="block text-xs text-ink-soft">
            Heavier menus and labels. Book text is left as printed.
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={boldText}
          aria-label="Bold text"
          onClick={() => setBoldText(!boldText)}
          className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${boldText ? "" : "bg-ink/20"}`}
          style={boldText ? { background: "var(--ws-color)" } : undefined}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${boldText ? "translate-x-5" : ""}`}
          />
        </button>
      </label>
    </div>
  );
}
