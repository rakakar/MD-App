/**
 * Small shared behaviour for a folder's files — the selected-files download
 * and the hero's "Play all".
 */

import { downloadHref } from "@/lib/download";

/**
 * Download several files, one after another.
 *
 * There is no zip — each file lives on its own at the media host — so this
 * hands the browser one download at a time, a beat apart. Chrome asks once to
 * allow "multiple downloads"; after that they run.
 *
 * **Each through a hidden frame, never a clicked link.** It used to click one
 * `<a target="_blank">` per file, straight at the bucket: the bucket sends no
 * `Content-Disposition`, so the browser opened the file instead of saving it,
 * and every tab after the first came from a timer rather than the reader's
 * tap, so the popup blocker ate it — Download all produced one playing MP3.
 * Through `/api/download` each response is a same-origin attachment, and a
 * frame that receives an attachment saves it without opening anything.
 */
export function downloadFiles(files: { url: string; title: string }[]): void {
  files.forEach((f, i) => {
    window.setTimeout(() => {
      const frame = document.createElement("iframe");
      frame.hidden = true;
      frame.src = downloadHref(f.url, f.title);
      document.body.appendChild(frame);
      // Long enough for the response to start; the download carries on
      // without the frame once the browser has it.
      window.setTimeout(() => frame.remove(), 120_000);
    }, i * 800);
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
