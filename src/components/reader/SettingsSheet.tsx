"use client";

import {
  FONT_SCALES,
  LINE_HEIGHTS,
  type ReaderFace,
  type ReaderTheme,
  type ReadingMode,
} from "@/lib/storage";
import { Sheet } from "./Sheet";

const THEMES: { id: ReaderTheme; label: string; swatch: string; ring: string }[] = [
  { id: "system", label: "Auto", swatch: "linear-gradient(135deg,#fdfbf8 50%,#14110f 50%)", ring: "#8a8073" },
  { id: "light", label: "Light", swatch: "#fdfbf8", ring: "#262019" },
  { id: "sepia", label: "Sepia", swatch: "#f5ebdc", ring: "#3d2f1e" },
  { id: "dark", label: "Dark", swatch: "#14110f", ring: "#e8e2d8" },
];

const FACES: { id: ReaderFace; label: string; stack: string }[] = [
  { id: "serif", label: "Serif", stack: "var(--font-devanagari)" },
  { id: "sans", label: "Sans", stack: "var(--font-devanagari-sans)" },
];

const SPACING = [
  { label: "Normal", value: LINE_HEIGHTS[0] },
  { label: "Relaxed", value: LINE_HEIGHTS[1] },
  { label: "Loose", value: LINE_HEIGHTS[2] },
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
  theme: ReaderTheme;
  onTheme: (v: ReaderTheme) => void;
  mode: ReadingMode;
  onMode: (v: ReadingMode) => void;
  tapZones: boolean;
  onTapZones: (v: boolean) => void;
  showTapZones: boolean;
  glossaryUnderline: boolean;
  onGlossaryUnderline: (v: boolean) => void;
  onGoToPage: () => void;
}

/** Reading settings. Everything here is device-local and works signed out. */
export function SettingsSheet(p: SettingsSheetProps) {
  const fontIndex = Math.max(0, FONT_SCALES.indexOf(p.fontScale));
  const stepFont = (delta: number) => {
    const next = FONT_SCALES[Math.min(FONT_SCALES.length - 1, Math.max(0, fontIndex + delta))];
    if (next !== p.fontScale) p.onFontScale(next);
  };

  return (
    <Sheet open={p.open} onClose={p.onClose} title="Reading settings">
      <div className="space-y-5 px-5 pt-1">
        <Row label="Text size">
          <div className="flex items-center gap-2">
            <StepBtn onClick={() => stepFont(-1)} disabled={fontIndex === 0} ariaLabel="Smaller text">
              <span className="text-sm">A</span>
            </StepBtn>
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-current/15"
              role="presentation"
            >
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
        </Row>

        <Row label="Typeface">
          {/* Each option is set in the face it selects — the sample is the
              only description that actually tells you anything here. */}
          <div
            role="radiogroup"
            aria-label="Typeface"
            className="flex overflow-hidden rounded-xl border border-(--reader-rule)"
          >
            {FACES.map((f, i) => {
              const active = p.face === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={f.label}
                  onClick={() => p.onFace(f.id)}
                  className={`min-h-11 flex-1 py-1.5 transition-colors ${
                    active ? "text-white" : "text-(--reader-ink-soft)"
                  } ${i > 0 ? "border-s border-(--reader-rule)" : ""}`}
                  style={active ? { background: "var(--ws-color)" } : undefined}
                >
                  <span
                    lang="hi"
                    className="block text-lg leading-tight"
                    style={{ fontFamily: f.stack }}
                  >
                    सत्य
                  </span>
                  <span className={`block text-[11px] ${active ? "font-semibold" : ""}`}>
                    {f.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Row>

        <Row label="Line spacing">
          <Segmented
            ariaLabel="Line spacing"
            options={SPACING.map((s) => ({ label: s.label, value: s.value }))}
            value={p.lineHeight}
            onChange={p.onLineHeight}
          />
        </Row>

        <Row label="Margins">
          <Segmented
            ariaLabel="Margins"
            options={MARGINS}
            value={p.margin}
            onChange={p.onMargin}
          />
        </Row>

        <Row label="Theme">
          <div role="radiogroup" aria-label="Theme" className="flex gap-3">
            {THEMES.map((t) => {
              const active = p.theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${t.label} theme`}
                  onClick={() => p.onTheme(t.id)}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <span
                    className="h-11 w-full rounded-xl border transition-shadow"
                    style={{
                      background: t.swatch,
                      borderColor: active ? "var(--ws-ink)" : "var(--reader-rule)",
                      boxShadow: active ? "0 0 0 2px var(--ws-ink)" : undefined,
                    }}
                    aria-hidden
                  />
                  <span
                    className={`text-[11px] ${active ? "font-semibold" : "text-(--reader-ink-soft)"}`}
                  >
                    {t.label}
                  </span>
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
          label="परिभाषा underline दिखाएँ"
          hint="बंद रहने पर भी: किसी शब्द को दबाकर रखें → परिभाषा।"
          checked={p.glossaryUnderline}
          onChange={p.onGlossaryUnderline}
        />

        {p.showTapZones && (
          <button
            type="button"
            onClick={p.onGoToPage}
            className="w-full rounded-xl border border-(--reader-rule) py-2.5 text-sm font-medium"
          >
            Go to printed page…
          </button>
        )}
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
        <span lang="hi" className="hi block text-sm font-medium">
          {label}
        </span>
        <span lang="hi" className="hi block text-xs text-(--reader-ink-soft)">
          {hint}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${
          checked ? "" : "bg-current/20"
        }`}
        style={checked ? { background: "var(--ws-color)" } : undefined}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
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
      <p className="mb-2 text-sm font-medium">{label}</p>
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
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-(--reader-rule) disabled:opacity-35"
    >
      {children}
    </button>
  );
}

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
      className="flex overflow-hidden rounded-xl border border-(--reader-rule)"
    >
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`min-h-11 flex-1 text-sm transition-colors ${
              active ? "font-semibold text-white" : "text-(--reader-ink-soft)"
            } ${i > 0 ? "border-s border-(--reader-rule)" : ""}`}
            style={active ? { background: "var(--ws-color)" } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
