"use client";

/**
 * The on/off switch, as Settings' comps draw it (19 Oct 2026): a 52×30 track,
 * the accent when on, a white knob that slides.
 *
 * The track is drawn at 30px because that is what a switch looks like; the
 * pseudo-element grows the *target* past the 44px floor without growing the
 * track. State is never the colour alone — the knob's side carries it, and
 * `aria-checked` carries it for anyone not looking.
 */
export function Switch({
  checked,
  onChange,
  label,
  describedBy,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** the accessible name — the row's title */
  label: string;
  /** id of the row's description, read after the name */
  describedBy?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7.5 w-13 shrink-0 rounded-full p-0.5 transition-colors before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] disabled:opacity-50 ${
        checked ? "" : "bg-ink/15"
      }`}
      style={checked ? { background: "var(--ws-color)" } : undefined}
    >
      <span
        className={`block h-6.5 w-6.5 rounded-full bg-white shadow-card transition-transform ${
          checked ? "translate-x-5.5" : ""
        }`}
      />
    </button>
  );
}
