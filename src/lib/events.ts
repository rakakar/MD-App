import type { CSSProperties } from "react";

/**
 * Connect → Events, as the API hands it over (Events_API_v1).
 *
 * **The app decides nothing it would have to recompute.** Which tab an event
 * falls under, which badge it wears, whether the prabodhak line reads a name
 * or "Multiple", what the card's location string says, what colour the
 * category chip is — every one of those arrives finished, and nothing in this
 * file works any of them out again.
 *
 * That is not tidiness. The old version of this file did the bucketing here,
 * in client-side date arithmetic, and the derivations in question *change
 * answer while nobody is deploying*: an event becomes Past at midnight. Two
 * clients deriving the same card from the same rules is how the two drift
 * apart, and a rule that ticks over on its own is how one of them is wrong
 * before anybody notices.
 *
 * What is left here is genuinely presentation: formatting an ISO date the way
 * the comps print it, and turning the panel's category colour into a chip that
 * clears AA in whichever theme the reader is in.
 */

export type EventBucket = "upcoming" | "ongoing" | "past";

export const EVENT_BUCKETS: EventBucket[] = ["upcoming", "ongoing", "past"];

export const BUCKET_LABEL: Record<EventBucket, string> = {
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  past: "Past",
};

/** `""` while an event is still to come; the grey pill beside the chip once it
 *  is over. The API sends the code, so the wording lives here — with a
 *  fallback, because a code this file has not met is still a real badge. */
const BADGE_LABEL: Record<string, string> = {
  completed: "Completed",
  recording_available: "Recording available",
};

export function badgeLabel(badge: string): string {
  return BADGE_LABEL[badge] ?? badge.replace(/_/g, " ");
}

/**
 * A shivir category — **data, not a fixed set**. The A–G list is a table the
 * panel owns: it can be renamed, recoloured, retired or added to without a
 * deploy, which is why the filter chips are built from `filters/` and there
 * are no seven chips written down anywhere in this app.
 */
export interface EventCategory {
  code: string;
  letter: string;
  name: string;
  /** the chip's text — "A · Jeevan Vidya Parichay", already assembled */
  display: string;
  /** the chip's colour and the card's edge stripe; see `categoryStyle` */
  accent: string;
}

export interface EventLanguage {
  code: string;
  name: string;
}

/** One card on the list screen. */
export interface EventCard {
  slug: string;
  title: string;
  category: EventCategory;
  language: EventLanguage;
  /** "Online" / "In person" — the printable one; `mode_code` is the filter key */
  mode: string;
  mode_code: string;
  /** one name, "Multiple", or "" — already resolved */
  prabodhak: string;
  /** the avatar's letters; "M" for multiple */
  prabodhak_initials: string;
  start_date: string;
  /** null for a single-day event — render just the start */
  end_date: string | null;
  /** the card's one location line, ready to print */
  location: string;
  city: string;
  state: string;
  bucket: EventBucket;
  badge: string;
}

export interface EventPrabodhak {
  id: number;
  name: string;
  initials: string;
  photo: string | null;
}

export interface EventContact {
  name: string;
  /** stored as typed, `+91` included — dial it, do not reformat it */
  phone: string;
}

export interface EventLink {
  /** `social` · `meeting` · `playlist` · `other` */
  type: string;
  /** what the row's eyebrow reads — "Social", "Meeting link" */
  type_label: string;
  label: string;
  url: string;
}

/** The detail screen: everything on the card, plus both halves of the design. */
export interface EventDetail extends EventCard {
  prabodhaks: EventPrabodhak[];
  tags: string[];
  address: string;
  map_url: string;
  /** absolute URL or null — a poster is optional */
  poster: string | null;
  /** plain text with blank lines between paragraphs; not HTML, not Markdown */
  invitation_note: string;
  /** the organiser's own form. There is no in-app registration, by design. */
  registration_url: string;
  contacts: EventContact[];
  /** the manager's order, and **excluding** the recording playlist */
  links: EventLink[];
  recording_url: string;
}

export interface EventListResponse {
  /** the three tab numbers, counted under the same filters as the list */
  counts: Record<EventBucket, number>;
  results: EventCard[];
}

export interface CountedOption {
  code: string;
  name: string;
  count: number;
}

export interface CountedCategory extends EventCategory {
  count: number;
}

/**
 * The filter sheet's options, each **counted with its own filter dropped** —
 * which is what lets an unselected category chip read 3 while the category
 * filter sits on something else.
 */
export interface EventFilterOptions {
  categories: CountedCategory[];
  languages: CountedOption[];
  modes: CountedOption[];
  /** only cities that actually have events in this bucket */
  cities: { name: string; count: number }[];
}

/** What the sheet is holding. Category and language are repeatable; mode and
 *  city are one-of, which is what the API accepts. */
export interface EventFilterState {
  categories: string[];
  languages: string[];
  mode: string;
  city: string;
}

export const EMPTY_EVENT_FILTERS: EventFilterState = {
  categories: [],
  languages: [],
  mode: "",
  city: "",
};

/** How many axes are on — the number on the Filters button. */
export function activeFilterCount(f: EventFilterState): number {
  return (
    f.categories.length + f.languages.length + (f.mode ? 1 : 0) + (f.city ? 1 : 0)
  );
}

export function hasFilters(f: EventFilterState): boolean {
  return activeFilterCount(f) > 0;
}

/**
 * The query string every events call shares — the list, the count behind
 * "Show N events", and the filter sheet itself.
 *
 * `URLSearchParams.append` rather than `set` for category and language: they
 * are repeatable, and `?category=a&category=b` means *either*. The generic
 * `qs()` in `lib/api` cannot express that, which is why this lives here.
 */
export function eventQuery(
  bucket: EventBucket,
  q: string,
  f: EventFilterState
): string {
  const p = new URLSearchParams();
  p.set("bucket", bucket);
  const query = q.trim();
  if (query) p.set("q", query);
  for (const c of f.categories) p.append("category", c);
  for (const l of f.languages) p.append("language", l);
  if (f.mode) p.set("mode", f.mode);
  if (f.city) p.set("city", f.city);
  return `?${p.toString()}`;
}

// ---- dates ----

/**
 * An ISO calendar date, read as a calendar date.
 *
 * `new Date("2026-11-13")` is parsed as UTC midnight, so west of Greenwich it
 * formats as the 12th — a shivir that starts a day earlier than the poster
 * says, on the one screen whose whole job is when things happen. These are
 * dates, not instants: the parts are read out and rebuilt in local time.
 */
function parseDay(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Three letters, always.
 *
 * `Intl` under `en-IN` and `en-GB` abbreviates September to **"Sept"** — four
 * letters where the other eleven have three — and the comps print "5 Sep'26".
 * On a card whose date and location share one line at the largest text size,
 * the odd month out is the one that wraps. Written down rather than fetched
 * from a locale that changes its mind.
 */
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "13 Nov'26" — the card's step, where two of these plus a location share a
 *  line on a 390pt phone. */
function cardDay(d: Date): string {
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}'${String(d.getFullYear()).slice(2)}`;
}

/** "10 Jul 2026" — the detail screen's, where the row has the width for it. */
function fullDay(d: Date): string {
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function range(start: string, end: string | null, fmt: (d: Date) => string): string {
  const a = parseDay(start);
  if (!a) return "";
  const b = parseDay(end);
  // An `end_date` equal to the start is a single day too — the API sends null
  // for one, but a manager who typed the same date twice means the same thing.
  if (!b || b.getTime() === a.getTime()) return fmt(a);
  return `${fmt(a)} – ${fmt(b)}`;
}

/**
 * "21–27 Sep'26" — the card's range, folded where the two ends agree.
 *
 * The long form is "21 Sep'26 – 27 Sep'26", which is 21 characters and does
 * not fit the card's grid column on a 375px phone: it truncated to
 * "21 Sep'26 – 27 …", losing the end of the shivir, which is not a fact a
 * range may drop. Folding the parts the two dates share gets it to 12 and
 * reads better besides — a shivir inside one month is one month, and saying
 * the month twice was the long form's own noise.
 *
 * It only folds what is genuinely shared: same month and year gives
 * "21–27 Sep'26", same year alone gives "28 Sep – 3 Oct'26", and a range
 * across new year stays long, because there nothing repeats.
 */
export function cardDateRange(e: Pick<EventCard, "start_date" | "end_date">): string {
  const a = parseDay(e.start_date);
  if (!a) return "";
  const b = parseDay(e.end_date);
  if (!b || b.getTime() === a.getTime()) return cardDay(a);
  if (a.getFullYear() !== b.getFullYear()) return `${cardDay(a)} – ${cardDay(b)}`;
  if (a.getMonth() !== b.getMonth()) {
    return `${a.getDate()} ${MONTH_SHORT[a.getMonth()]} – ${cardDay(b)}`;
  }
  return `${a.getDate()}–${cardDay(b)}`;
}

export function fullDateRange(e: Pick<EventCard, "start_date" | "end_date">): string {
  return range(e.start_date, e.end_date, fullDay);
}

// ---- the category's colour ----

/**
 * A category chip, painted in the category's own accent.
 *
 * **The FE keeps no palette for this.** The colour is a column in the panel's
 * category table, so retiring or recolouring a category is a manager's action
 * and not a deploy; a hex written down here would be a colour left behind that
 * nothing could change.
 *
 * What this file does add is the contrast the panel cannot promise. The five
 * *workspace* hues in `globals.css` were each tuned to clear AA as text, and
 * that is why `--ws-ink` is the raw hue in a light theme. These seven are not
 * tuned — `#D9A441` measures 1.9:1 on a pale tint — so the accent is mixed
 * toward the page's own ink before it is ever used as text, in both
 * directions: 55% deepens it on a light theme and lifts it on a dark one,
 * which is the same 55% the app already uses to rescue the workspace hues in
 * dark. Measured across all seven: 4.9–12:1 light, 7.6–9:1 dark.
 *
 * The fill stays the raw accent wherever the accent is the *background* — the
 * card's edge stripe — because no theme can change that pairing and it is
 * decoration standing beside a text label, never the only signal.
 */
export function categoryStyle(accent: string): CSSProperties {
  return {
    "--cat": accent,
    "--cat-ink": `color-mix(in srgb, ${accent} 55%, var(--color-ink))`,
    "--cat-tint": `color-mix(in srgb, ${accent} 14%, var(--color-card))`,
  } as CSSProperties;
}
