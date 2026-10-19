"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CheckIcon } from "@/components/shell/icons";
import { SectionHeading, Switch } from "@/components/ui";

/**
 * The furniture Settings is built from: an eyebrow over a card, rows inside it
 * divided by hairlines, and a toast for a change that saved.
 *
 * Kept to this screen rather than `components/ui` — no other screen draws a
 * settings card, and the rule there is two screens before a thing is shared.
 */

/** One titled section. The id is what the desktop side nav scrolls to. */
export function SettingsSection({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  /** beside the eyebrow — "Reset to defaults", "30 MB used" */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} data-settings-section={title} className="mt-8 scroll-mt-20 first:mt-0 lg:scroll-mt-6">
      <SectionHeading action={action}>{title}</SectionHeading>
      {children}
    </section>
  );
}

export const CARD = "overflow-hidden rounded-card border border-rule bg-card";

/** Title and a line of explanation, with a switch opposite. */
export function SwitchRow({
  title,
  description,
  checked,
  onChange,
  disabled,
  className = "",
}: {
  title: string;
  description: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <p className="text-title text-ink">{title}</p>
        <p id={id} className="mt-0.5 text-sm text-ink-soft">
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        label={title}
        describedBy={id}
        disabled={disabled}
      />
    </div>
  );
}

/** A setting's own heading inside a card: Theme, Text size, Reading style. */
export function RowTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-title text-ink">{children}</h3>
      {aside}
    </div>
  );
}

/**
 * "Name saved" — the near-black pill the comps float over the page.
 *
 * `overlay` is the same near-black in every theme, which is what lets it read
 * as something passing over the page rather than part of it.
 */
export function useToast(): [ReactNode, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const show = useCallback((m: string) => {
    setMessage(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3000);
  }, []);
  const node = (
    <div
      role="status"
      aria-live="polite"
      // Above the bottom nav on a phone, the same band the push toast uses.
      className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-8"
    >
      {message && (
        <p className="flex items-center gap-2.5 rounded-tile bg-overlay px-5 py-3 text-sm font-medium text-white shadow-raised">
          <CheckIcon className="h-4 w-4 text-accent" />
          {message}
        </p>
      )}
    </div>
  );
  return [node, show];
}
