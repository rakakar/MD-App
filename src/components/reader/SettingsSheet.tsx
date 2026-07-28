"use client";

import {
  FONT_SCALES,
  LINE_HEIGHTS,
  type ReaderTheme,
  type ReadingMode,
} from "@/lib/storage";
import { Sheet } from "./Sheet";

const THEMES: { id: ReaderTheme; label: string; swatch: string; ring: string }[] = [
  { id: "system", label: "Auto", swatch: "linear-gradient(135deg,#fdfbf7 50%,#17140f 50%)", ring: "#8a8073" },
  { id: "light", label: "Light", swatch: "#fdfbf7", ring: "#262019" },
  { id: "sepia", label: "Sepia", swatch: "#f4e8d3", ring: "#3d2f1e" },
  { id: "dark", label: "Dark", swatch: "#17140f", ring: "#e8e2d8" },
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
                      borderColor: active ? "var(--ws-color)" : "var(--reader-rule)",
                      boxShadow: active ? "0 0 0 2px var(--ws-color)" : undefined,
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
          <label className="flex items-center justify-between gap-4">
            <span className="min-w-0">
              <span className="block text-sm font-medium">Tap edges to turn pages</span>
              <span className="block text-xs text-(--reader-ink-soft)">
                Off: swipe to turn, tap anywhere for controls.
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={p.tapZones}
              aria-label="Tap edges to turn pages"
              onClick={() => p.onTapZones(!p.tapZones)}
              className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${
                p.tapZones ? "" : "bg-current/20"
              }`}
              style={p.tapZones ? { background: "var(--ws-color)" } : undefined}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  p.tapZones ? "translate-x-5" : ""
                }`}
              />
            </button>
          </label>
        )}

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
