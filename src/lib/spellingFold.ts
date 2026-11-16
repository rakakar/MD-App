/**
 * **Two spellings, one word** (UX audit FD2, 16 Nov 2026).
 *
 * Hindi writes many words two everyday ways — संबंध and सम्बन्ध, अंत and अन्त,
 * ज़्यादा and ज्यादा, माँ and मां — and the books and the reader do not always
 * pick the same one. A search that compares letter for letter told a reader
 * who typed संबंध that no passage held the phrase, with the phrase right there.
 *
 * So every place that asks "is this word in this text?" asks it through here:
 * book search's exact-phrase filter, the words it marks in a passage, the marks
 * the reader paints where a search lands, and the matched word on a shelf row.
 * One fold, so the four cannot disagree about what counts as the same word.
 *
 * Three folds, and only these:
 * - **a nasal half-letter before its own consonant group is the anusvara** —
 *   म्ब → ंब, न्ध → ंध, ङ्ग → ंग. Only before its *own* group: जन्म is never
 *   written जंम, and folding it would make words match that do not.
 * - **the nukta goes** — ज़ → ज, ड़ → ड, in either its one- or two-character form.
 * - **chandrabindu is the anusvara** — माँ → मां.
 */

const VIRAMA = "्";
const ANUSVARA = "ं";
const CHANDRABINDU = "ँ";
const NUKTA = "़";
const JOINERS = /[‌‍]/g;

/** each group's own nasal, by the consonants it stands before */
const NASAL_GROUPS: [nasal: string, group: string][] = [
  ["ङ", "कखगघ"],
  ["ञ", "चछजझ"],
  ["ण", "टठडढ"],
  ["न", "तथदध"],
  ["म", "पफबभ"],
];

/** the one-character nukta letters and the letter under each */
const NUKTA_FORMS: Record<string, string> = {
  // Escaped, because typed they may be saved as the two-character form and
  // the one-character letter is the whole point of this table.
  "\u0958": "\u0915", // क़ → क
  "\u0959": "\u0916", // ख़ → ख
  "\u095A": "\u0917", // ग़ → ग
  "\u095B": "\u091C", // ज़ → ज
  "\u095C": "\u0921", // ड़ → ड
  "\u095D": "\u0922", // ढ़ → ढ
  "\u095E": "\u092B", // फ़ → फ
  "\u095F": "\u092F", // य़ → य
  "\u0929": "\u0928", // ऩ → न
  "\u0931": "\u0930", // ऱ → र
  "\u0934": "\u0933", // ऴ → ळ
};
const NUKTA_LETTER = new RegExp(`[${Object.keys(NUKTA_FORMS).join("")}]`, "g");
/** the reverse, for building a pattern: क → क़ */
const WITH_NUKTA: Record<string, string> = Object.fromEntries(
  Object.entries(NUKTA_FORMS).map(([withDot, base]) => [base, withDot])
);

const NASAL_BEFORE_GROUP = new RegExp(
  NASAL_GROUPS.map(([nasal, group]) => `${nasal}${VIRAMA}(?=[${group}])`).join("|"),
  "g"
);

/** the nasal that an anusvara before this consonant may be written as */
function nasalFor(consonant: string | undefined): string | null {
  if (!consonant) return null;
  for (const [nasal, group] of NASAL_GROUPS) if (group.includes(consonant)) return nasal;
  return null;
}

const isConsonant = (c: string) => c >= "क" && c <= "ह";
const RE_SPECIAL = /[.*+?^${}()|[\]\\]/g;

/**
 * A string with both spellings brought to one — for comparing, never for
 * showing. Also NFC, spaces collapsed and lower case, so Latin compares as it
 * always did.
 */
export function foldSpelling(s: string): string {
  return s
    .normalize("NFC")
    .replace(JOINERS, "")
    .replace(NUKTA_LETTER, (c) => NUKTA_FORMS[c])
    .replaceAll(NUKTA, "")
    .replaceAll(CHANDRABINDU, ANUSVARA)
    .replace(NASAL_BEFORE_GROUP, ANUSVARA)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** whether `needle` is in `hay`, whichever way either is spelled */
export function includesFolded(hay: string, needle: string): boolean {
  const n = foldSpelling(needle);
  return n.length > 0 && foldSpelling(hay).includes(n);
}

/**
 * One term as a pattern that finds it **in the text as printed**, either way
 * it is spelled — what marking needs, since a mark has to land on the text's
 * own characters rather than on a folded copy of them.
 */
function termPattern(term: string): string {
  const t = [...foldSpelling(term)];
  let out = "";
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === ANUSVARA) {
      const nasal = nasalFor(t[i + 1]);
      out += nasal
        ? `(?:[${CHANDRABINDU}${ANUSVARA}]|${nasal}${VIRAMA}[‌‍]?)`
        : `[${CHANDRABINDU}${ANUSVARA}]`;
    } else if (isConsonant(c)) {
      const dotted = WITH_NUKTA[c];
      out += dotted ? `(?:${c}${NUKTA}?|${dotted})` : `${c}${NUKTA}?`;
    } else if (c === VIRAMA) {
      out += `${VIRAMA}[‌‍]?`;
    } else if (c === " ") {
      out += "\\s+";
    } else {
      out += c.replace(RE_SPECIAL, "\\$&");
    }
  }
  return out;
}

/**
 * Every term, either spelling, as one global case-blind pattern — longest
 * first, so "संबंध" is marked whole rather than as "सं" and the rest. Null
 * when nothing is left to look for.
 */
export function spellingPattern(terms: string[]): RegExp | null {
  const folded = [...new Set(terms.map(foldSpelling).filter(Boolean))].sort(
    (a, b) => b.length - a.length
  );
  if (!folded.length) return null;
  return new RegExp(folded.map(termPattern).join("|"), "gi");
}

/** a vowel sign, nasal sign, nukta or virama — never the start of a syllable */
const COMBINING = /[ऀ-ःऺ-ॏ॑-ॗॢॣ]/;

/**
 * Where a mark ending at `end` should really end: past the vowel signs that
 * finish the syllable. A search for अनुभव inside अनुभवों would otherwise cut
 * the ों into an element of its own, and a vowel sign drawn alone is a dotted
 * circle.
 */
function syllableEnd(text: string, end: number): number {
  while (end < text.length && COMBINING.test(text[end])) {
    end += text[end] === VIRAMA && end + 1 < text.length ? 2 : 1;
  }
  return end;
}

/** The text cut into runs, `hit` where a term was found — for drawing marks. */
export function splitMarked(text: string, terms: string[]): { text: string; hit: boolean }[] {
  const pattern = spellingPattern(terms);
  if (!pattern || !text) return [{ text, hit: false }];
  const out: { text: string; hit: boolean }[] = [];
  let at = 0;
  for (const m of text.matchAll(pattern)) {
    if (!m[0] || m.index < at) continue;
    if (m.index > at) out.push({ text: text.slice(at, m.index), hit: false });
    const end = syllableEnd(text, m.index + m[0].length);
    out.push({ text: text.slice(m.index, end), hit: true });
    at = end;
  }
  if (at < text.length) out.push({ text: text.slice(at), hit: false });
  return out;
}
