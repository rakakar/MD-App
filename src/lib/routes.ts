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

/**
 * One document, opened as the pages it was printed as.
 *
 * A file has no URL of its own in the API — it is only ever returned inside its
 * folder — so the folder is half the address and the file is the row within it.
 */
export function documentHref(node: number, item: number): string {
  return `/library/${node}/read/${item}`;
}

/**
 * The same document, read as text — पाठ mode (Compilations.md §9).
 *
 * The **path does not change**, and that is the design rather than an
 * implementation detail. A compilation is a library file that happens to read
 * well, not a book on the shelf; its identity is the file, so the reading mode
 * is a query on the file's own URL and not an address of its own. It keeps
 * `PDF_READER_ROUTE` matching, which is what keeps the app shell away, and it
 * makes going back to the pages a matter of dropping a parameter.
 *
 * The chapter rides in the query for the same reason — see `ReaderHome` in
 * `components/reader/Reader.tsx`, which pushes these as the reader moves.
 */
export function documentTextHref(
  node: number,
  item: number,
  chapter?: number
): string {
  const base = `${documentHref(node, item)}?text=1`;
  return chapter === undefined ? base : `${base}&ch=${chapter}`;
}

/**
 * Where a book reached under `/books/...` should actually be read, or null to
 * read it right there.
 *
 * Only a **compilation** answers with a URL. It is unlisted rather than secret
 * (Compilations.md D5), so its `/books/{code}` URLs are reachable and always
 * will be — by an old link, a shared one, or the front-matter deep link that
 * `/paras/{ref}` resolves to. Rendering it there would put somebody's
 * selection from Nagraj ji's works into the ordinary book reader with nothing
 * saying so, which is the one outcome §3's label rule exists to prevent. So
 * the shelf routes hand it back to the library, where it is labelled and where
 * the pages it was made from are one tap away.
 *
 * Returns null for a compilation with no `reading_home` — its source file is
 * gone and there is no library URL to send it to. The caller must not render
 * it either; `role` is what distinguishes that case from an ordinary book.
 */
export function offShelfHref(
  book: {
    role?: "original" | "compilation";
    reading_home?: { node: number; item: number } | null;
  },
  chapter?: number
): string | null {
  if (book.role !== "compilation" || !book.reading_home) return null;
  return documentTextHref(book.reading_home.node, book.reading_home.item, chapter);
}

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
