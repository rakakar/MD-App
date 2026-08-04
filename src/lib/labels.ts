// The few chrome words that are terms of art rather than plain English.
//
// The app's interface is English — every label, action, heading, count and
// empty state the FE authors itself. Content is untouched: a title, a folder
// name, a topic, a sutra, a chapter heading and a file name are rendered
// exactly as they arrive from the API.
//
// A handful of words sit on the line between the two. They are chrome — the FE
// writes them, they are not data — but they have no faithful English twin, and
// translating them would leave a reader unable to connect the app to the books,
// the discourses and the shivirs where the same words are spoken. Those keep
// their own name in Roman script, and live here so there is one spelling of
// each.
//
// Everything that *does* have a plain English word uses it and is not here:
// ग्रंथ→Books, सामग्री→Library, संसाधन→Resources, अध्याय→Chapter,
// विषय→Topic, प्रकार→Type, वर्ष→Year, विधा→Genre, and the three provenance
// badges in ProvenanceBadge.tsx.
//
// `Topic.name` arrives in Hindi and is rendered exactly as a manager typed it
// (§13.4). Nothing about topics belongs here.

/** the daily verse (PRD §3) — "Aphorism" is unrecognisable to this audience */
export const SUTRA = "Sutra";

/** a residential study camp — the word this audience uses in English too */
export const SHIVIR = "Shivir";
export const SHIVIRS = "Shivirs";

/**
 * The glossary, compiled from the परिभाषा संहिता and named for it.
 *
 * Kept as a name because it is one. The screens that introduce it say
 * "Glossary" alongside, once, so a reader meeting the word for the first time
 * is not guessing; after that the name stands on its own.
 */
export const PARIBHASHA = "Paribhasha";

/**
 * What a genre chip says (contract §11.1).
 *
 * The API's own English `name`, with the code as a last resort. There used to
 * be a Hindi translation table here; it was a second place to fix a typo, and
 * a genre a manager added after a deploy kept the English name anyway.
 */
export function genreLabel(code: string, apiName?: string): string {
  return apiName ?? code;
}
