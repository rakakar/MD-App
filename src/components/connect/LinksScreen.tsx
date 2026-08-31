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
function LinkRowView({ row, indent = false }: { row: LinkRow; indent?: boolean }) {
  const l = contentLang(row.label);
  return (
    <a
      href={row.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex min-h-14 items-start gap-2 py-2.5 pe-4 text-title transition-colors active:bg-ink/[.03] ${
        indent ? "ps-9" : "ps-4"
      }`}
    >
      <span className="shrink-0 tabular-nums text-ink-soft">{row.number}</span>
      <span {...l} className={`${l.className} min-w-0 flex-1`}>
        {row.label}
      </span>
      <span aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--ws-ink)" }}>
        <ExternalLinkIcon className="h-4 w-4" />
      </span>
    </a>
  );
}

/** A heading row — the label above its children. Not a link and not tappable:
 *  it has no URL, which is exactly what makes it a heading. */
function HeadingRow({ row }: { row: LinkRow }) {
  const l = contentLang(row.label);
  return (
    <p
      className="flex items-start gap-2 px-4 py-2.5 text-title font-semibold"
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
          <span className="min-w-0 flex-1 text-title font-semibold">{group.title}</span>
          <span
            aria-hidden
            className="shrink-0"
            style={{ color: open ? "var(--ws-ink)" : "var(--color-muted)" }}
          >
            {open ? <ChevronDown /> : <ChevronRight />}
          </span>
        </button>
      </h3>

      {/* Unmounted while closed rather than hidden: a `hidden` subtree that
          still answers to Tab would put every link of every group in the tab
          order of a screen showing four rows. */}
      {open && (
        <ul id={panelId} className="border-t border-rule">
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
      )}
    </article>
  );
}

export function LinksScreen({ groups }: { groups: LinkGroup[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <ul className="mt-4 flex flex-col gap-3">
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
  );
}
