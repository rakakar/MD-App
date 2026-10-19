"use client";

// How the whole app looks — the same three settings the "Aa" sheet holds,
// laid flat, as the Settings comps of 19 Oct 2026 draw them. At a desk text
// size is four named segments; on a phone it is a four-stop slider with the
// value named beside the heading, because four words across a phone card is
// a row of truncations at the larger sizes.

import { ThemePages } from "@/components/shell/DisplaySheet";
import { useDisplay } from "@/components/shell/DisplayProvider";
import { RadioSegmented } from "@/components/ui";
import { APP_TEXT_LABELS, APP_TEXT_SCALES } from "@/lib/storage";
import { CARD, RowTitle, SwitchRow } from "./parts";

const SAMPLE = "Books, shelves and menus are set at this size.";

export function AppearanceCard({ desktop }: { desktop: boolean }) {
  const { appTextScale, setAppTextScale, boldText, setBoldText } = useDisplay();
  const pad = desktop ? "px-7" : "px-5";

  return (
    <div className={`${CARD} ${pad} divide-y divide-rule`}>
      <section className="py-6">
        <RowTitle>Theme</RowTitle>
        {desktop && (
          <p className="mb-4 mt-0.5 text-sm text-ink-soft">
            Auto follows your device&apos;s light and dark setting, and changes with it.
          </p>
        )}
        <div className={desktop ? "" : "mt-4"}>
          <ThemePages tile={desktop ? "h-24" : "h-20"} />
        </div>
        {!desktop && (
          <p className="mt-4 text-sm text-ink-soft">
            Auto follows your device&apos;s light and dark setting.
          </p>
        )}
      </section>

      <section className="py-6">
        {desktop ? (
          <>
            <RowTitle>Text size</RowTitle>
            <p className="mb-4 mt-0.5 text-sm text-ink-soft">
              Starts from your device&apos;s text size. The reader has its own size for book text.
            </p>
            <RadioSegmented
              label="Text size"
              options={APP_TEXT_SCALES.map((s, i) => ({ value: s, label: APP_TEXT_LABELS[i] }))}
              value={appTextScale}
              onChange={setAppTextScale}
            />
            {/* The sample needs no sizing of its own: the scale is applied at
                the root, so this line is already set at whatever is chosen. */}
            <p className="mt-4 flex items-center gap-4 rounded-tile bg-inset px-5 py-4 text-sm text-ink">
              <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.09em] text-ink-soft">
                Preview
              </span>
              {SAMPLE}
            </p>
          </>
        ) : (
          <>
            <RowTitle
              aside={
                <span className="text-sm text-ink-soft">
                  {APP_TEXT_LABELS[Math.max(0, APP_TEXT_SCALES.indexOf(appTextScale))]}
                </span>
              }
            >
              Text size
            </RowTitle>
            <SizeSlider value={appTextScale} onChange={setAppTextScale} />
            <p className="mt-4 rounded-tile bg-inset px-4 py-4 text-sm text-ink">{SAMPLE}</p>
            <p className="mt-4 text-sm text-ink-soft">The reader has its own size for book text.</p>
          </>
        )}
      </section>

      <SwitchRow
        className="py-6"
        title="Bold text"
        description={
          desktop ? "Heavier menus and labels. Book text is left as printed." : "Book text is left as printed."
        }
        checked={boldText}
        onChange={setBoldText}
      />
    </div>
  );
}

/**
 * Four stops on a line, small A to large A.
 *
 * A real range input does the work — arrow keys, a screen reader's "Large,
 * 2 of 4" — laid invisibly over the drawing, so a tap anywhere on the track
 * lands on the nearest stop. The drawing is only that: a track, four dots and
 * the thumb, which follows the input's own focus ring.
 */
function SizeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const index = Math.max(0, APP_TEXT_SCALES.indexOf(value));
  const last = APP_TEXT_SCALES.length - 1;
  const at = (i: number) => `${(i / last) * 100}%`;
  return (
    <div className="mt-3 flex items-center gap-3">
      <span aria-hidden className="text-sm text-ink-soft">
        A
      </span>
      <div className="relative h-11 flex-1">
        <input
          type="range"
          min={0}
          max={last}
          step={1}
          value={index}
          onChange={(e) => onChange(APP_TEXT_SCALES[Number(e.target.value)])}
          aria-label="Text size"
          aria-valuetext={APP_TEXT_LABELS[index]}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div aria-hidden className="absolute inset-x-3.5 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-rule/70">
          {APP_TEXT_SCALES.map((s, i) =>
            i === index ? null : (
              <span
                key={s}
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/15"
                style={{ left: at(i) }}
              />
            )
          )}
          <span
            className="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-card shadow-card transition-[left]"
            style={{ left: at(index), borderColor: "var(--ws-color)" }}
          />
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-1 rounded-control peer-focus-visible:ring-2 peer-focus-visible:ring-(--ws-color)"
        />
      </div>
      <span aria-hidden className="text-2xl text-ink-soft">
        A
      </span>
    </div>
  );
}
