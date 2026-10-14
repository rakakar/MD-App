"use client";

import { useEffect, useRef, useState } from "react";
import { ShareIcon } from "@/components/shell/icons";
import { contentLang } from "@/lib/script";

/** What the detail screen hands over so Share can send the invitation itself. */
export interface EventInvite {
  slug: string;
  note: string;
  registrationUrl: string;
  hasPoster: boolean;
}

/**
 * The caption: the note as the organiser wrote it, then where to register.
 * The registration line is skipped when the note already carries that exact
 * URL, and labelled in the note's own language.
 */
function inviteText({ note, registrationUrl }: EventInvite): string {
  const parts = [note.trim()];
  if (registrationUrl && !note.includes(registrationUrl)) {
    const label = contentLang(note).lang === "hi" ? "पंजीकरण हेतु:" : "Register:";
    parts.push(`${label}\n${registrationUrl}`);
  }
  return parts.filter(Boolean).join("\n\n");
}

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
 * **With an `invite`, it sends the invitation rather than a link.** A link
 * lands in WhatsApp as a preview card that crops the poster and cuts the note
 * off after three lines; what organisers actually forward is the poster with
 * the note under it as the caption, so that is what goes. The poster is
 * fetched when the button mounts, not when it is pressed: the share sheet
 * must open inside the tap, and iOS withdraws permission for it if a half-MB
 * download comes first. Until the poster is in, or where files cannot be
 * shared, the note goes as text alone. The cards on the list screen pass no
 * invite — eight posters downloaded to share none of them is the wrong trade —
 * and keep sharing the link.
 *
 * Falls back to the clipboard where the Web Share API does not exist — every
 * phone this app is used on has it, and every desktop browser does not. A
 * cancelled share sheet is not an error and says nothing.
 */
export function EventShare({
  title,
  path,
  invite,
  variant = "button",
}: {
  title: string;
  /** the event's own route — `/connect/events/{slug}` */
  path: string;
  invite?: EventInvite;
  /** `icon` is the square in the detail screen's header row */
  variant?: "button" | "icon";
}) {
  const [copied, setCopied] = useState(false);
  const poster = useRef<File | null>(null);

  const slug = invite?.hasPoster ? invite.slug : null;
  useEffect(() => {
    if (!slug) return;
    const ctl = new AbortController();
    fetch(`/connect/events/${encodeURIComponent(slug)}/poster`, { signal: ctl.signal })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!blob) return;
        const ext = blob.type === "image/png" ? "png" : "jpg";
        poster.current = new File([blob], `${slug}.${ext}`, { type: blob.type || "image/jpeg" });
      })
      .catch(() => {
        // no poster to attach; the note still goes as text
      });
    return () => ctl.abort();
  }, [slug]);

  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    try {
      const text = invite ? inviteText(invite) : "";
      const files = poster.current ? [poster.current] : null;
      // An event with no note, no registration and no poster has no
      // invitation to send; it falls through to the link.
      if (text || files) {
        if (files && navigator.canShare?.({ files, text })) {
          await navigator.share({ files, text });
          return;
        }
        if (navigator.share) {
          await navigator.share({ text });
          return;
        }
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
        return;
      }
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

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={share}
        aria-label={label}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-rule bg-card text-ink transition-colors active:bg-ink/[.04]"
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
