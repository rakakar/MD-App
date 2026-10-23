/**
 * A library file's name as a reader should see it — without the archive's
 * catalogue code in front.
 *
 * The scanned archive names its files by shelf mark: "D11-16 1.3 मैं अपने में
 * क्या हूँ", "G1-3 11.14_15 प्रधान मंत्री…", "E8 15.4 मानवीय शिक्षा नीति…".
 * The code (letters then digits, "D11-16") and the section number after it
 * ("1.3", "९.२१", "7.2-7.3", "23B1", "p2") mean something to whoever filed
 * the scans and nothing to a reader, so both are dropped. Display only: the BE
 * keeps the full name.
 *
 * Deliberately narrow, because a number in front is often the title itself —
 * "3 पद, 10 सोपान", "4 अवस्था का प्रकटन", "1994 C FC…". So a bare leading
 * number is left alone unless it is zero-padded ("00 कक्षा…", "03_जीवन
 * विद्या…"), as are camera names ("IMG-20191018-WA0032",
 * "DSC00091"), which are three letters or more and nothing else to show.
 */

/** "D11-16", "E8", "G4-7", "D11-1.29", "D214." — one or two capitals, then digits */
const CODE = /^[A-Z]{1,2}\d+[A-Z]?(?:-\d+)?(?:\.\d+)?\.?\s+/;

/** "1.3", "९.२१", "16.01", "21.8.1", "7.2-7.3", "11.14_15", "23B1", "58B", "p2" */
const SECTION =
  /^(?:p\d+|\d+[A-Z]\d*|[\d०-९]+(?:[._][\d०-९]+)+(?:-[\d०-९]+(?:\.[\d०-९]+)*)?)\s+/;

/**
 * "00 ", "03_", "0002 " — a zero-padded sort number. Unlike "3 पद" no title
 * starts with a padded zero, so this one is always the filer's.
 */
const PADDED = /^0\d*[\s_.]+/;

export function fileTitle(raw: string): string {
  const padded = raw.match(PADDED);
  if (padded) return raw.slice(padded[0].length).trim() || raw;
  const code = raw.match(CODE);
  if (!code) return raw;
  let rest = raw.slice(code[0].length);
  // and the dash some names put after it ("D76 11.123 -मानवीय संविधान…")
  rest = rest.replace(SECTION, "").replace(/^[-–—_\s]+/, "");
  // Never empty a name: a file called only by its code keeps it.
  return rest.trim() || raw;
}

/** a file with its display name — for mapping API rows as they arrive */
export function withFileTitle<T extends { title: string }>(file: T): T {
  const title = fileTitle(file.title);
  return title === file.title ? file : { ...file, title };
}
