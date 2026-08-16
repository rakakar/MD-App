import Link from "next/link";
import { cardSummary } from "./format";
import { ChevronRight } from "@/components/shell/icons";
import { KindTile } from "@/components/ui";
import type { TileKind } from "@/components/ui/KindTile";
import { nodeHref } from "@/lib/library";
import { contentLang } from "@/lib/script";
import type { LibraryRollup, NodeCard } from "@/lib/types";

/**
 * **One collection, as a card or as a row** — the two shapes the layout switch
 * chooses between, and the same pair on every shelf that has one.
 *
 * Written once because the Audio/Video tab and the Library shelf are showing
 * the same object: a folder, its name, how much is inside it and how long that
 * runs. They were drawn twice, and had already drifted — different radii,
 * different tile sizes, a count in a tinted pill on one and accent text on the
 * other — which a reader crossing between the two tabs in one tap sees as two
 * different apps.
 *
 * The tile is passed in rather than derived here: a recording's collection is
 * one kind and takes that kind's glyph, while a library folder may have a cover
 * a manager chose. What must not vary is the box around it, so the size is the
 * shell's business and the picture is the caller's.
 *
 * **Two facts under the name, and only two.** The count in the kind's tint,
 * because that is what a reader is choosing on; the length beside it in plain
 * grey, because that is what they weigh it against. One accent-coloured run
 * saying "3 hours · 5 Videos" made the two the same colour with the wrong one
 * first.
 *
 * `chipTint` is a pair of token classes — `bg-kind-audio text-kind-audio-ink`
 * — so the pill matches the tile beside it on a shelf where every collection
 * is one kind. A mixed shelf leaves it out and gets the workspace accent,
 * which is the honest answer where there is no single kind to colour for.
 */
export function CollectionGridCard({
  href,
  name,
  tile,
  chip,
  note,
  chipTint,
}: {
  href: string;
  name: string;
  /** the kind tile at `sm` — 36px, the card's own scale */
  tile: React.ReactNode;
  /** what is inside: "19 Videos", "10 PDFs · 2 folders" */
  chip: React.ReactNode;
  /** how long it runs, where that is known */
  note?: string;
  /** the kind's tint as token classes, where the collection is all one kind */
  chipTint?: string;
}) {
  const t = contentLang(name);
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-2xl border border-rule bg-card p-3.5 transition-shadow hover:shadow-md"
    >
      <span className="mb-2.5">{tile}</span>
      <span
        {...t}
        className={`${t.className} hi-tight line-clamp-2 text-sm font-semibold group-hover:underline`}
      >
        {name}
      </span>
      {/* mt-auto pins the pair to the floor, so two cards in a row keep their
          counts on one baseline whatever their titles do. */}
      <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2.5">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${chipTint ?? ""}`}
          style={
            chipTint
              ? undefined
              : { background: "var(--color-accent-tint)", color: "var(--ws-ink)" }
          }
        >
          {chip}
        </span>
        {note && <span className="text-xs text-ink-soft">{note}</span>}
      </span>
    </Link>
  );
}

/**
 * The same collection as a row — for a reader who is scanning names rather
 * than looking at shapes.
 *
 * A card each rather than rows on one divided sheet, as the designer draws it:
 * the tile is large enough here to be the row's anchor, and a hairline between
 * two 100px rows would read as a table.
 */
export function CollectionListRow({
  href,
  name,
  description,
  tile,
  chip,
  note,
  chipTint,
}: {
  href: string;
  name: string;
  /**
   * A line of what the folder is, between the name and the count.
   *
   * Only the folders inside a collection have one — a shelf of seven
   * collections is scanned by name, and seven descriptions there would be a
   * paragraph where a list was wanted. One level down there are three or four
   * folders and the reader has already chosen the subject, so what each one
   * holds is the question they now have.
   */
  description?: string | null;
  /** the kind tile at `xl` — 72px, the row's anchor */
  tile: React.ReactNode;
  chip: React.ReactNode;
  note?: string;
  chipTint?: string;
}) {
  const t = contentLang(name);
  return (
    <Link
      href={href}
      className="group flex items-center gap-3.5 rounded-card border border-rule bg-card p-2.5 transition-shadow hover:shadow-md"
    >
      {tile}
      <span className="min-w-0 flex-1">
        <span
          {...t}
          className={`${t.className} hi-tight line-clamp-2 text-sm font-semibold group-hover:underline`}
        >
          {name}
        </span>
        {description && (
          <span
            {...contentLang(description)}
            className={`${contentLang(description).className} mt-1 line-clamp-2 block text-xs text-ink-soft`}
          >
            {description}
          </span>
        )}
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${chipTint ?? ""}`}
            style={
              chipTint
                ? undefined
                : { background: "var(--color-accent-tint)", color: "var(--ws-ink)" }
            }
          >
            {chip}
          </span>
          {note && <span className="text-sm text-ink-soft">{note}</span>}
        </span>
      </span>
      <span aria-hidden className="shrink-0 text-muted">
        <ChevronRight />
      </span>
    </Link>
  );
}

/**
 * The heading a shelf of collections wears, and the shape of it: one uppercase
 * line naming what is below, the count on its own line under it.
 *
 * The count used to be strung after the name on the same line. It is a fact
 * *about* the heading rather than part of it, and at the same size and weight
 * the two competed to be read first — and the pair truncated, because this row
 * shares its width with the layout switch.
 */
export function CollectionsHeading({ children }: { children: React.ReactNode }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
        Collections
      </span>
      <span className="mt-0.5 block truncate text-xs text-ink-soft">{children}</span>
    </span>
  );
}

/**
 * **A library door, in the two shapes the switch offers.**
 *
 * Here rather than on the shelf because Home draws the same cards: its Library
 * band used to be three stat tiles of its own design, which meant the first
 * thing a reader saw of the library looked nothing like the library.
 */
export interface DoorProps {
  door: NodeCard;
  rollup: LibraryRollup;
  shelves: Record<number, string>;
  /** a folder listed *inside* a collection says what it holds — see the row */
  withDescription?: boolean;
}

function doorFacts({ door, rollup, shelves }: DoorProps) {
  const deep = rollup[String(door.id)];
  const kinds = deep?.kinds ?? door.kinds;
  const hours = Math.round((deep?.duration ?? 0) / 3600);
  return {
    href: nodeHref(door.id, shelves),
    name: door.name,
    kind: (kinds.length === 1 ? kinds[0] : "folder") as TileKind,
    cover: door.cover_url,
    description: door.description || null,
    chip: cardSummary(door) || "Nothing yet",
    note: hours > 0 ? `${hours} ${hours === 1 ? "hour" : "hours"}` : undefined,
  };
}

export function DoorCard(props: DoorProps) {
  const { href, name, kind, cover, chip, note } = doorFacts(props);
  return (
    <CollectionGridCard
      href={href}
      name={name}
      tile={<KindTile kind={kind} cover={cover} size="sm" />}
      chip={chip}
      note={note}
    />
  );
}

export function DoorRow(props: DoorProps) {
  const { href, name, description, kind, cover, chip, note } = doorFacts(props);
  return (
    <CollectionListRow
      href={href}
      name={name}
      description={props.withDescription ? description : undefined}
      tile={<KindTile kind={kind} cover={cover} size="xl" />}
      chip={chip}
      note={note}
    />
  );
}
