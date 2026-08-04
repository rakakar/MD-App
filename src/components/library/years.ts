import type { FacetValue } from "@/lib/types";

/**
 * Years, grouped into bands once there are too many of them to read as years.
 *
 * The designer draws the year control as ranges — "1998–2000", "2001–2005" —
 * and that is right for the archive it was drawn against: A. Nagraj ji's
 * material runs 1997 to 2015, and nineteen pills is not a control, it is a
 * wall. It is wrong for a folder holding three seasons, where "2003–2005"
 * hides the one fact the reader wanted.
 *
 * So the shape follows the data rather than the mockup: individual years while
 * they still fit, bands once they do not. A band is only ever a shorthand for
 * the years inside it (see `toggleGroup`) — nothing downstream, in the URL or
 * at the endpoint, knows bands exist.
 */
export const BAND_AFTER = 8;

/** the width of a band, in years — five, as the design draws them */
const BAND_YEARS = 5;

export interface YearBand {
  /** what the pill says — "2004" or "2001–2005" */
  label: string;
  /** every year it stands for, which is what the URL carries */
  values: string[];
  /** rows this pill would yield: exact, because a row has one year */
  count: number;
}

/**
 * Newest first, which is how a reader asks for a shivir.
 *
 * The endpoint ranks every axis by count — right for words, wrong for numbers:
 * "2013 · 2005 · 1999 · 1997" reads as broken however correct it is.
 */
export function yearBands(facets: FacetValue[] | undefined): YearBand[] {
  const years = [...(facets ?? [])]
    .filter((f) => /^\d{4}$/.test(f.value))
    .sort((a, b) => b.value.localeCompare(a.value));
  if (years.length === 0) return [];
  if (years.length <= BAND_AFTER) {
    return years.map((y) => ({ label: y.value, values: [y.value], count: y.count }));
  }

  // Bands are anchored to the decade rather than to the newest year present,
  // so the same material is always in the same band: a shelf gaining a 2016
  // recording must not slide every older pill by one and relabel the lot.
  const bands = new Map<number, YearBand>();
  for (const year of years) {
    const n = Number(year.value);
    const start = Math.floor(n / BAND_YEARS) * BAND_YEARS;
    const band = bands.get(start) ?? {
      label: `${start}–${start + BAND_YEARS - 1}`,
      values: [],
      count: 0,
    };
    band.values.push(year.value);
    band.count += year.count;
    bands.set(start, band);
  }
  return [...bands.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, band]) => band);
}

/** "1997–2015", for a summary line that has one line to say what is in here. */
export function yearSpan(facets: FacetValue[] | undefined): string {
  const years = (facets ?? [])
    .map((f) => f.value)
    .filter((v) => /^\d{4}$/.test(v))
    .sort();
  if (years.length === 0) return "";
  const first = years[0];
  const last = years[years.length - 1];
  return first === last ? first : `${first}–${last}`;
}
