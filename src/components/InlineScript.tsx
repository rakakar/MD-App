/**
 * Inline script that runs during HTML parsing, before first paint.
 *
 * `type` flips to text/plain on the client so React's "script tags are never
 * executed when rendering on the client" warning stays quiet — the script has
 * already done its job by then. Pattern from the Next.js "Preventing Flash
 * Before Hydration" guide.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
