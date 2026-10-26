"use client";

import { FIELD, LABEL } from "@/components/auth/fields";
import { ChevronDownIcon } from "@/components/shell/icons";
import { INDIAN_STATES, OUTSIDE_INDIA, type ProfileValues } from "@/lib/profile";

/** Digits only, at most ten — a pasted "+91 98765 43210" loses its 91. */
function tenDigits(raw: string): string {
  const d = raw.replace(/\D/g, "");
  return (d.length > 10 && d.startsWith("91") ? d.slice(2) : d).slice(0, 10);
}

export function profileReady(v: ProfileValues): boolean {
  return v.name.trim() !== "" && v.mobile.length === 10 && v.state !== "" && v.city.trim() !== "";
}

/**
 * The four "A little about you" fields — name, mobile, state, city — as both
 * the post-sign-in step and the Profile page's Edit draw them, so the two can
 * never ask for the same thing in different ways.
 *
 * `split` puts State and City side by side, as the desktop comps do; stacked
 * otherwise.
 */
export function ProfileFields({
  value,
  onChange,
  split = false,
  idPrefix = "profile",
}: {
  value: ProfileValues;
  onChange: (next: ProfileValues) => void;
  split?: boolean;
  /** two copies on one page (the edit sheet over the page) need distinct ids */
  idPrefix?: string;
}) {
  const set = (patch: Partial<ProfileValues>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-5">
      <label className={LABEL}>
        Full name
        <input
          type="text"
          autoComplete="name"
          enterKeyHint="next"
          placeholder="Your name"
          value={value.name}
          onChange={(e) => set({ name: e.target.value })}
          className={`${FIELD} normal-case tracking-normal font-normal`}
        />
      </label>

      <div>
        <label htmlFor={`${idPrefix}-mobile`} className={LABEL}>
          Mobile number
        </label>
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute start-5 top-[calc(50%+0.25rem)] -translate-y-1/2 text-base text-ink-soft"
          >
            +91
          </span>
          <input
            id={`${idPrefix}-mobile`}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            enterKeyHint="next"
            aria-label="Mobile number, ten digits after +91"
            placeholder="98765 43210"
            value={value.mobile}
            onChange={(e) => set({ mobile: tenDigits(e.target.value) })}
            className={`${FIELD} ps-14`}
          />
        </div>
      </div>

      <div className={split ? "grid grid-cols-2 gap-4" : "flex flex-col gap-5"}>
        <div>
          <label htmlFor={`${idPrefix}-state`} className={LABEL}>
            State
          </label>
          <div className="relative">
            <select
              id={`${idPrefix}-state`}
              autoComplete="address-level1"
              value={value.state}
              onChange={(e) => set({ state: e.target.value })}
              className={`${FIELD} appearance-none pe-12`}
              // the unchosen state reads as a placeholder, as drawn
              style={value.state ? undefined : { color: "var(--color-ink-soft)" }}
            >
              <option value="" disabled>
                Choose a state
              </option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value={OUTSIDE_INDIA}>{OUTSIDE_INDIA}</option>
            </select>
            <ChevronDownIcon className="pointer-events-none absolute end-5 top-[calc(50%+0.25rem)] h-4 w-4 -translate-y-1/2 text-ink-soft" />
          </div>
        </div>

        <label className={LABEL}>
          City
          <input
            type="text"
            autoComplete="address-level2"
            enterKeyHint="done"
            placeholder="e.g. Raipur"
            value={value.city}
            onChange={(e) => set({ city: e.target.value })}
            className={`${FIELD} normal-case tracking-normal font-normal`}
          />
        </label>
      </div>
    </div>
  );
}
