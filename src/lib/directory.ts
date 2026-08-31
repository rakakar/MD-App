/**
 * Connect → Centres, City-wise contacts and Links, as the API hands them over
 * (Connect_Directory_v1).
 *
 * **The app decides nothing it would have to recompute** — the same rule the
 * events module follows, and here it is almost the whole of this file. The
 * "Est. 2011" pill, the CS/SP avatar letters, the "Achoti, Chhattisgarh" line
 * under a name, the dialable form of a phone number and the `1.` `6.` `a.`
 * numbering on the Links page all arrive finished. Nothing below works any of
 * them out again.
 *
 * The numbering is the one worth spelling out: it comes from the *order of the
 * rows*, so a link inserted in the middle renumbers the rest on the server.
 * Numbering them here would be a second implementation of the same rule, and
 * the two would disagree the first time a manager reordered anything.
 *
 * What is left is presentation the API cannot do: which of a card's blocks
 * exist at all, given that most fields are optional by design.
 */

export interface DirectoryState {
  code: string;
  name: string;
}

/** One person — a card on the city-wise screen, and a row in a centre's
 *  CONTACT block. The same shape in both places, so there is one component. */
export interface DirectoryContact {
  id: number;
  name: string;
  /** usually "" — a designation like "Sanyojak", printed under the name */
  role: string;
  /** the avatar's two letters, already worked out */
  initials: string;
  /** as written down — print this */
  phone: string;
  /** the same number, dialable — use it in `tel:`, never reformat `phone` */
  phone_href: string;
  email: string;
  city: string;
  state: DirectoryState | null;
  /** "Achoti, Chhattisgarh" — the grey line under the name, ready to print */
  location: string;
}

export interface CentreProgramme {
  code: string;
  name: string;
}

/** One card on the Centres screen — collapsed and expanded both, because the
 *  card expands in place and there is no detail call to make. */
export interface Centre {
  id: number;
  /** the whole heading, ready to print — "Achoti, Raipur, CG" */
  name: string;
  /** the line under it — "Abhyuday Sansthan". Often "" */
  org_name: string;
  est_year: number | null;
  /** "Est. 2011", or "" for a centre with no year */
  est_label: string;
  city: string;
  state: DirectoryState | null;
  address: string;
  pincode: string;
  map_url: string;
  phone: string;
  phone_href: string;
  website: string;
  programmes: CentreProgramme[];
  contacts: DirectoryContact[];
  /** an optional extra line inside More details */
  note: string;
}

export interface ContactStates {
  /** what "All states" resets to */
  total: number;
  /** only states that actually have somebody — this is the whole list to draw */
  states: (DirectoryState & { count: number })[];
}

/** A row inside an expanded link group. */
export interface LinkRow {
  id: number;
  /** the printed prefix, dot included — "1.", "6.", "a." */
  number: string;
  label: string;
  /** "" on a heading row */
  url: string;
  /** a row with no URL: the label above its children, styled as a heading */
  is_heading: boolean;
  /** top-level rows only, and one level deep */
  children?: LinkRow[];
}

/** `chat` · `video` · `facebook` · `people` · `link` — a code, not an image:
 *  the glyphs are this app's, so a manager changing a group's icon is a panel
 *  row rather than four uploads. */
export type LinkIconKey = "chat" | "video" | "facebook" | "people" | "link";

export interface LinkGroup {
  code: string;
  title: string;
  icon: LinkIconKey | string;
  items: LinkRow[];
}

/**
 * Whether a centre has anything to show behind "More details".
 *
 * Asked in one place because the answer decides two things — whether the
 * disclosure is drawn at all, and whether the chevron is a toggle or nothing.
 * A centre with no programmes, no contacts and no note is not unusual: three
 * of the four cards in the comps are exactly that.
 */
export function hasMoreDetails(centre: Centre): boolean {
  return (
    centre.programmes.length > 0 || centre.contacts.length > 0 || centre.note.trim() !== ""
  );
}

/**
 * The state filter's value, as this screen holds it: `""` means All states.
 *
 * A string rather than `string | null` because it is also the query parameter,
 * and the API reads a missing `state` as "every state" — so the empty value and
 * the wire format are the same thing, and there is no conversion to get wrong.
 */
export const ALL_STATES = "";

/** The chooser's own label — the name of the chosen state, or the prompt. */
export function stateButtonLabel(
  code: string,
  states: ContactStates["states"]
): string {
  if (code === ALL_STATES) return "Choose a state";
  return states.find((s) => s.code === code)?.name ?? "Choose a state";
}
