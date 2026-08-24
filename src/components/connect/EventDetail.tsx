import {
  ChevronRight,
  ExternalLinkIcon,
  PhoneIcon,
  PlayIcon,
  VideoIcon,
} from "@/components/shell/icons";
import { contentLang } from "@/lib/script";
import type { EventContact, EventLink } from "@/lib/events";

/**
 * The furniture of the event detail screen — the panels the comps draw below
 * the poster, and nothing that decides anything.
 */

/** One fact about the event, in its own card: a tinted glyph, a label in small
 *  caps, and the value the API already assembled. */
export function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-card border border-rule bg-card p-3.5 shadow-card">
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-tile bg-kind-audio text-kind-audio-ink"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
          {label}
        </span>
        <span className="mt-0.5 block text-title font-semibold">{children}</span>
      </span>
    </div>
  );
}

/** A panel with a heading and a hairline under it — Invitation Note, Links,
 *  Shivir Recording Playlist. */
export function EventPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-rule bg-card p-5 shadow-card">
      <h2 className="border-b border-rule pb-3 text-title font-semibold">{title}</h2>
      <div className="pt-4">{children}</div>
    </section>
  );
}

/**
 * Tap to call.
 *
 * `tel:` with the phone exactly as the manager typed it, `+91` and all — the
 * contract stores it that way on purpose, and a client that "tidies" a number
 * before dialling it is a client that eventually dials the wrong one. The
 * spaces are the one thing stripped, because `tel:` does not carry them.
 */
export function ContactChip({ contact }: { contact: EventContact }) {
  const l = contentLang(contact.name);
  return (
    <a
      href={`tel:${contact.phone.replace(/\s+/g, "")}`}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-inset px-4 text-sm transition-colors active:bg-ink/[.06]"
    >
      <span aria-hidden className="shrink-0" style={{ color: "var(--ws-ink)" }}>
        <PhoneIcon className="h-4 w-4" />
      </span>
      <span {...l} className={`${l.className} font-semibold`}>
        {contact.name}
      </span>
      {/* `dir="ltr"` and the tabular figures keep a +91 number readable
          wherever it lands beside Devanagari, which sets its own direction
          around the digits. */}
      <span dir="ltr" className="tabular-nums text-ink-soft">
        {contact.phone}
      </span>
    </a>
  );
}

/**
 * The tile in front of a link row.
 *
 * The comps draw three: a green message glyph, a blue camera, a terracotta
 * play. Green is the deviation — there is no green in the kind palette and
 * inventing one for a single row is how a palette stops being one — so a
 * social link takes the document family, which is what `link` already maps to
 * everywhere else in the app: a link is a document you do not hold.
 */
const LINK_TILE: Record<string, { tint: string; glyph: React.ReactNode }> = {
  social: { tint: "bg-kind-doc text-kind-doc-ink", glyph: <ExternalLinkIcon className="h-5 w-5" /> },
  meeting: { tint: "bg-kind-video text-kind-video-ink", glyph: <VideoIcon className="h-5 w-5" /> },
  playlist: { tint: "bg-kind-audio text-kind-audio-ink", glyph: <PlayIcon className="h-5 w-5" /> },
};

const LINK_FALLBACK = LINK_TILE.social;

/**
 * One row of the Links section, or the recording playlist.
 *
 * Every one of these leaves the app, so every one of them says so — a new tab,
 * `rel="noopener"`, and the type on the eyebrow in the manager's own words
 * (`type_label`), not a label this file guesses from the code.
 */
export function EventLinkRow({ link }: { link: EventLink }) {
  const tile = LINK_TILE[link.type] ?? LINK_FALLBACK;
  const l = contentLang(link.label);
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-16 items-center gap-3.5 py-1.5 transition-colors active:bg-ink/[.03]"
    >
      <span
        aria-hidden
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-tile ${tile.tint}`}
      >
        {tile.glyph}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
          {link.type_label}
        </span>
        <span {...l} className={`${l.className} mt-0.5 block truncate text-title font-semibold`}>
          {link.label}
        </span>
      </span>
      <span aria-hidden className="shrink-0" style={{ color: "var(--ws-ink)" }}>
        <ChevronRight />
      </span>
    </a>
  );
}
