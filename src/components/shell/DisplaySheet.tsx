"use client";

import { Sheet } from "@/components/reader/Sheet";
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
 * The controls without the sheet around them, so the Settings screen can show
 * the same three rows inline instead of hiding them behind another tap.
 */
export function DisplayControls() {
  const { theme, setTheme, appTextScale, setAppTextScale, boldText, setBoldText } =
    useDisplay();

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-medium">Theme</h3>
        <div role="radiogroup" aria-label="Theme" className="flex gap-3">
          {THEMES.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={t.label}
                onClick={() => setTheme(t.id)}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <span
                  className="flex h-11 w-full items-center justify-center rounded-xl border text-sm font-semibold"
                  style={{
                    background: t.bg,
                    color: t.ink,
                    borderColor: active ? "var(--ws-ink)" : "var(--color-rule)",
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
