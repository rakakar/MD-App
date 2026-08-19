/**
 * A book's own colour (design 1A/1B/1C).
 *
 * Spec 1C says the book hero's colour is "derived from the cover", and it now
 * is: `COVER_HUES` below holds the printed band colour of every cover the BE
 * serves, sampled from the scan itself. Everything else here is the fallback
 * for a book that has not been sampled.
 *
 * It used to be *only* the fallback, for a reason that has since expired — the
 * note said "most books carry no cover image, so there is nothing to sample",
 * and today all thirteen are 612×834 scans. What survives is the shape of the
 * answer: one colour per book code, so a book is the same colour on the rail,
 * the shelf, the resume card and its own hero, which is what makes it
 * recognisable at all.
 *
 * Both ends are measured against white, in both tables: the light end carries
 * only the large initial (≥3:1 — large-text AA), the dark end carries any small
 * white label (≥4.5:1), and the hero takes the dark end.
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
 * The colour actually printed on each cover, sampled from the scan by
 * `scripts/sample-cover-hues.mjs` — run it again when a cover changes or a book
 * is added, and paste the result here.
 *
 * A table rather than a sample at request time, for two reasons. The book page
 * is prerendered for every book, and `AGENTS.md` is emphatic about what this
 * build already asks of the network; fetching and decoding a cover per page
 * would add to exactly that. And a committed value can be *measured* — the
 * figures below are real contrast ratios against white, checked once, the same
 * standard the fallback palette is held to. A heuristic running at build time
 * would only be assumed to hold.
 *
 * The five colours are what the covers actually use: four of these books are
 * printed in the same olive, three in the same pine, three in the same iris. So
 * four books now share a hero, where the hash gave each its own. That is the
 * cost of the hero telling the truth about the book in your hand, and it is the
 * right way round — but it is a real change to how varied the shelf looks, and
 * the fallback below is still what gives an unsampled book a colour of its own.
 */
const COVER_HUES: Record<string, BookHue> = {
  // terracotta — 3.27:1 / 4.50:1
  ABVP: { from: "#cd7a30", to: "#ab6628" },
  JVEP: { from: "#cd7a30", to: "#ab6628" },
  // pine — 3.49:1 / 4.55:1
  ADVD: { from: "#4f958d", to: "#44807a" },
  SBVD: { from: "#4f958d", to: "#44807a" },
  VJVD: { from: "#4f958d", to: "#44807a" },
  // iris — 4.00:1 / 5.13:1
  AVAS: { from: "#8179ab", to: "#70669f" },
  MSMV: { from: "#8179ab", to: "#70669f" },
  VYSS: { from: "#8179ab", to: "#70669f" },
  // olive — 3.27:1 / 4.51:1
  MABD: { from: "#9c9025", to: "#82781f" },
  MAND: { from: "#9c9025", to: "#82781f" },
  MKD: { from: "#9c9025", to: "#82781f" },
  MVD: { from: "#9c9025", to: "#82781f" },
  // ultramarine — 5.19:1 / 6.49:1
  MSSV: { from: "#2c6eba", to: "#265fa1" },

  // Translations. Sampled the same way, from the same script run against
  // `?workspace=translations` — the printed cover is the translator's own
  // choice, not inherited from the original it renders, so JVE-ENG earning
  // the same terracotta as JVEP is a real coincidence of two covers using the
  // same ink, not a rule that a translation shares its original's hue.
  //
  // terracotta — 3.01:1 / 4.51:1
  "JVE-ENG": { from: "#d08339", to: "#a96728" },
  "MAND-ENG-RG": { from: "#d08339", to: "#a96728" },
  // sage — 3.00:1 / 4.53:1. Low confidence: both covers are almost entirely
  // unsaturated cream, so the sampler is reading a faint watermark rather
  // than a printed band — the fallback hash palette would have been an
  // equally defensible answer here. Re-sample if either cover is redrawn with
  // real ink in it.
  "JVEP-KND-GS": { from: "#9d9752", to: "#7d7841" },
  "MVD-KND-GS": { from: "#9b984f", to: "#7b793f" },
};

/**
 * A book's colour: the one on its cover where we have sampled it, and a stable
 * hue from its code where we have not.
 *
 * The fallback is FNV-1a rather than a sum of char codes: two codes that are
 * anagrams of each other ("MVD" / "VDM") must not collide onto the same colour,
 * and on a shelf of a dozen books that is a real risk.
 */
export function bookHue(code: string | null | undefined): BookHue {
  const sampled = code ? COVER_HUES[code] : undefined;
  if (sampled) return sampled;

  let h = 0x811c9dc5;
  for (const ch of code ?? "") {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

/**
 * A shelf's own colour as a cover hue — what every **library folder** wears.
 *
 * A folder is not a book. A book's hue is sampled from the artwork actually
 * printed on its cover, so it means something; a folder has no cover, and
 * hashing its database id into the palette above produced a colour that meant
 * nothing and — worse — changed at every step down the tree. Opening ऑडियो
 * (olive), then a shivir inside it (iris), then a folder inside that (pine)
 * read as the app shuffling colours at random, because it was.
 *
 * The comps are the authority and they are near-unanimous: of the four
 * collection screens the designer drew, three are exactly the Originals
 * accent. `NodeView` used to cite the fourth — a purple Audio Album — as
 * evidence for "a hue per thing", which is the wrong way round; three
 * identical panels are not what a per-thing hash produces.
 *
 * 78% against white for the light end, the same mix `Header`'s workspace
 * tiles already use, so a folder's panel and the switcher's own glyph for
 * that workspace read as one colour rather than two near-misses.
 */
export function workspaceHue(color: string): BookHue {
  return { from: `color-mix(in srgb, ${color} 78%, #fff)`, to: color };
}

/** The 150° cover gradient, as a CSS value. */
export function coverGradient(hue: BookHue): string {
  return `linear-gradient(150deg, ${hue.from}, ${hue.to})`;
}
