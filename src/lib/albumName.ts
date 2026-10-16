/**
 * **Album names as a reader reads them** — "Anubhav Shivir", dated Jan 2013,
 * rather than "2013 01 Jan Anubhav Shivir".
 *
 * The recordings archive arrived from pCloud with its folder names kept as
 * they were, and those names carry their date twice: a number so the folders
 * sort by time in a file browser, then the month again in words. The data
 * stays exactly that — the import matches on it, and the leading date is what
 * keeps the albums in order — and only the drawing changes: the name loses
 * its date prefix and the date is printed as a date, once, where the card or
 * the page keeps its facts.
 *
 * A name without the prefix is returned untouched, so every other folder in
 * the library is unaffected.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2013 01 Jan Anubhav Shivir", "2010 07 July Praveen Atishi",
// "2010 09 Sep Shriram 01" — year, month number, the month again in words
// (any spelling of it, or none), then the name.
const PREFIX = /^((?:19|20)\d{2})[\s._-]+(\d{1,2})[\s._-]+(?:([A-Za-z]{3,9})\.?[\s._-]+)?(.+)$/;

export interface AlbumName {
  /** the name without its date prefix — or the whole name, where it has none */
  title: string;
  /** "Jan 2013", or null where the name carries no date */
  date: string | null;
}

export function splitAlbumName(name: string): AlbumName {
  const m = PREFIX.exec(name.trim());
  if (!m) return { title: name, date: null };
  const [, year, monthDigits, monthWord, rest] = m;
  const month = Number(monthDigits);
  // A word that is not this month's name is part of the title, not a repeat
  // of the date: "2010 07 Jul Shivir" drops "Jul", "2010 07 Sharma" keeps it.
  const repeats = monthWord && MONTHS[month - 1]?.toLowerCase() === monthWord.slice(0, 3).toLowerCase();
  if (month < 1 || month > 12) return { title: name, date: null };
  const title = (repeats || !monthWord ? rest : `${monthWord} ${rest}`).trim();
  return title ? { title, date: `${MONTHS[month - 1]} ${year}` } : { title: name, date: null };
}

/** The name and its date on one line, for places with room for one string:
 *  a breadcrumb, a tab title, the player's album line. */
export function albumName(name: string): string {
  const { title, date } = splitAlbumName(name);
  return date ? `${title} · ${date}` : title;
}

/** A catalogue year as a date: "2013-01" → "Jan 2013"; "2013" stays "2013". */
export function formatYear(year: string | null | undefined): string {
  if (!year) return "";
  const m = /^(\d{4})-(\d{2})/.exec(year);
  const month = m ? Number(m[2]) : 0;
  return m && month >= 1 && month <= 12 ? `${MONTHS[month - 1]} ${m[1]}` : year;
}
