// How this app writes a date, in one place.
//
// It was written three ways. `lib/events.ts` kept a twelve-entry table, the
// sutra card reassembled `Intl.formatToParts` under `en-US`, and a saved
// highlight asked `en-IN` for a short month and got "Sept" — the exact defect
// the table exists to prevent, under a comment arguing that a table would be
// the thing to go stale. Three answers to one question, and the one that
// argued hardest was the one that was wrong.

/**
 * Three letters, always.
 *
 * `Intl` under `en-IN` and `en-GB` abbreviates September to **"Sept"** — four
 * letters where the other eleven have three — and the comps print "5 Sep'26".
 * On a card whose date and location share one line at the largest text size,
 * the odd month out is the one that wraps.
 *
 * Written down rather than fetched from a locale that changes its mind. That
 * is not hypothetical: "Sept" is itself a CLDR revision, and a formatter whose
 * output can move under a browser update is not one to hang a layout on. The
 * cost is twelve strings that will never need editing, in a language this app
 * does not translate its chrome into.
 */
export const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "9 Sep" — where the year is either obvious or not worth the width. */
export function dayMonth(d: Date): string {
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

/** "10 Jul 2026" — the full form, where the row has the width for it. */
export function dayMonthYear(d: Date): string {
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "13 Nov'26" — the tight form, where two of these and a location share a
 *  line on a 390pt phone. */
export function dayMonthShortYear(d: Date): string {
  return `${dayMonth(d)}'${String(d.getFullYear()).slice(2)}`;
}

/**
 * An ISO calendar date, read as a calendar date.
 *
 * `new Date("2026-11-13")` is parsed as UTC midnight, so west of Greenwich it
 * formats as the 12th — a shivir that starts a day earlier than the poster
 * says, on the one screen whose whole job is when things happen. These are
 * dates, not instants: the parts are read out and rebuilt in local time.
 *
 * Only for a bare calendar date. A timestamp — a `created_at`, say — is an
 * instant and `new Date(iso)` is right for it.
 */
export function parseDay(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}
