import Link from "next/link";
import { ChevronRight, PlayIcon } from "@/components/shell/icons";
import { contentLang } from "@/lib/script";
import { KindTile, type TileKind } from "./KindTile";

/**
 * The cards the comps repeat.
 *
 * Every one of them is the same object seen from a different distance: a
 * tinted kind tile, something to read, and one line of counted fact in the
 * workspace accent. Drawing them once is the difference between adding
 * Translations later for free and re-deriving four almost-identical cards.
 */

/** Devanagari titles need `lang` and the face class; both come from the text
 *  itself, and both have to survive being merged with layout classes. */
function scripted(text: string, extra: string) {
  const l = contentLang(text);
  return { lang: l.lang, className: `${l.className} ${extra}`.trim() };
}

/**
 * A collection in a two-up grid — a Library folder, an Audio/Video series.
 *
 * `meta` is the counted line at the foot ("15 PDFs · 2 folders", "3 hours ·
 * 5 videos") and it is deliberately required: a card that cannot say how much
 * is behind it is a door with no handle, and the comps never draw one.
 */
export function CollectionCard({
  href,
  kind,
  eyebrow,
  cover,
  title,
  description,
  meta,
  badge,
}: {
  href: string;
  kind: TileKind;
  /** the collection's own picture, when the BE has one */
  cover?: string | null;
  /** the small line above the title — "मूल ग्रंथ / वीडियो" */
  eyebrow?: string;
  title: string;
  description?: string | null;
  meta: React.ReactNode;
  /** rides beside the meta line — provenance, on a borrowed folder */
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      // h-full so two cards in a grid row match height whatever their titles
      // do, and the meta lines below them stay on one baseline.
      className="group flex h-full flex-col rounded-card border border-rule bg-card p-4 shadow-card transition-shadow hover:shadow-raised"
    >
      <KindTile kind={kind} cover={cover} />
      {eyebrow && (
        <span {...scripted(eyebrow, "mt-3 block truncate text-xs text-ink-soft")}>
          {eyebrow}
        </span>
      )}
      <span
        {...scripted(
          title,
          `${eyebrow ? "mt-1" : "mt-3"} block line-clamp-2 text-title font-semibold leading-snug group-hover:underline`
        )}
      >
        {title}
      </span>
      {description && (
        <span {...scripted(description, "mt-1.5 block line-clamp-3 text-sm text-ink-soft")}>
          {description}
        </span>
      )}
      {/* mt-auto pins the count to the floor of the card rather than to the
          bottom of whatever description happened to arrive. */}
      <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3">
        <span className="text-sm font-semibold" style={{ color: "var(--ws-ink)" }}>
          {meta}
        </span>
        {badge}
      </span>
    </Link>
  );
}

/**
 * One number and what it counts — the three tiles under Library on Home.
 *
 * Small on purpose: it is a signpost, not a statistic. The count sits under
 * the label rather than beside it because at the largest text size a
 * side-by-side pair wraps, and a wrapped "138" reads as a second label.
 */
export function StatTile({
  href,
  kind,
  cover,
  label,
  count,
}: {
  href: string;
  kind: TileKind;
  cover?: string | null;
  label: string;
  count: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex h-full flex-col gap-2 rounded-card border border-rule bg-card p-3 shadow-card transition-shadow hover:shadow-raised"
    >
      <KindTile kind={kind} cover={cover} size="sm" />
      {/* Two lines, not one truncated one. The comps label these "PDFs" and
          "Shivir"; the folders they actually stand for are called
          "परिचयात्मक संकलन (प्रवेश सप्तम)", and three of those across a phone
          truncate to "परिचयात्मक …", which names nothing. Two lines and a
          clamp is the most a 110px tile can honestly show. */}
      <span {...scripted(label, "block line-clamp-2 text-sm font-semibold leading-snug")}>
        {label}
      </span>
      <span className="mt-auto block text-xs tabular-nums text-ink-soft">{count}</span>
    </Link>
  );
}

/**
 * The dark band that opens a whole room — Audio & Video on Home.
 *
 * Dark rather than accent-tinted, as drawn: this is the one card on a page of
 * pale cards that has to read as a doorway rather than as another item, and
 * lightness is the only difference a reader registers before reading anything.
 * It carries its own ink because the surface is fixed in every theme — the
 * same reason the workspace fills elsewhere do not follow the theme either.
 */
export function PromoBand({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="relative flex items-center gap-3.5 overflow-hidden rounded-card p-4 text-white shadow-card transition-opacity hover:opacity-95"
      style={{ background: "linear-gradient(105deg, #241c16, #1b1512 60%, #171310)" }}
    >
      {/* The waveform behind the text in the comp. Decorative and low-contrast
          by design, so it is drawn as a gradient rather than as art nobody can
          swap: bars would be a second asset to keep in three themes. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2"
        style={{
          background:
            "repeating-linear-gradient(90deg, rgb(255 255 255 / 0.055) 0 6px, transparent 6px 14px)",
          maskImage: "linear-gradient(90deg, transparent, #000 70%)",
        }}
      />
      <span
        aria-hidden
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: "var(--ws-color)" }}
      >
        <PlayIcon className="h-5 w-5" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-title font-semibold leading-tight">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-white/70">{subtitle}</span>
      </span>
      <span aria-hidden className="relative shrink-0 text-white/50">
        <ChevronRight />
      </span>
    </Link>
  );
}
