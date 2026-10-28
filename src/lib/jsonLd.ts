/**
 * Structured data for a `<script type="application/ld+json">`, safe to put
 * in the page as raw HTML.
 *
 * `JSON.stringify` alone is not: it leaves `<` as it is, so a title or
 * description holding `</script>` ends the script tag early and whatever
 * follows runs as HTML — text that comes from an extracted PDF or a manager's
 * form, rendered on every book, chapter and event page. With the session
 * token in localStorage (`lib/me.ts`), a script on the page is a signed-in
 * reader's account. `<` is the same character to a JSON parser and to
 * Google, and not a tag to the HTML one.
 */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
