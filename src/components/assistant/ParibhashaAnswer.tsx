"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "@/components/shell/icons";
import { getParibhasha } from "@/lib/api";
import { relatedWords } from "@/lib/assistant/related";
import { searchGlossary } from "@/lib/glossary";
import type { ParibhashaWord } from "@/lib/types";
import { EntryIcon } from "./icons";
import { AnswerEyebrow, SuggestionChip } from "./parts";
import type { Ask } from "./types";

/** the first card and this many more — a peek, not the whole dictionary */
const MORE_ROWS = 3;

/**
 * 2 · Paribhasha — inline peek.
 *
 * The first entry opens in full, because someone who typed a word wants its
 * definition and not a list to choose from; any others that also matched
 * follow as rows, each a tap from its own page.
 *
 * Answered from the dictionary on the device, so it is instant and costs
 * nothing. The endpoint is the fallback for a device that could not get the
 * dictionary, and is the same ladder of matches either way (`lib/glossary`).
 */
export function ParibhashaAnswer({
  query,
  dictionary,
  onAsk,
  onSettle,
}: {
  query: string;
  dictionary: ParibhashaWord[] | null;
  onAsk: Ask;
  onSettle: (summary: string, count: number) => void;
}) {
  const local = useMemo(
    () => (dictionary ? searchGlossary(dictionary, query, 1 + MORE_ROWS) : null),
    [dictionary, query]
  );
  const [remote, setRemote] = useState<ParibhashaWord[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (dictionary) return;
    let alive = true;
    getParibhasha({ q: query })
      .then((page) => alive && setRemote(page.results.slice(0, 1 + MORE_ROWS)))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [dictionary, query]);

  const words = local ?? remote;

  useEffect(() => {
    if (!words) return;
    onSettle(
      words.length === 0
        ? "No entry in the glossary"
        : words.length === 1
          ? (words[0].definitions[0] ?? words[0].hindi)
          : `${words.length} paribhasha entries · ${words.map((w) => w.hindi).join(", ")}`,
      words.length
    );
    // settle once per answer, not per parent render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);

  if (failed) {
    return <p className="text-sm text-ink-soft">The glossary isn’t available right now.</p>;
  }
  if (!words) {
    return <p className="text-sm text-ink-soft" role="status">Looking it up…</p>;
  }
  if (words.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <AnswerEyebrow label="Paribhasha" count="No entry" />
        <p className="text-sm text-ink-soft">
          “{query}” is not a word the glossary defines. It may still be discussed in the books.
        </p>
        <div className="flex flex-wrap gap-2">
          <SuggestionChip onClick={() => onAsk(query, "books")}>Find it in the books</SuggestionChip>
        </div>
      </div>
    );
  }

  const [first, ...rest] = words;
  const related = dictionary ? relatedWords(dictionary, first, 1)[0] : undefined;

  return (
    <div className="flex flex-col gap-4">
      <AnswerEyebrow
        label="Paribhasha"
        count={words.length === 1 ? "1 entry" : `${words.length} entries`}
      />

      <article className="rounded-card border border-rule bg-card p-5 shadow-card">
        <h3 className="flex flex-wrap items-baseline gap-x-3">
          <span lang="hi" className="hi text-3xl font-semibold leading-tight">
            {first.hindi}
          </span>
          {first.hinglish && <span className="text-sm text-ink-soft">{first.hinglish}</span>}
        </h3>
        {first.definitions[0] && (
          <p lang="hi" className="hi mt-3 text-lg leading-relaxed">
            {first.definitions[0]}
          </p>
        )}
        <div className="mt-4 flex items-center gap-2 border-t border-rule pt-3 text-sm">
          <EntryIcon className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 text-ink-soft">
            Paribhasha
            {first.definitions.length > 1 && ` · ${first.definitions.length} parts`}
          </span>
          <Link
            href={`/paribhasha/${first.id}`}
            className="inline-flex min-h-11 items-center gap-1 font-semibold"
            style={{ color: "var(--ws-ink)" }}
          >
            Full entry
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </article>

      {rest.map((w) => (
        <Link
          key={w.id}
          href={`/paribhasha/${w.id}`}
          className="flex items-center gap-3 rounded-card border border-rule bg-card px-5 py-4"
        >
          <span className="min-w-0 flex-1">
            <span lang="hi" className="hi block text-lg font-semibold leading-snug">
              {w.hindi}
            </span>
            {w.definitions[0] && (
              <span lang="hi" className="hi-note mt-0.5 line-clamp-1 block text-sm text-ink-soft">
                {w.definitions[0]}
              </span>
            )}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        </Link>
      ))}

      <div className="flex flex-wrap gap-2">
        <SuggestionChip onClick={() => onAsk(first.hindi, "books")}>
          Find in the books
        </SuggestionChip>
        {related && (
          <SuggestionChip onClick={() => onAsk(related.hindi, "paribhasha")}>
            Related:&nbsp;
            <span lang="hi" className="hi font-semibold">
              {related.hindi}
            </span>
          </SuggestionChip>
        )}
        <SuggestionChip
          onClick={() => onAsk(`${first.hindi} को सरल शब्दों में समझाइए`, "research")}
        >
          Explain simply
        </SuggestionChip>
      </div>
    </div>
  );
}
