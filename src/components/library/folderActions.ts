/**
 * Small shared behaviour for a folder's files — the bulk download and the
 * hero's "Play all".
 */

/**
 * Download several files, one after another.
 *
 * There is no zip — each file lives on its own at the media host — so this
 * hands the browser one download at a time, a beat apart. Chrome asks once to
 * allow "multiple downloads"; after that they run. `target` as well as
 * `download`, because the host sends no `Content-Disposition`: where the
 * attribute is ignored the file opens in a tab of its own instead of
 * navigating the app away (see `PdfCard`).
 */
export function downloadFiles(files: { url: string; title: string }[]): void {
  files.forEach((f, i) => {
    window.setTimeout(() => {
      const a = document.createElement("a");
      a.href = f.url;
      a.download = "";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, i * 450);
  });
}

/**
 * The hero's Play all, heard by whichever list of recordings is on the page.
 * An event rather than a prop because the hero is server-rendered above the
 * list and the two share no parent that holds state.
 */
export const PLAY_ALL = "md:play-all";

/**
 * "2006 Kanpur Sammelan - Part 1 | अध्ययन अभ्यास … | अनुभवमूलक विधि" — the way
 * these recordings are named — as the comps draw it: "Part 1" over the
 * subject, with the theme under it. Anything not named that way is returned
 * whole, as its title.
 */
export function parseMediaTitle(raw: string): { part?: string; title: string; subtitle?: string } {
  const parts = raw.split(/\s+\|\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return { title: raw };
  const m = parts[0].match(/\bpart\s*(\d+)\s*$/i);
  if (!m) return { title: raw };
  return {
    part: `Part ${m[1]}`,
    title: parts[1],
    subtitle: parts.slice(2).join(" · ") || undefined,
  };
}

/** a file this size or more is marked LARGE before anyone taps it */
export const LARGE_BYTES = 20 * 1024 * 1024;
