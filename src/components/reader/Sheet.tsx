"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Bottom sheet for reader controls. Controls live at the bottom because that
 * is where a thumb is — the old inline settings panel sat under the top bar
 * and pushed the text down while you used it.
 *
 * Portalled to <body>, which is safe for theming because the reader theme is
 * an attribute on <html>: the sheet inherits --reader-* wherever it lands.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
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
        className="ws-sheet absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-3xl bg-(--reader-bg) text-(--reader-ink) pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl outline-none"
      >
        <div className="sticky top-0 z-10 bg-(--reader-bg) pt-2.5">
          <div className="mx-auto h-1 w-9 rounded-full bg-current opacity-20" aria-hidden />
          <p className="px-5 pb-2 pt-3 text-xs font-semibold uppercase tracking-wider text-(--reader-ink-soft)">
            {title}
          </p>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
