"use client";

import { FIELD, LABEL } from "@/components/auth/fields";
import { ChevronDownIcon } from "@/components/shell/icons";
import { Switch } from "@/components/ui/Switch";
import { INDIAN_STATES, OUTSIDE_INDIA, type LockedField, type ProfileValues } from "@/lib/profile";

/** `updates` is the WhatsApp-updates opt-in, drawn as a switch. */
export type ProfileField = "name" | "mobile" | "email" | "state" | "city" | "updates";

/** The sign-in step's four, and the opt-in. Email is asked for only where details are edited. */
export const STEP_FIELDS: ProfileField[] = ["name", "mobile", "state", "city", "updates"];

/** Digits only, at most ten — a pasted "+91 98765 43210" loses its 91. */
function tenDigits(raw: string): string {
  const d = raw.replace(/\D/g, "");
  return (d.length > 10 && d.startsWith("91") ? d.slice(2) : d).slice(0, 10);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A field the reader can read but not change: recessed, its text quieter. */
const LOCKED_FIELD = FIELD.replace("bg-card", "bg-inset").replace(" text-ink ", " text-ink-soft ");

/**
 * Whether the fields shown can be saved.
 *
 * `required` is the sign-in step: every field filled — but a reader outside
 * India has no +91 number to give, so for them the mobile may stay empty.
 * Otherwise (editing in Settings or on the Profile) a field may be left
 * empty, but what is typed must be whole — ten digits, an address with an @ —
 * and the name, which the account cannot be without, stays required.
 */
export function profileReady(v: ProfileValues, fields: ProfileField[], required = false): boolean {
  const email = (v.email ?? "").trim();
  const mobileRequired = required && v.state !== OUTSIDE_INDIA;
  return fields.every((f) => {
    switch (f) {
      case "name":
        return v.name.trim() !== "";
      case "mobile":
        return mobileRequired ? v.mobile.length === 10 : v.mobile.length === 0 || v.mobile.length === 10;
      case "email":
        return required ? EMAIL.test(email) : email === "" || EMAIL.test(email);
      case "state":
        return !required || v.state !== "";
      case "city":
        return !required || v.city.trim() !== "";
      case "updates":
        return true;
    }
  });
}

/**
 * The profile fields — name, mobile, email, state, city — as the post-sign-in
 * step, the Profile page's Edit and Settings draw them, so they can never ask
 * for the same thing in different ways. `fields` picks which, in this order.
 *
 * `split` puts State and City side by side, as the desktop comps do; stacked
 * otherwise. `locked` are the fields the reader signs in with — the server's
 * card lists them — which are shown read-only, with a line saying why:
 * changing them here would change how the reader signs in.
 */
export function ProfileFields({
  value,
  onChange,
  fields = STEP_FIELDS,
  split = false,
  idPrefix = "profile",
  locked = [],
}: {
  value: ProfileValues;
  onChange: (next: ProfileValues) => void;
  fields?: ProfileField[];
  split?: boolean;
  /** two copies on one page (the edit sheet over the page) need distinct ids */
  idPrefix?: string;
  locked?: LockedField[];
}) {
  const set = (patch: Partial<ProfileValues>) => onChange({ ...value, ...patch });
  const has = (f: ProfileField) => fields.includes(f);
  const email = value.email ?? "";
  const mobileLocked = locked.includes("mobile");
  const emailLocked = locked.includes("email");
  const lockedNote = (field: LockedField) => (
    <p id={`${idPrefix}-${field}-note`} className="mt-2 text-xs leading-relaxed text-ink-soft">
      You sign in with this {field === "mobile" ? "number" : "email"}, so it can&rsquo;t be changed here.
    </p>
  );

  const state = has("state") && (
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
  );

  const city = has("city") && (
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
  );

  return (
    <div className="flex flex-col gap-5">
      {has("name") && (
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
      )}

      {has("mobile") && (
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
            {/* A hint, not a sample: a real-looking number in the field read
                as somebody's (designer, 26 Oct 2026). */}
            <input
              id={`${idPrefix}-mobile`}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              enterKeyHint="next"
              aria-label="Mobile number, ten digits after +91"
              placeholder="10-digit mobile number"
              value={value.mobile}
              onChange={(e) => set({ mobile: tenDigits(e.target.value) })}
              readOnly={mobileLocked}
              aria-describedby={mobileLocked ? `${idPrefix}-mobile-note` : undefined}
              className={`${mobileLocked ? LOCKED_FIELD : FIELD} ps-14`}
            />
          </div>
          {mobileLocked && lockedNote("mobile")}
        </div>
      )}

      {has("email") && (
        <div>
          <label className={LABEL}>
            Email
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              enterKeyHint="next"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => set({ email: e.target.value })}
              readOnly={emailLocked}
              aria-describedby={emailLocked ? `${idPrefix}-email-note` : undefined}
              className={`${emailLocked ? LOCKED_FIELD : FIELD} normal-case tracking-normal font-normal`}
            />
          </label>
          {emailLocked && lockedNote("email")}
        </div>
      )}

      {(state || city) &&
        (split && state && city ? (
          <div className="grid grid-cols-2 gap-4">
            {state}
            {city}
          </div>
        ) : (
          <>
            {state}
            {city}
          </>
        ))}

      {/* Off until the reader turns it on: WhatsApp's policy and the DPDP Act
          both want a yes, not a default. */}
      {has("updates") && (
        <div className="flex items-center gap-4 rounded-tile border border-rule bg-card px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-ink">Shivir and centre updates</p>
            <p id={`${idPrefix}-updates-note`} className="mt-0.5 text-sm leading-relaxed text-ink-soft">
              Send them to my WhatsApp. Turn off any time in Settings.
            </p>
          </div>
          <Switch
            checked={value.updates_opt_in ?? false}
            onChange={(next) => set({ updates_opt_in: next })}
            label="Shivir and centre updates on WhatsApp"
            describedBy={`${idPrefix}-updates-note`}
          />
        </div>
      )}
    </div>
  );
}
