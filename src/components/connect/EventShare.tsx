"use client";

import { useState } from "react";
import { ShareIcon } from "@/components/shell/icons";

/**
 * Share, on a card that is not the page you are on.
 *
 * `ui/ShareButton` shares `window.location.href` — right on a detail screen,
 * wrong on a list of eight of them, where every card would share the list. So
 * this one is handed the event's own path and resolves it against the origin
 * at press time, which is the only way to get an absolute URL that is right on
 * a preview deployment as well as in production.
 *
 * The slug is the id everywhere, Share included; that is why there is nothing
 * here that has to look an event up again.
 *
 * Falls back to the clipboard where the Web Share API does not exist — every
 * phone this app is used on has it, and every desktop browser does not. A
 * cancelled share sheet is not an error and says nothing.
 */
export function EventShare({
  title,
  path,
  variant = "button",
}: {
  title: string;
  /** the event's own route — `/connect/events/{slug}` */
  path: string;
  /**
   * `icon` is the rounded square in the detail screen's header row, beside the
   * back button it has to match. `round` is the card's — a circle, because
   * there it stands alone beside a text link rather than in a row of square
   * controls, and the comps draw the difference.
   */
  variant?: "button" | "icon" | "round";
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // cancelled, or a browser that refuses both — neither is worth a dialog
    }
  };

  const label = copied ? "Link copied" : `Share ${title}`;

  if (variant === "icon" || variant === "round") {
    return (
      <button
        type="button"
        onClick={share}
        aria-label={label}
        className={`flex h-11 w-11 shrink-0 items-center justify-center border border-rule bg-card text-ink transition-colors active:bg-ink/[.04] ${
          variant === "round" ? "rounded-full" : "rounded-control"
        }`}
      >
        {copied ? (
          <span className="text-xs font-semibold">✓</span>
        ) : (
          <ShareIcon className="h-4.5 w-4.5" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={label}
      className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-control border border-rule bg-surface px-5 text-sm font-semibold text-ink transition-colors active:bg-ink/[.04]"
    >
      {copied ? "Copied" : "Share"}
    </button>
  );
}
