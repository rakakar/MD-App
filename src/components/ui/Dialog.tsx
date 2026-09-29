"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AccentScope } from "@/components/shell/WorkspaceProvider";

/**
 * The centred modal — the desktop counterpart of `Sheet`.
 *
 * A bottom sheet is right where a thumb is; on a 1300px screen it is a panel
 * the width of the monitor rising from the floor, with its one decision at the
 * far corner from the pointer. From lg a screen that has a desktop layout of
 * its own opens this instead (Share sutra, desktop revision 29 Sep 2026).
 *
 * It is only the frame — portal, blurred backdrop, Escape, focus, scroll lock.
 * The layout inside belongs to the caller, because the whole reason a desktop
 * modal exists is that it can be laid out differently from the sheet.
 */
export function Dialog({
  open,
  onClose,
  label,
  accent,
  className = "",
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** the dialog's accessible name */
  label: string;
  /** as on `Sheet`: a portal sits outside the workspace's `[data-ws]` */
  accent?: string;
  /** the panel's size and shape */
  className?: string;
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

  const frame = (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="ws-sheet-backdrop absolute inset-0 bg-black/30 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`ws-dialog relative max-h-full overflow-hidden rounded-hero bg-card text-ink shadow-raised outline-none ${className}`}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(
    accent ? <AccentScope color={accent}>{frame}</AccentScope> : frame,
    document.body
  );
}

const DESKTOP = "(min-width: 64rem)";

/**
 * Whether the page is at the desktop breakpoint (Tailwind's `lg`) — for the
 * few places that must render a different *component* there, not just restyle
 * one. False on the server and in the first client render.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = matchMedia(DESKTOP);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => matchMedia(DESKTOP).matches,
    () => false
  );
}
