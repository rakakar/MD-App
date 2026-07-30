"use client";

import Link from "next/link";
import { TrackList } from "@/components/av/TrackList";
import { ProvenanceBadge } from "@/components/resources/ProvenanceBadge";
import { kindsSummary } from "@/components/resources/format";
import type { ResourceLane } from "@/lib/types";

/** first N of each list; the rest are one tap away on the shelf itself */
const LANE_LIMIT = 5;

/**
 * The **संसाधन lane** — collections, audio and video that matched on metadata
 * (contract §13.5).
 *
 * Rendered as one lane from all three lists, and never merged into the
 * citation results beside it. That separation is the point, not a layout
 * choice: a passage hit is quotable back to A. Nagraj ji by canonical ref, and
 * a metadata hit is a filename, a title or a tag that happens to contain the
 * word. Mixing them would let a shivir folder's name look like evidence.
 */
export function ResourceLaneView({ lane }: { lane: ResourceLane }) {
  const total = lane.collections.length + lane.audio.length + lane.video.length;
  if (total === 0) return null;

  return (
    <section aria-label="संसाधन" className="mt-8">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-soft">
        <span lang="hi" className="hi">संसाधन</span> · Library materials
      </h2>
      {/*
        Said plainly, because the difference between the two lanes is invisible
        otherwise: this half searched titles and tags, not the inside of any
        file. Someone who does not know that will read an empty संसाधन lane as
        "the library has nothing on this".
      */}
      <p className="mt-1 text-xs text-ink-soft">
        Matched on titles, topics, people and places — file contents are never indexed.
      </p>

      {lane.collections.length > 0 && (
        <ul className="mt-3 divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-white">
          {lane.collections.slice(0, LANE_LIMIT).map((c) => (
            <li key={c.id}>
              <Link
                href={`/resources/collections/${c.id}`}
                className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-black/[.03]"
              >
                <span lang="hi" className="hi text-[15px] font-medium leading-snug">
                  {c.title_hi}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                  <ProvenanceBadge provenance={c.provenance} provenanceHi={c.provenance_hi} />
                  <span lang="hi" className="hi">
                    {[c.door_name_hi, c.year, c.place, kindsSummary(c.kinds, c.item_count)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {lane.audio.length > 0 && (
        <div className="mt-3">
          <TrackList tracks={lane.audio.slice(0, LANE_LIMIT)} />
        </div>
      )}

      {lane.video.length > 0 && (
        <ul className="mt-3 divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-white">
          {lane.video.slice(0, LANE_LIMIT).map((v) => (
            <li key={v.id}>
              <Link
                href="/videos"
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[.03]"
              >
                <span className="shrink-0 text-xs font-semibold" style={{ color: "var(--ws-ink)" }}>
                  ▶
                </span>
                <span lang="hi" className="hi min-w-0 flex-1 truncate text-sm">
                  {v.title_hi}
                </span>
                <ProvenanceBadge provenance={v.provenance} provenanceHi={v.provenance_hi} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {total > LANE_LIMIT && (
        <p className="mt-3 text-center text-xs">
          <Link
            href="/resources"
            className="font-semibold underline underline-offset-2"
            style={{ color: "var(--ws-ink)" }}
          >
            <span lang="hi" className="hi">पूरा संसाधन संग्रह देखें</span>
          </Link>
        </p>
      )}
    </section>
  );
}
