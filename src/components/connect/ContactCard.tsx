import { PhoneIcon, PinIcon } from "@/components/shell/icons";
import type { DirectoryContact } from "@/lib/directory";
import { contentLang } from "@/lib/script";

/**
 * A person, drawn twice in this workspace: as a card on the City-wise contacts
 * screen (comp 10) and as a row inside a centre's More details (comp 8).
 *
 * One component for both, because the API sends one shape for both — the same
 * person, carrying the same `id`, whichever screen they appear on. That is the
 * whole reason the backend keeps one contact table: two of them meant the same
 * name with two phone numbers, which is what the comps accidentally showed.
 *
 * `phone` is printed as written down and `phone_href` is what gets dialled.
 * Never the other way round, and never reformatted here.
 */

/** An envelope. The one glyph this screen needs that the app did not have: a
 *  contact may carry a mail address and no phone, and it is a real row. */
function MailIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  );
}

/** The avatar — two letters the API worked out, never the name's first two
 *  characters read off here (a Devanagari name would give a matra). */
function Initials({ initials }: { initials: string }) {
  return (
    <span
      aria-hidden
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
      style={{
        background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
        color: "var(--ws-ink)",
      }}
    >
      {initials}
    </span>
  );
}

/** Tap to call. Tap to mail. Nothing else on these rows is interactive, so
 *  each one is the whole target — 44px, as everywhere else. */
function ReachRow({
  icon,
  href,
  children,
}: {
  icon: React.ReactNode;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex min-h-11 items-center gap-2.5 text-title transition-colors active:bg-ink/[.03]"
    >
      <span aria-hidden className="shrink-0 text-muted">
        {icon}
      </span>
      {/* `dir="ltr"` and tabular figures so a number or an address stays
          readable wherever it lands beside Devanagari, which sets its own
          direction around digits. */}
      <span dir="ltr" className="min-w-0 flex-1 truncate tabular-nums">
        {children}
      </span>
    </a>
  );
}

/**
 * The card on the city-wise screen: avatar, name, place, then whichever of the
 * two reach rows exist.
 *
 * **Both `phone` and `email` are optional** — Suresh Patel on comp 10 shows
 * neither, and the card is still a card. What the API guarantees is that at
 * least one of them is set, so a name here is never a dead end; the hairline
 * above them is drawn only when there is something under it.
 */
export function ContactCard({ contact }: { contact: DirectoryContact }) {
  const n = contentLang(contact.name);
  const reachable = contact.phone || contact.email;

  return (
    <article className="rounded-card border border-rule bg-card p-3.5 shadow-card">
      <div className="flex items-center gap-3">
        <Initials initials={contact.initials} />
        <div className="min-w-0 flex-1">
          <h3 {...n} className={`${n.className} text-title font-semibold`}>
            {contact.name}
          </h3>
          {contact.role && (
            <p className="text-sm text-ink-soft">{contact.role}</p>
          )}
          {contact.location && (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-soft">
              <span aria-hidden className="shrink-0 text-muted">
                <PinIcon className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">{contact.location}</span>
            </p>
          )}
        </div>
      </div>

      {reachable && (
        <div className="mt-2.5 border-t border-rule pt-1">
          {contact.phone && (
            <ReachRow icon={<PhoneIcon className="h-4 w-4" />} href={`tel:${contact.phone_href}`}>
              {contact.phone}
            </ReachRow>
          )}
          {contact.email && (
            <ReachRow icon={<MailIcon />} href={`mailto:${contact.email}`}>
              {contact.email}
            </ReachRow>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * The same person inside a centre's card — the CONTACT block of comp 8.
 *
 * Flatter than the card above and deliberately so: it is already inside a card,
 * and the place is not repeated because the centre above it is the place.
 */
export function ContactRow({ contact }: { contact: DirectoryContact }) {
  const n = contentLang(contact.name);
  return (
    <div className="py-1">
      <div className="flex min-h-11 items-center gap-2.5">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-inset text-xs font-semibold text-ink-soft"
        >
          {contact.initials}
        </span>
        <span {...n} className={`${n.className} min-w-0 flex-1 truncate text-title font-semibold`}>
          {contact.name}
        </span>
        {contact.role && (
          <span className="shrink-0 text-sm text-ink-soft">{contact.role}</span>
        )}
      </div>
      {contact.phone && (
        <ReachRow icon={<PhoneIcon className="h-4 w-4" />} href={`tel:${contact.phone_href}`}>
          {contact.phone}
        </ReachRow>
      )}
      {contact.email && (
        <ReachRow icon={<MailIcon />} href={`mailto:${contact.email}`}>
          {contact.email}
        </ReachRow>
      )}
    </div>
  );
}
