"use client";

import { useState } from "react";
import { useDisplay } from "@/components/shell/DisplayProvider";
import {
  DEFAULT_PREFS,
  FONT_SCALES,
  LINE_HEIGHTS,
  READER_SURFACES,
  type ReaderFace,
  type ReaderSurface,
  type ReadingMode,
} from "@/lib/storage";
import { Sheet } from "./Sheet";

/**
 * **Reading settings** — the reader's own panel, as the comps draw it. The
 * comps title it "Theme & Settings"; renamed 13 Oct 2026 (the designer's call)
 * so it is not mistaken for the app's theme.
 *
 * Everything here is device-local and works signed out. The order is the
 * designer's (13 Oct 2026): size first, because it is what a reader reaches
 * for; then reading style; then page colour, the overlay, spacing and face.
 */

/**
 * The six reading surfaces, each swatch painted in the surface it selects.
 *
 * A paint chip rather than a colour block: without the letters, the chip for
 * the surface you are already on disappears into the sheet behind it, and the
 * ink is the half of a surface a colour block cannot show you anyway.
 *
 * `original` has no colours of its own — it defers to the app theme — so its
 * chip is painted from the live reader tokens and follows whatever the app is
 * currently set to. That is exactly what choosing it does.
 */
/* Labels say what each one looks like, not a mood: "Quiet · Paper · Calm ·
   Focus" left readers tapping each to find out — the designer's call, 13 Oct
   2026. "Original" stays; "Auto" and "Match app" read worse. The ids, and so
   every saved choice, are unchanged. */
const SURFACES: Record<ReaderSurface, { label: string; bg: string; ink: string; bold?: boolean }> =
  {
    original: { label: "Original", bg: "var(--color-surface)", ink: "var(--color-ink)" },
    quiet: { label: "Dark", bg: "var(--color-surface-quiet)", ink: "var(--color-surface-quiet-ink)" },
    paper: { label: "Grey", bg: "var(--color-surface-paper)", ink: "var(--color-surface-paper-ink)" },
    bold: { label: "Bold text", bg: "var(--color-surface)", ink: "var(--color-ink)", bold: true },
    calm: { label: "Warm", bg: "var(--color-surface-calm)", ink: "var(--color-surface-calm-ink)" },
    focus: { label: "Cream", bg: "var(--color-surface-focus)", ink: "var(--color-surface-focus-ink)" },
  };

/* Named for how they look, not the printer's terms: Devanagari has no serifs,
   so "Serif / Sans" told readers nothing — the designer's call, 13 Oct 2026.
   Ids unchanged, so saved choices carry over. */
const FACES: { id: ReaderFace; label: string; stack: string }[] = [
  { id: "serif", label: "Classic", stack: "var(--font-devanagari)" },
  { id: "sans", label: "Simple", stack: "var(--font-devanagari-sans)" },
];

/** The comps name these Compact · Relaxed · Airy; the values are unchanged. */
const SPACING = [
  { label: "Compact", value: LINE_HEIGHTS[0] },
  { label: "Relaxed", value: LINE_HEIGHTS[1] },
  { label: "Airy", value: LINE_HEIGHTS[2] },
];

/** Reading mode, in the reader's words. Shared with the app's Settings page. */
export const MODES: { label: string; value: ReadingMode }[] = [
  { label: "Chapter-wise", value: "scroll" },
  { label: "Page by page", value: "page" },
];

export const MODE_HINT: Record<ReadingMode, string> = {
  page: "Like a printed book: one page at a time.",
  scroll: "The whole chapter on one long page. Slide up to keep reading.",
};


interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  fontScale: number;
  onFontScale: (v: number) => void;
  face: ReaderFace;
  onFace: (v: ReaderFace) => void;
  lineHeight: number;
  onLineHeight: (v: number) => void;
  mode: ReadingMode;
  onMode: (v: ReadingMode) => void;
  tapZones: boolean;
  onTapZones: (v: boolean) => void;
  showTapZones: boolean;
  glossaryUnderline: boolean;
  onGlossaryUnderline: (v: boolean) => void;
  onGoToPage: () => void;
}

export function SettingsSheet(p: SettingsSheetProps) {
  const { readerTheme, setReaderTheme } = useDisplay();

  return (
    <Sheet open={p.open} onClose={p.onClose} title="Reading settings">
      <div className="space-y-6 px-5 pt-4">
        <FontSize fontScale={p.fontScale} face={p.face} onFontScale={p.onFontScale} />

        {/* Named for what the reader does, not what the screen is: "Layout"
            and "Pages / Scroll" left readers guessing — the designer's call,
            13 Oct 2026. The line under it says what the chosen one is like. */}
        <Row label="Reading style">
          <Segmented
            ariaLabel="Reading style"
            options={MODES}
            value={p.mode}
            onChange={p.onMode}
          />
          <p className="mt-2 text-xs text-(--reader-ink-soft)">{MODE_HINT[p.mode]}</p>
        </Row>

        {p.showTapZones && (
          <Toggle
            label="Tap edges to turn pages"
            hint="Tap the right side for the next page, the left side to go back. When off, swipe instead."
            checked={p.tapZones}
            onChange={p.onTapZones}
          />
        )}

        <Row label="Page colour">
          <div role="radiogroup" aria-label="Reading surface" className="grid grid-cols-3 gap-2.5">
            {READER_SURFACES.map((id) => {
              const s = SURFACES[id];
              const active = readerTheme === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${s.label} reading surface`}
                  onClick={() => setReaderTheme(id)}
                  className="flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-tile border-2 transition-colors"
                  style={{
                    background: s.bg,
                    color: s.ink,
                    // Selection is never colour alone — the ring is the signal,
                    // and on a swatch already painted in six different colours
                    // it is the only one that could be.
                    borderColor: active ? "var(--ws-color)" : "var(--reader-rule)",
                  }}
                >
                  <span
                    aria-hidden
                    className={`text-xl leading-none ${s.bold ? "font-bold" : ""}`}
                  >
                    Aa
                  </span>
                  <span className={`text-xs ${active ? "font-semibold" : ""}`}>{s.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-(--reader-ink-soft)">
            Choose the page colour. Original uses the same colours as the rest of the app,
            so the page turns dark when the app does.
          </p>
        </Row>

        {/* Off by default, and it stays wherever the reader leaves it. The
            hint is the important half: with this off the definitions are
            still there, just not advertised — so nobody has to accept a
            marked-up page to get them. */}
        <Toggle
          label="Paribhasha overlay"
          hint="Show word meanings on tap. Even with this off: press and hold any word."
          checked={p.glossaryUnderline}
          onChange={p.onGlossaryUnderline}
        />

        <Row label="Line height">
          <Segmented
            ariaLabel="Line height"
            options={SPACING.map((s) => ({ label: s.label, value: s.value }))}
            value={p.lineHeight}
            onChange={p.onLineHeight}
          />
        </Row>

        <Row label="Font style">
          {/* Each option is set in the face it selects — the sample is the
              only description that actually tells you anything here. */}
          <div
            role="radiogroup"
            aria-label="Font style"
            className="flex gap-1 rounded-control bg-current/[0.06] p-1"
          >
            {FACES.map((f) => {
              const active = p.face === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={f.label}
                  onClick={() => p.onFace(f.id)}
                  className={`min-h-11 flex-1 rounded-control py-1 transition-colors ${
                    active
                      ? "bg-(--reader-bg) font-semibold shadow-card inset-ring inset-ring-(color:--ws-ink)"
                      : "text-(--reader-ink-soft)"
                  }`}
                >
                  <span lang="hi" className="block text-lg leading-tight" style={{ fontFamily: f.stack }}>
                    सत्य
                  </span>
                  <span className="block text-xs">{f.label}</span>
                </button>
              );
            })}
          </div>
        </Row>

        {p.showTapZones && (
          <button
            type="button"
            onClick={p.onGoToPage}
            className="w-full rounded-control border border-(--reader-rule) py-2.5 text-sm font-medium"
          >
            Go to printed page…
          </button>
        )}

      </div>
    </Sheet>
  );
}

/**
 * Text size: a sample line set at the size it will be, then A− · one dot per
 * step · A+. Shared by the sheet and the docked panel — the designer asked for
 * the phone's dots on the desktop too (3 Oct 2026).
 */
function FontSize({
  fontScale,
  face,
  onFontScale,
}: {
  fontScale: number;
  face: ReaderFace;
  onFontScale: (v: number) => void;
}) {
  const fontIndex = Math.max(0, FONT_SCALES.indexOf(fontScale));
  const stepFont = (delta: number) => {
    const next = FONT_SCALES[Math.min(FONT_SCALES.length - 1, Math.max(0, fontIndex + delta))];
    if (next !== fontScale) onFontScale(next);
  };
  // A−/A+ rather than a bare small and large A, so which way each one goes
  // is written on it; and feedback on every press — the designer's call, 26
  // Sep 2026. The sheet covers most of the page, so it carries its own
  // sample: a line set in the reader's face at the size it will be.
  return (
    <div>
      <div
        aria-hidden
        className="mb-3 flex h-14 items-center justify-center overflow-hidden rounded-control bg-current/[0.04] px-3"
      >
        <span
          lang="hi"
          className="truncate leading-normal transition-[font-size] duration-150 ease-out motion-reduce:transition-none"
          style={{
            fontFamily: (FACES.find((f) => f.id === face) ?? FACES[0]).stack,
            fontSize: `calc(1.125rem * ${fontScale})`,
          }}
        >
          अक्षर का आकार
        </span>
      </div>
      <div className="flex items-center gap-3">
        <StepBtn onClick={() => stepFont(-1)} disabled={fontIndex === 0} ariaLabel="Smaller text">
          <span className="text-sm font-semibold">
            A<span className="text-xs">−</span>
          </span>
        </StepBtn>
        {/* One dot per step, filled up to the size in use — the designer's
            call over a bar and an "N of 9" line: which step you are on
            and how far there is to go, counted rather than read. */}
        <div aria-hidden className="flex flex-1 items-center justify-between px-1">
          {FONT_SCALES.map((s, i) => {
            const on = i <= fontIndex;
            return (
              <span
                key={s}
                className={`h-2.5 w-2.5 rounded-full border-2 transition-[background-color,border-color,transform] duration-150 ease-out motion-reduce:transition-none ${
                  i === fontIndex ? "scale-125" : ""
                }`}
                style={{
                  borderColor: on ? "var(--ws-color)" : "color-mix(in srgb, currentColor 22%, transparent)",
                  background: on ? "var(--ws-color)" : "transparent",
                }}
              />
            );
          })}
        </div>
        <StepBtn
          onClick={() => stepFont(1)}
          disabled={fontIndex === FONT_SCALES.length - 1}
          ariaLabel="Larger text"
        >
          <span className="text-lg font-semibold">
            A<span className="text-sm">+</span>
          </span>
        </StepBtn>
      </div>
      <p aria-live="polite" className="sr-only">
        Text size {fontIndex + 1} of {FONT_SCALES.length}
        {fontScale === DEFAULT_PREFS.fontScale ? ", default" : ""}
      </p>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-(--reader-ink-soft)">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors ${
          checked ? "" : "bg-current/20"
        }`}
        style={checked ? { background: "var(--ws-color)" } : undefined}
      >
        <span
          className={`block h-6 w-6 rounded-full bg-card shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </label>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.09em] text-(--reader-ink-soft)">
        {label}
      </p>
      {children}
    </div>
  );
}

function StepBtn({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-(--reader-rule) disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/**
 * A pill sliding along a sunk track — the comps' shape for Pages/Scroll and
 * Compact/Relaxed/Airy, and the same shape as `CountedSegmented` in the app.
 * Its own copy rather than that component, because it paints in the *book's*
 * tokens and that one paints in the app's.
 */
function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  compact,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  /** the docked panel's size: a 36px row beside its label */
  compact?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`flex rounded-control bg-current/[0.06] ${compact ? "gap-0.5 p-0.5" : "gap-1 p-1"}`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            /* The raised pill, not the app's filled one. Four of these rows
               stack in this sheet, and four filled accent segments in one panel
               is the accent shouting over the settings it is describing. The
               sheet is also the one place a reader is *comparing* options
               rather than switching between two views.
               A hairline of the accent round the chosen one, though: most
               readers are past 45, and a soft shadow alone was too faint a
               "this one" — the designer's call, 13 Oct 2026. `--ws-ink`, not
               `--ws-color`, so the line still shows on the Dark page. Inset,
               so choosing never nudges the label — and `inset-ring`, never
               `ring-inset`: the app's `--color-inset` token makes
               `ring-inset` a colour as well, and it paints the line cream. */
            className={`flex-1 rounded-control px-2 text-sm transition-colors ${compact ? "min-h-9" : "min-h-11"} ${
              active
                ? "bg-(--reader-bg) font-semibold shadow-card inset-ring inset-ring-(color:--ws-ink)"
                : "text-(--reader-ink-soft)"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * **Theme & Settings, docked** — the desktop's version of the sheet above, as
 * a panel on the right that stays open while the page changes behind it. The
 * same settings in the same order as the sheet, so a reader who knows one
 * knows the other; the controls are a size smaller, to suit a pointer.
 */
export function SettingsPanel(
  p: Omit<SettingsSheetProps, "onGoToPage"> & {
    /** print editions only: go straight to a printed page from the panel */
    onGoToPrintedPage?: (n: number) => void;
  }
) {
  const { readerTheme, setReaderTheme } = useDisplay();
  const [page, setPage] = useState("");

  return (
    <aside
      aria-label="Reading settings"
      inert={!p.open}
      data-reader-chrome
      className={`fixed bottom-0 right-0 top-16 z-30 hidden w-80 flex-col border-l border-(--reader-rule) bg-(--reader-bg) transition-transform duration-300 ease-out motion-reduce:transition-none lg:flex ${
        p.open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between border-b border-(--reader-rule) py-3 pl-5 pr-3">
        <h2 className="text-sm font-semibold">Reading settings</h2>
        <button
          type="button"
          onClick={p.onClose}
          aria-label="Close settings"
          className="flex h-9 w-9 items-center justify-center rounded-md text-(--reader-ink-soft) transition-colors hover:bg-current/5"
        >
          ✕
        </button>
      </div>

      {/* The phone sheet's order, one list with no group headings — the
          designer's call, 13 Oct 2026: size, reading style (with its tap
          edges), paper, the overlay, spacing, face, then go-to-page. */}
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5">
        <FontSize fontScale={p.fontScale} face={p.face} onFontScale={p.onFontScale} />

        <Row label="Reading style">
          <Segmented
            compact
            ariaLabel="Reading style"
            options={MODES}
            value={p.mode}
            onChange={p.onMode}
          />
          <p className="mt-2.5 text-xs text-(--reader-ink-soft)">{MODE_HINT[p.mode]}</p>
        </Row>

        {p.showTapZones && (
          <Toggle
            label="Tap edges to turn pages"
            hint="Tap the right side for the next page, the left side to go back. When off, swipe instead."
            checked={p.tapZones}
            onChange={p.onTapZones}
          />
        )}

        <Row label="Page colour">
          <div role="radiogroup" aria-label="Reading surface" className="grid grid-cols-3 gap-2">
            {READER_SURFACES.map((id) => {
              const s = SURFACES[id];
              const active = readerTheme === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${s.label} reading surface`}
                  onClick={() => setReaderTheme(id)}
                  className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-tile border-2 transition-colors"
                  style={{
                    background: s.bg,
                    color: s.ink,
                    borderColor: active ? "var(--ws-color)" : "var(--reader-rule)",
                  }}
                >
                  <span aria-hidden className={`text-lg leading-none ${s.bold ? "font-bold" : ""}`}>
                    Aa
                  </span>
                  <span className={`text-xs ${active ? "font-semibold" : ""}`}>{s.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-xs text-(--reader-ink-soft)">
            Choose the page colour. Original uses the same colours as the rest of the app,
            so the page turns dark when the app does.
          </p>
        </Row>

        <Toggle
          label="Paribhasha overlay"
          hint="Show word meanings on tap. Even with this off: press and hold any word."
          checked={p.glossaryUnderline}
          onChange={p.onGlossaryUnderline}
        />

        <Row label="Line height">
          <Segmented
            compact
            ariaLabel="Line height"
            options={SPACING.map((s) => ({ label: s.label, value: s.value }))}
            value={p.lineHeight}
            onChange={p.onLineHeight}
          />
        </Row>

        <Row label="Font style">
          <Segmented
            compact
            ariaLabel="Font style"
            options={FACES.map((f) => ({ label: f.label, value: f.id }))}
            value={p.face}
            onChange={p.onFace}
          />
        </Row>

          {p.onGoToPrintedPage && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const n = Number(page);
                if (n > 0) p.onGoToPrintedPage?.(n);
              }}
              className="flex items-center gap-2"
            >
              <label htmlFor="settings-goto" className="flex-1 text-sm">
                Go to printed page
              </label>
              <input
                id="settings-goto"
                inputMode="numeric"
                value={page}
                onChange={(e) => setPage(e.target.value.replace(/\D/g, ""))}
                placeholder="—"
                className="h-9 w-16 rounded-md border border-(--reader-rule) bg-transparent text-center text-sm tabular-nums outline-none focus:border-(--ws-ink)"
              />
              <button
                type="submit"
                disabled={!page}
                className="h-9 rounded-md border border-(--reader-rule) px-3 text-sm font-semibold transition-colors hover:bg-current/5 disabled:opacity-40"
              >
                Go
              </button>
            </form>
          )}
      </div>
    </aside>
  );
}

