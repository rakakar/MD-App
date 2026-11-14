/**
 * Scroll behaviour for a scroll started from script.
 *
 * `globals.css` flattens every transition and animation under
 * `prefers-reduced-motion`, but a stylesheet cannot reach
 * `scrollIntoView({ behavior: "smooth" })` — and the two busiest callers are
 * the follow-along scrolls, which move the page under the reader on every
 * paragraph for as long as a chapter is being read aloud. Someone who has
 * asked their device for less motion gets the jump instead of the glide.
 *
 * Read at call time, not cached: the setting can change while the app is open.
 */
export function scrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") return "auto";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
