/**
 * Routes that own the whole viewport. The reader is deliberately outside the
 * app shell: header + bottom nav cost ~26% of a 375×812 phone, and none of it
 * is useful mid-chapter. Keep this regex in sync with the copy inlined in the
 * pre-hydration theme script in app/layout.tsx.
 */
export const READER_ROUTE = /^\/books\/[^/]+\/\d+$/;

export function isReaderRoute(pathname: string | null | undefined): boolean {
  return !!pathname && READER_ROUTE.test(pathname);
}
