"use client";

import { useDisplay } from "@/components/shell/DisplayProvider";
import {
  FONT_SCALES,
  LINE_HEIGHTS,
  READER_SURFACES,
  type ReaderFace,
  type ReaderSurface,
  type ReadingMode,
} from "@/lib/storage";
import { Sheet } from "./Sheet";

/**
 * **Theme & Settings** — the reader's own panel, as the comps draw it.
 *
 * Everything here is device-local and works signed out. The order is the
 * comps': size first, because it is what a reader reaches for; then the paper;
 * then the three things about how the type is set; then the one switch.
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
const SURFACES: Record<ReaderSurface, { label: string; bg: string; ink: string; bold?: boolean }> =
  {
    original: { label: "Original", bg: "var(--color-surface)", ink: "var(--color-ink)" },
    quiet: { label: "Quiet", bg: "var(--color-surface-quiet)", ink: "var(--color-surface-quiet-ink)" },
    paper: { label: "Paper", bg: "var(--color-surface-paper)", ink: "var(--color-surface-paper-ink)" },
    bold: { label: "Bold", bg: "var(--color-surface)", ink: "var(--color-ink)", bold: true },
    calm: { label: "Calm", bg: "var(--color-surface-calm)", ink: "var(--color-surface-calm-ink)" },
    focus: { label: "Focus", bg: "var(--color-surface-focus)", ink: "var(--color-surface-focus-ink)" },
  };

const FACES: { id: ReaderFace; label: string; stack: string }[] = [
  { id: "serif", label: "Serif", stack: "var(--font-devanagari)" },
  { id: "sans", label: "Sans", stack: "var(--font-devanagari-sans)" },
];

/** The comps name these Compact · Relaxed · Airy; the values are unchanged. */
const SPACING = [
  { label: "Compact", value: LINE_HEIGHTS[0] },
  { label: "Relaxed", value: LINE_HEIGHTS[1] },
  { label: "Airy", value: LINE_HEIGHTS[2] },
];

const MARGINS = [
  { label: "Narrow", value: 0 },
  { label: "Normal", value: 1 },
  { label: "Wide", value: 2 },
];

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  fontScale: number;
  onFontScale: (v: number) => void;
  face: ReaderFace;
  onFace: (v: ReaderFace) => void;
  lineHeight: number;
  onLineHeight: (v: number) => void;
  margin: number;
  onMargin: (v: number) => void;
  mode: ReadingMode;
  onMode: (v: ReadingMode) => void;
  tapZones: boolean;
  onTapZones: (v: boolean) => void;
  showTapZones: boolean;
  glossaryUnderline: boolean;
  onGlossaryUnderline: (v: boolean) => void;
  onGoToPage: () => void;
  /** out to the app-wide Display sheet — app theme, app text size, bold */
  onAppDisplay: () => void;
}

export function SettingsSheet(p: SettingsSheetProps) {
  const { readerTheme, setReaderTheme } = useDisplay();
  const fontIndex = Math.max(0, FONT_SCALES.indexOf(p.fontScale));
  const stepFont = (delta: number) => {
    const next = FONT_SCALES[Math.min(FONT_SCALES.length - 1, Math.max(0, fontIndex + delta))];
    if (next !== p.fontScale) p.onFontScale(next);
  };

  return (
    <Sheet open={p.open} onClose={p.onClose} title="Theme & Settings">
      <div className="space-y-6 px-5 pt-4">
        {/* Size, with a small A and a large A at the ends — the comps' shape,
            and the one control on this sheet that needs no label because the
            two letters are the label. */}
        <div className="flex items-center gap-3">
          <StepBtn onClick={() => stepFont(-1)} disabled={fontIndex === 0} ariaLabel="Smaller text">
            <span className="text-sm">A</span>
          </StepBtn>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-current/15" role="presentation">
            <div
              className="h-full rounded-full transition-[width] duration-150"
              style={{
                width: `${((fontIndex + 1) / FONT_SCALES.length) * 100}%`,
                background: "var(--ws-color)",
              }}
            />
          </div>
          <StepBtn
            onClick={() => stepFont(1)}
            disabled={fontIndex === FONT_SCALES.length - 1}
            ariaLabel="Larger text"
          >
            <span className="text-xl">A</span>
          </StepBtn>
        </div>

        <Row label="Theme">
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
            The book&apos;s own paper. Original follows the app&apos;s theme, so it goes dark
            at night with everything else.
          </p>
        </Row>

        <Row label="Typeface">
          {/* Each option is set in the face it selects — the sample is the
              only description that actually tells you anything here. */}
          <div
            role="radiogroup"
            aria-label="Typeface"
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
                    active ? "bg-(--reader-bg) font-semibold shadow-card" : "text-(--reader-ink-soft)"
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

        <Row label="Layout">
          <Segmented
            ariaLabel="Reading mode"
            options={[
              { label: "Pages", value: "page" as const },
              { label: "Scroll", value: "scroll" as const },
            ]}
            value={p.mode}
            onChange={p.onMode}
          />
        </Row>

        <Row label="Line height">
          <Segmented
            ariaLabel="Line height"
            options={SPACING.map((s) => ({ label: s.label, value: s.value }))}
            value={p.lineHeight}
            onChange={p.onLineHeight}
          />
        </Row>

        <Row label="Margins">
          <Segmented ariaLabel="Margins" options={MARGINS} value={p.margin} onChange={p.onMargin} />
        </Row>

        {p.showTapZones && (
          <Toggle
            label="Tap edges to turn pages"
            hint="Off: swipe to turn, tap anywhere for controls."
            checked={p.tapZones}
            onChange={p.onTapZones}
          />
        )}

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

        {p.showTapZones && (
          <button
            type="button"
            onClick={p.onGoToPage}
            className="w-full rounded-control border border-(--reader-rule) py-2.5 text-sm font-medium"
          >
            Go to printed page…
          </button>
        )}

        {/* Everything above sets this book. This sets the app the book is
            sitting in — and since the two themes became separate axes, that is
            a different question rather than the same one twice. */}
        <button
          type="button"
          onClick={p.onAppDisplay}
          className="flex min-h-11 w-full items-center justify-between border-t border-(--reader-rule) pt-4 text-sm"
        >
          <span>App display settings</span>
          <span aria-hidden className="text-(--reader-ink-soft)">
            →
          </span>
        </button>
      </div>
    </Sheet>
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
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex gap-1 rounded-control bg-current/[0.06] p-1"
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
               rather than switching between two views. */
            className={`min-h-11 flex-1 rounded-control text-sm transition-colors ${
              active
                ? "bg-(--reader-bg) font-semibold shadow-card"
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
