/**
 * A book's own colour (design 1A/1B/1C).
 *
 * The designer draws every cover in a different hue — plum, pine, iris, olive —
 * and the book-detail hero is explicitly "colour derived from the cover" (spec
 * 1C, Layout). The BE carries no such colour, and most ग्रंथ carry no cover
 * image either, so there is nothing to sample. Deriving it from the book code
 * gives the shelf the designer's variety and, unlike a random pick, gives each
 * book the *same* colour on the rail, the shelf, the resume card and its own
 * hero — which is what makes a cover recognisable at all.
 *
 * The palette is the spec's own six, deepened where white needed the room:
 * the light end carries only the large अक्षर (≥3:1 — large-text AA), the dark
 * end carries any small white label (≥4.5:1). Values measured, not guessed.
 */
export interface BookHue {
  /** top-left of the 150° gradient */
  from: string;
  /** bottom-right of the 150° gradient */
  to: string;
}

const PALETTE: BookHue[] = [
  { from: "#8A4B7D", to: "#66325C" }, // plum
  { from: "#4E8577", to: "#2A4F45" }, // pine
  { from: "#7C77AD", to: "#5E5A8C" }, // iris
  { from: "#8C8536", to: "#5F5A1E" }, // olive
  { from: "#4A93A8", to: "#2F6E86" }, // ocean
  { from: "#C8621A", to: "#A64E12" }, // terracotta
];

/**
 * Stable hue for a book code. FNV-1a rather than a sum of char codes: two
 * codes that are anagrams of each other ("MVD" / "VDM") must not collide onto
 * the same colour, and on a shelf of a dozen ग्रंथ that is a real risk.
 */
export function bookHue(code: string | null | undefined): BookHue {
  let h = 0x811c9dc5;
  for (const ch of code ?? "") {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

/** The 150° cover gradient, as a CSS value. */
export function coverGradient(hue: BookHue): string {
  return `linear-gradient(150deg, ${hue.from}, ${hue.to})`;
}
