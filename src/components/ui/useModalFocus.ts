import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keep the keyboard inside an open sheet or dialog, and hand focus back when
 * it closes.
 *
 * `Sheet` and `Dialog` already moved focus in, closed on Escape and locked the
 * page's scroll. Two things were missing, and both only show with a keyboard
 * or a screen reader: Tab walked out of the panel into the page behind it,
 * and closing dropped focus at the top of the document rather than on the
 * button that had opened the panel — so every Filters, Display or Contents
 * round trip cost the reader their place.
 *
 * Keyed on `open` alone. Callers pass a fresh `onClose` on every render, and
 * an effect that re-ran with it would re-read "what had focus before" from
 * inside the panel and restore to nothing.
 *
 * Only the topmost modal traps: a sheet opened over a dialog must not have
 * the dialog underneath pulling Tab back into itself.
 */
export function useModalFocus(open: boolean, panelRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const modals = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      const top = modals[modals.length - 1];
      if (top && !top.contains(panel)) return;

      const stops = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        // rendered, and not inside something switched off with `inert`
        (el) => el.getClientRects().length > 0 && !el.closest("[inert]")
      );
      if (stops.length === 0) {
        e.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }
      const first = stops[0];
      const last = stops[stops.length - 1];
      const at = document.activeElement;
      if (!panel.contains(at)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && (at === first || at === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && at === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      // Back to the control that opened it — unless closing was itself a
      // navigation and that control is gone, or focus has already been put
      // somewhere deliberate outside the panel.
      const panel = panelRef.current;
      const at = document.activeElement;
      const stillInside = !at || at === document.body || (panel?.contains(at) ?? false);
      // Not a text field: focusing one on a phone raises the keyboard again.
      const typing = opener?.matches("input, textarea, [contenteditable='true']") ?? false;
      if (opener && opener.isConnected && stillInside && !typing) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [open, panelRef]);
}
