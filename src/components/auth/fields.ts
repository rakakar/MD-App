/** The sign-in screen's field, resting and focused. 16px type so iOS does not zoom on focus. */
export const FIELD =
  "mt-2 h-14 w-full rounded-tile border border-rule bg-card px-5 text-base text-ink " +
  // muted, not ink-soft: an example number in ink-soft read as already typed
  "placeholder:text-muted auth-field";

export const LABEL = "block text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft";

/** Session-storage key carrying an email to Create account to correct — set by
 *  the verify step's "Wrong email? Change it". Not a URL parameter: an address
 *  does not belong in history or logs. */
export const PREFILL_EMAIL_KEY = "md.auth.prefillEmail";
