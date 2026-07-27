"use client";

import Link from "next/link";
import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { citationText, refToHref } from "@/lib/refs";
import type { ParaResolution } from "@/lib/types";

/** Sutra of the day — verse gets typographic ceremony (PRD §5 verse styling). */
export function SutraCard({ sutra }: { sutra: ParaResolution }) {
  useEffect(() => {
    track("sutra_view");
  }, []);

  const share = async () => {
    const text = citationText(sutra.text_hi, sutra.canonical_ref);
    track("sutra_share");
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // user cancelled share sheet
    }
  };

  return (
    <figure
      className="rounded-2xl border border-rule bg-white px-6 py-8 text-center shadow-sm"
      style={{ borderTopColor: "var(--ws-color)", borderTopWidth: 3 }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
        आज का सूत्र
      </p>
      <blockquote lang="hi" className="hi mx-auto mt-4 max-w-xl text-xl leading-loose">
        {sutra.text_hi}
      </blockquote>
      <figcaption className="mt-4 text-xs text-ink-soft">
        <Link href={refToHref(sutra.canonical_ref)} className="underline-offset-2 hover:underline">
          <span lang="hi" className="hi">{sutra.book_title}</span> · {sutra.canonical_ref}
        </Link>
        <button
          type="button"
          onClick={share}
          className="ml-3 rounded-full border border-rule px-2.5 py-0.5 text-xs font-medium hover:bg-black/5"
        >
          Share
        </button>
      </figcaption>
    </figure>
  );
}
