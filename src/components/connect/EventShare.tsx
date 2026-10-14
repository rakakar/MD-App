"use client";

import { useEffect, useRef, useState } from "react";
import { ShareIcon } from "@/components/shell/icons";
import { getEvent } from "@/lib/api";
import { contentLang } from "@/lib/script";

/** What the detail screen already has, so Share need not look it up. */
export interface EventInvite {
  slug: string;
  note: string;
  registrationUrl: string;
  hasPoster: boolean;
}

/** What goes out: the caption, and the poster when there is one. */
interface Ready {
  text: string;
  file: File | null;
}

/**
 * The caption: the note as the organiser wrote it, then where to register.
 * The registration line is skipped when the note already carries that exact
 * URL, and labelled in the note's own language.
 */
function inviteText({ note, registrationUrl }: Pick<EventInvite, "note" | "registrationUrl">): string {
  const parts = [note.trim()];
  if (registrationUrl && !note.includes(registrationUrl)) {
    const label = contentLang(note).lang === "hi" ? "पंजीकरण हेतु:" : "Register:";
    parts.push(`${label}\n${registrationUrl}`);
  }
  return parts.filter(Boolean).join("\n\n");
}

async function loadPoster(slug: string): Promise<File | null> {
  try {
    const res = await fetch(`/connect/events/${encodeURIComponent(slug)}/poster`);
    if (!res.ok) return null;
    const blob = await res.blob();
    const ext = blob.type === "image/png" ? "png" : "jpg";
    return new File([blob], `${slug}.${ext}`, { type: blob.type || "image/jpeg" });
  } catch {
    return null; // no poster to attach; the note still goes as text
  }
}

/** A card knows only the slug, so it looks the rest up. */
async function loadInvite(slug: string, known?: EventInvite): Promise<Ready> {
  let invite = known;
  if (!invite) {
    const e = await getEvent(slug);
    invite = {
      slug,
      note: e.invitation_note,
      registrationUrl: e.registration_url,
      hasPoster: Boolean(e.poster),
    };
  }
  return {
    text: inviteText(invite),
    file: invite.hasPoster ? await loadPoster(slug) : null,
  };
}

/**
 * **Share a shivir: its poster, with the invitation as the caption.**
 *
 * A link lands in WhatsApp as a preview card that crops the poster and cuts
 * the note off after three lines; what organisers actually forward is the
 * poster with the note under it, so that is what goes. An event with no note,
 * no registration and no poster has nothing to send but its link, and sends
 * that.
 *
 * **The share sheet must open inside the tap.** iOS withdraws permission for
 * it if a half-MB download comes between the tap and the call, so the
 * download starts early: on the detail screen as soon as the button mounts
 * (the reader is already looking at that shivir), on a card the moment a
 * finger or pointer goes down on the button (eight posters downloaded to
 * share none of them is the wrong trade). Usually it is in by the time the
 * tap lands. If it is not, and the browser refuses the sheet once it is, the
 * button is left armed — the next tap shares at once.
 *
 * The path is resolved against the origin at press time, which is the only
 * way to get an absolute URL that is right on a preview deployment as well as
 * in production.
 *
 * Falls back to the clipboard where the Web Share API does not exist — every
 * phone this app is used on has it, and every desktop browser does not. A
 * cancelled share sheet is not an error and says nothing.
 */
export function EventShare({
  title,
  path,
  slug,
  invite,
  variant = "button",
}: {
  title: string;
  /** the event's own route — `/connect/events/{slug}` */
  path: string;
  slug: string;
  /** the detail screen's copy of the invitation; a card passes none */
  invite?: EventInvite;
  /** `icon` is the square in the detail screen's header row */
  variant?: "button" | "icon";
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const pending = useRef<Promise<Ready> | null>(null);
  const ready = useRef<Ready | null>(null);

  const prepare = () => {
    if (!pending.current) {
      const p = loadInvite(slug, invite);
      pending.current = p;
      p.then(
        (r) => (ready.current = r),
        () => (pending.current = null) // try again on the next press
      );
    }
    return pending.current;
  };

  // The detail screen already holds the invitation; fetch its poster now.
  const eager = Boolean(invite);
  useEffect(() => {
    if (eager) void prepare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eager]);

  const flash = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const send = async ({ text, file }: Ready) => {
    const url = new URL(path, window.location.origin).toString();
    const files = file ? [file] : null;
    if (files && navigator.canShare?.({ files, text })) {
      await navigator.share({ files, text });
    } else if (!text) {
      if (navigator.share) await navigator.share({ title, url });
      else await navigator.clipboard.writeText(url).then(flash);
    } else if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text).then(flash);
    }
  };

  const share = async () => {
    setArmed(false);
    let r = ready.current;
    if (!r) {
      setBusy(true);
      try {
        r = await prepare();
      } catch {
        // the event could not be fetched; its link can still go
        r = { text: "", file: null };
      } finally {
        setBusy(false);
      }
    }
    try {
      await send(r);
    } catch (e) {
      // The tap's permission ran out while the poster downloaded. Everything
      // is in hand now, so the next tap goes straight through.
      if (e instanceof DOMException && e.name === "NotAllowedError") setArmed(true);
      // anything else is a cancelled sheet, which is not worth a dialog
    }
  };

  const label = copied
    ? "Copied"
    : armed
      ? `Ready — tap again to share ${title}`
      : `Share ${title}`;
  const handlers = { onClick: share, onPointerDown: () => void prepare(), "aria-label": label };
  const ring = armed ? { borderColor: "var(--ws-color)", color: "var(--ws-ink)" } : undefined;

  if (variant === "icon") {
    return (
      <button
        type="button"
        {...handlers}
        aria-busy={busy}
        style={ring}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-rule bg-card text-ink transition-colors active:bg-ink/[.04] ${
          busy ? "animate-pulse" : ""
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
      {...handlers}
      aria-busy={busy}
      style={ring}
      className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-control border border-rule bg-surface px-5 text-sm font-semibold text-ink transition-colors active:bg-ink/[.04] ${
        busy ? "animate-pulse" : ""
      }`}
    >
      {copied ? "Copied" : armed ? "Tap to share" : "Share"}
    </button>
  );
}
