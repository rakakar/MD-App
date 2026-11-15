/**
 * Cache-buster for the PNG app icons in `public/`. Browsers, the installed
 * PWA and the OS media widget hold on to `/icon-192.png` and friends for a
 * long time, so the files keep their names and their URLs carry this instead.
 * Bump it whenever `scripts/build-icons.py` produces a new mark.
 *
 * 2 — the Sah Astitva mark (15 Nov 2026), replacing the tree.
 */
export const ICON_V = "2";

/** `/icon-192.png` → `/icon-192.png?v=2` */
export const iconUrl = (path: string) => `${path}?v=${ICON_V}`;
