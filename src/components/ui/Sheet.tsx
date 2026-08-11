"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/shell/icons";

/**
 * The bottom sheet — every one of them, in the app and in the book.
 *
 * Controls live at the bottom because that is where a thumb is; the inline
 * panel this replaced sat under the top bar and pushed the text down while you
 * used it.
 *
 * **The `surface` prop is not decoration.** It used to be safe for every sheet
 * to paint itself in `--reader-*`, because those were aliases of the app's own
 * tokens and the two could not disagree. Since the book's paper became its own
 * setting they can: a reader with Quiet paper inside a light app would open
 * Display from the header and get a near-black panel over a cream screen. So a
 * sheet now says which world it belongs to — the shell's, or the book's — and
 * the default is the shell's, because that is the safe way round.
 *
 * The header is the comps': a grabber, a real title, whatever the screen needs
 * opposite it, and a close button. The footer is sticky, for the sheets that
 * end in one decision ("Show 18 recordings", "Apply").
 */
export function Sheet({
  open,
  onClose,
  title,
  actions,
  footer,
  surface = "app",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** beside the title, before the close button — "Clear all", "Clear" */
  actions?: ReactNode;
  /** pinned to the floor of the sheet, above the home indicator */
  footer?: ReactNode;
  /** `reader` paints the sheet in the book's own paper; see above */
  surface?: "app" | "reader";
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // move focus in so Escape and tabbing behave, without stealing the
    // caret from anything the sheet itself autofocuses
    const id = requestAnimationFrame(() => {
      if (!panelRef.current?.contains(document.activeElement)) {
        panelRef.current?.focus();
      }
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      cancelAnimationFrame(id);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const paint =
    surface === "reader"
      ? "bg-(--reader-bg) text-(--reader-ink)"
      : "bg-surface text-ink";
  const rule = surface === "reader" ? "border-(--reader-rule)" : "border-rule";

  return createPortal(
    <div className="fixed inset-0 z-60" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="ws-sheet-backdrop absolute inset-0 bg-black/50"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        // A sheet that ends in a decision must not scroll its own decision off
        // screen, so the footer sits outside the scroller and the body flexes.
        className={`ws-sheet absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-sheet shadow-sheet outline-none ${paint}`}
      >
        <div className="shrink-0 pt-2.5">
          <div className="mx-auto h-1 w-9 rounded-full bg-current opacity-20" aria-hidden />
          <div className={`flex items-center gap-2 border-b px-5 pb-3 pt-3.5 ${rule}`}>
            <h2 className="min-w-0 flex-1 text-[1.0625rem] font-semibold tracking-[-0.01em]">
              {title}
            </h2>
            {actions}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-tile border ${rule} transition-colors active:bg-current/5`}
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${
            footer ? "" : "pb-[max(1rem,env(safe-area-inset-bottom))]"
          }`}
        >
          {children}
        </div>

        {footer && (
          <div
            className={`shrink-0 border-t px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 ${rule}`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/** The sheet's own primary button — the full-width accent bar the comps end
 *  their filter panels with. */
export function SheetAction({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className="flex min-h-12 w-full items-center justify-center rounded-tile px-4 text-[1.0625rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      style={{ background: "var(--ws-color)" }}
    >
      {children}
    </button>
  );
}

/** A quiet text button for the header slot — "Clear all", "Clear". */
export function SheetTextAction({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className="inline-flex min-h-10 shrink-0 items-center rounded-tile border border-rule px-3 text-sm font-medium transition-colors active:bg-current/5"
    >
      {children}
    </button>
  );
}
