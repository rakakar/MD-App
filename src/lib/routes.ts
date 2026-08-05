/**
 * Routes that own the whole viewport. The reader is deliberately outside the
 * app shell: header + bottom nav cost ~26% of a 375×812 phone, and none of it
 * is useful mid-chapter. Keep these regexes in sync with the copy inlined in
 * the pre-hydration theme script in app/layout.tsx.
 */
export const READER_ROUTE = /^\/books\/[^/]+\/\d+$/;

/**
 * The PDF reader — the same rule, arrived at the hard way.
 *
 * A PDF first shipped as a viewer boxed inside a library card: 75vh of page
 * inside a page that also carried a header, a bottom nav and five other files.
 * On a phone that is a document read through a letterbox, and it was plainly
 * worse than the browser's own full-screen viewer it replaced — which made
 * saving the reader's place a trade nobody would take. A document is reading,
 * and reading owns the screen here.
 */
export const PDF_READER_ROUTE = /^\/library\/\d+\/read\/\d+$/;

/** a chapter of a book — the reflowable reader, with its own theme and chrome */
export function isReaderRoute(pathname: string | null | undefined): boolean {
  return !!pathname && READER_ROUTE.test(pathname);
}

/**
 * Anything that takes the whole screen, whichever reader it is.
 *
 * Kept apart from `isReaderRoute` on purpose: the app chrome has to go for
 * both, but the book reader's typography — its face, its margins, its line
 * height — means nothing to a page that is a picture, and the reader theme
 * belongs only to the one that renders text.
 */
export function ownsViewport(pathname: string | null | undefined): boolean {
  return isReaderRoute(pathname) || (!!pathname && PDF_READER_ROUTE.test(pathname));
}
