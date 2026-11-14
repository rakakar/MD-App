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
 * Where "Play all" should start — the part a listener is in the middle of.
 *
 * The button always opened the first recording, although every row below it
 * already knew how far it had been played: someone halfway through part 7 of
 * a fourteen-part shivir pressed the big button and got part 1 again.
 *
 * The furthest part that has been started decides. Still unfinished, it is the
 * one to resume; finished (95%, since nobody listens to the last seconds of
 * silence), the next part is. Nothing started, or the last part finished,
 * means from the beginning — `null`.
 *
 * `fractions` is each part's progress, 0…1, in list order.
 */
export function resumeIndex(fractions: number[]): number | null {
  let last = -1;
  fractions.forEach((f, i) => {
    if (f > 0.01) last = i;
  });
  if (last === -1) return null;
  if (fractions[last] < 0.95) return last;
  return last + 1 < fractions.length ? last + 1 : null;
}

/**
 * The list telling the button what it will do, so the label is true: "Resume ·
 * 7 of 14" rather than a "Play all" that quietly starts somewhere else. The
 * same reason `PLAY_ALL` is an event — the hero is server-rendered above the
 * list. Kept in the module as well as announced, because the button can mount
 * after the list has already spoken.
 */
export const PLAY_ALL_STATE = "md:play-all-state";
export interface PlayAllState {
  /** 0-based part "Play all" will open, or null for the first */
  index: number | null;
  total: number;
}
let playAllState: PlayAllState = { index: null, total: 0 };
export function currentPlayAllState(): PlayAllState {
  return playAllState;
}
export function announcePlayAll(state: PlayAllState): void {
  if (state.index === playAllState.index && state.total === playAllState.total) return;
  playAllState = state;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PLAY_ALL_STATE));
}

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
