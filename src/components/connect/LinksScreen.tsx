"use client";

import { useId, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLinkIcon,
  UserIcon,
  VideoIcon,
} from "@/components/shell/icons";
import type { LinkGroup, LinkRow } from "@/lib/directory";
import { contentLang } from "@/lib/script";

/**
 * The Links page — comps 12 and 13.
 *
 * **Every number on this screen is the server's.** `1.`…`6.`, `a.`, `b.` come
 * from each row's position in the manager's order, so inserting a link between
 * two others renumbers the rest without this app counting anything. Numbering
 * here would be a second implementation of that rule, and the two would part
 * company the first time somebody reordered a group.
 *
 * A **heading** is a row with no URL (`is_heading`) — that is how "6. Regional
 * WhatsApp Groups:" gets its indented a/b children, and why there is no flag to
 * set wrongly on the panel: leaving the URL empty is the whole of what a
 * manager means.
 *
 * One accordion open at a time. The groups are four short lists and the reader
 * is looking for one link; leaving three open above the one they are reading
 * only makes them scroll.
 */

/**
 * The glyph in front of a group.
 *
 * The API sends a **code**, not an image — so a manager pointing a group at
 * YouTube instead of WhatsApp is a panel row, and these five glyphs are this
 * app's own, drawn in its own weight and colour. An unknown code takes the
 * generic link glyph rather than nothing: a new code on the server is still a
 * real group, and it must not arrive here as a blank square.
 */
function GroupIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "chat":
      // A speech bubble — WhatsApp and Telegram both, which is what the group
      // is called. Not either brand's mark: shipping logos would mean shipping
      // a mark per service and re-shipping it when one is redrawn.
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 9 9 0 0 1-3.9-.9L4 20.5l1.6-4.2a8.2 8.2 0 0 1-1.1-4.1A8.4 8.4 0 0 1 12.9 3 8.4 8.4 0 0 1 21 11.5Z" />
        </svg>
      );
    case "video":
      return <VideoIcon className="h-5 w-5" />;
    case "facebook":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M14.5 8.5h2.5M14.5 8.5V6.8c0-1 .8-1.8 1.8-1.8H17" />
          <path d="M14.5 8.5V19" />
          <path d="M11 11.5h6" />
        </svg>
      );
    case "people":
      return <UserIcon className="h-5 w-5" />;
    default:
      return <ExternalLinkIcon className="h-5 w-5" />;
  }
}

/** One link. Every one of these leaves the app, so every one of them says so —
 *  a new tab, `rel="noopener"`, and the arrow the comps draw. */
/**
 * Where a link goes, named from its host (16 Nov 2026, UX audit CN9): every
 * row ends in the same "leaves the app" glyph, so a WhatsApp group to join, a
 * YouTube channel and a Facebook page looked alike until tapped. Only the
 * places a reader knows by name; anything else says nothing more than before.
 */
const DESTINATIONS: [RegExp, string][] = [
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "WhatsApp"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "Facebook"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)(t\.me|telegram\.me)$/, "Telegram"],
  [/(^|\.)(twitter\.com|x\.com)$/, "X"],
  [/(^|\.)drive\.google\.com$/, "Google Drive"],
  [/(^|\.)(docs|forms)\.google\.com$/, "Google"],
  [/(^|\.)pcloud\.(com|link)$/, "pCloud"],
];

function destination(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return DESTINATIONS.find(([re]) => re.test(host))?.[1] ?? null;
  } catch {
    return null;
  }
}

function LinkRowView({
  row,
  indent = false,
  wide = false,
}: {
  row: LinkRow;
  indent?: boolean;
  /** the desktop panel's roomier row, with the comp's small ↗ */
  wide?: boolean;
}) {
  const l = contentLang(row.label);
  const dest = destination(row.url);
  return (
    <a
      href={row.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex min-h-14 items-start gap-2 text-title transition-colors active:bg-ink/[.03] ${
        wide ? "py-4 pe-7 hover:bg-ink/[.02]" : "py-2.5 pe-4"
      } ${indent ? (wide ? "ps-12" : "ps-9") : wide ? "ps-7" : "ps-4"}`}
    >
      <span className="shrink-0 tabular-nums text-ink-soft">{row.number}</span>
      <span {...l} className={`${l.className} min-w-0 flex-1`}>
        {row.label}
      </span>
      {dest && <span className="mt-0.5 shrink-0 text-xs text-ink-soft">{dest}</span>}
      <span aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--ws-ink)" }}>
        {wide ? <ArrowUpRight /> : <ExternalLinkIcon className="h-4 w-4" />}
      </span>
    </a>
  );
}

/** A heading row — the label above its children. Not a link and not tappable:
 *  it has no URL, which is exactly what makes it a heading. */
function HeadingRow({ row, wide = false }: { row: LinkRow; wide?: boolean }) {
  const l = contentLang(row.label);
  return (
    <p
      className={`flex items-start gap-2 font-semibold ${wide ? "px-7 py-3.5" : "px-4 py-2.5 text-title"}`}
      style={{
        background: "color-mix(in srgb, var(--ws-color) 7%, var(--color-card))",
        color: "var(--ws-ink)",
      }}
    >
      <span className="shrink-0 tabular-nums">{row.number}</span>
      <span {...l} className={l.className}>
        {row.label}
      </span>
    </p>
  );
}

function Group({
  group,
  open,
  onToggle,
}: {
  group: LinkGroup;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  return (
    <article className="overflow-hidden rounded-card border border-rule bg-card shadow-card">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-16 w-full items-center gap-3.5 p-3.5 text-start"
        >
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-tile"
            style={{
              background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
              color: "var(--ws-ink)",
            }}
          >
            <GroupIcon icon={group.icon} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-title font-semibold">{group.title}</span>
            {/* How much is inside before opening it, as desktop prints it
                (16 Nov 2026, UX audit CN9). */}
            <span className="block text-xs tabular-nums text-ink-soft">
              {linkCount(group)} {linkCount(group) === 1 ? "link" : "links"}
            </span>
          </span>
          <span
            aria-hidden
            className={`shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
            style={{ color: open ? "var(--ws-ink)" : "var(--color-muted)" }}
          >
            {/* One chevron that turns, not two that swap. The panel below now
                opens gradually, and an icon that changes in a single frame
                above it is the one part of the gesture that still snaps —
                which is exactly the same reason a centre's card draws it this
                way. */}
            <ChevronDown />
          </span>
        </button>
      </h3>

      {/* Rendered while closed, so `.disclosure` has a height to animate from,
          with `inert` doing what the unmount used to: a subtree that still
          answers to Tab while hidden would put every link of every group in the
          tab order of a screen showing four rows.

          The plain `div` between the two is load-bearing. `.disclosure > *` is
          what gets clipped, and the `ul` carries a top border — on the grid
          child that border would paint at `0fr` too, as a hairline under a
          closed group. */}
      <div className="disclosure" data-open={open}>
        <div>
          <ul id={panelId} inert={!open} className="border-t border-rule">
          {group.items.map((row) => (
            <li key={row.id} className="border-b border-rule last:border-b-0">
              {row.is_heading ? <HeadingRow row={row} /> : <LinkRowView row={row} />}
              {row.children && row.children.length > 0 && (
                <ul>
                  {row.children.map((kid) => (
                    <li key={kid.id} className="border-t border-rule">
                      {kid.is_heading ? (
                        <HeadingRow row={kid} />
                      ) : (
                        <LinkRowView row={kid} indent />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

/** The comp's ↗ — smaller and plainer than the box-and-arrow, for a panel
 *  where every row leaves the app and the glyph only has to say so. */
function ArrowUpRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

/** Every row that is a link, children included — what "7 links" counts. */
function linkCount(group: LinkGroup): number {
  let n = 0;
  for (const row of group.items) {
    if (!row.is_heading) n++;
    for (const kid of row.children ?? []) if (!kid.is_heading) n++;
  }
  return n;
}

/**
 * **A desktop shows one group at a time beside the list of them** (designer's
 * comp, 23 Oct 2026) instead of the phone's accordion: the groups down the
 * left, the chosen one's links in a panel on the right. One is always chosen —
 * the first, until the reader picks another — so the panel is never empty.
 */
function LinksDesktop({ groups }: { groups: LinkGroup[] }) {
  const [code, setCode] = useState(groups[0].code);
  const group = groups.find((g) => g.code === code) ?? groups[0];
  const count = linkCount(group);

  return (
    <div className="hidden lg:mt-8 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <ul className="flex flex-col gap-4" aria-label="Link groups">
        {groups.map((g) => {
          const on = g.code === group.code;
          return (
            <li key={g.code}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setCode(g.code)}
                className={`flex min-h-20 w-full items-center gap-4 rounded-card border-2 bg-card px-5 text-start shadow-card transition-colors ${
                  on ? "" : "border-rule hover:border-ink/20"
                }`}
                style={on ? { borderColor: "var(--ws-ink)" } : undefined}
              >
                <span
                  aria-hidden
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-tile"
                  style={{
                    background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
                    color: "var(--ws-ink)",
                  }}
                >
                  <GroupIcon icon={g.icon} />
                </span>
                <span className="min-w-0 flex-1 text-title font-semibold">{g.title}</span>
                <span aria-hidden className="shrink-0 text-ink-soft">
                  <ChevronRight />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <section
        aria-labelledby="links-panel-title"
        className="sticky top-8 min-h-[calc(100dvh-14rem)] overflow-hidden rounded-card border border-rule bg-card shadow-card"
      >
        <div className="flex items-center justify-between gap-4 border-b border-rule px-7 py-5">
          <h2 id="links-panel-title" className="text-xl font-semibold">
            {group.title}
          </h2>
          <span className="shrink-0 text-sm tabular-nums text-ink-soft">
            {count} {count === 1 ? "link" : "links"}
          </span>
        </div>
        <ul>
          {group.items.map((row) => (
            <li key={row.id} className="border-b border-rule last:border-b-0">
              {row.is_heading ? <HeadingRow row={row} wide /> : <LinkRowView row={row} wide />}
              {row.children && row.children.length > 0 && (
                <ul>
                  {row.children.map((kid) => (
                    <li key={kid.id} className="border-t border-rule">
                      {kid.is_heading ? (
                        <HeadingRow row={kid} wide />
                      ) : (
                        <LinkRowView row={kid} indent wide />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function LinksScreen({ groups }: { groups: LinkGroup[] }) {
  // Every group closed on arrival (designer, 19 Nov 2026 — reverses the
  // first-group-open of UX audit CN9): the first group is the long
  // WhatsApp/Telegram list, and open it pushed the other groups off a phone
  // screen. Each closed card already says how many links it holds.
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
    <LinksDesktop groups={groups} />
    {/* Phone: the accordion. */}
    <ul className="mt-4 flex flex-col gap-3 lg:hidden">
      {groups.map((g) => (
        <li key={g.code}>
          <Group
            group={g}
            open={open === g.code}
            onToggle={() => setOpen((cur) => (cur === g.code ? null : g.code))}
          />
        </li>
      ))}
    </ul>
    </>
  );
}
