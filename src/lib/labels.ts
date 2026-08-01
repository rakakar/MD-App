// Reader-facing Hindi for the taxonomies the API now holds in English only.
//
// Content Model v3 removed the `name_hi` twin from every taxonomy row: it was
// a second place to fix a typo and the two drifted (contract §10.1). The Hindi
// a reader sees therefore lives here, beside the other places that already
// held it — workspaceConfig.ts for the five shelves, ProvenanceBadge for the
// three badges, resources/format.ts for the file kinds.
//
// The one exception is `Topic.name`, which arrives in Hindi and is rendered
// exactly as a manager typed it (§13.4). Nothing about topics belongs here.

/**
 * The Originals shelf's विधा chips (contract §11.1).
 *
 * A *translation table*, deliberately not a list: the genres themselves are
 * still read from `book-genres/` and every row that arrives is rendered. A
 * genre a manager adds after we ship simply keeps the API's English `name`
 * until someone adds its Hindi here — which is a plain-looking chip, not a
 * missing book.
 */
const GENRE_HI: Record<string, string> = {
  darshan: "दर्शन",
  vaad: "वाद",
  shastra: "शास्त्र",
  parichay: "परिचय",
  diary: "डायरी",
  other: "अन्य",
};

/** what a genre chip says: our Hindi when we know it, else the API's name */
export function genreLabel(code: string, apiName?: string): string {
  return GENRE_HI[code] ?? apiName ?? code;
}
