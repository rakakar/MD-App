"use client";

import Link from "next/link";
import { editionHref, type EditionRef } from "@/lib/editions";
import { contentLang } from "@/lib/script";
import { Sheet } from "./Sheet";

/**
 * Which rendering of this work you are reading, and the others there are.
 *
 * Only ever opened when there are three or more — with a single alternative the
 * top bar is the switch itself, and a sheet to choose between two things one of
 * which you are already looking at is a dialogue box asking a rhetorical
 * question.
 *
 * Each row names its translator, because that is the fact that distinguishes
 * them: three students rendering the same book are three rows here, identical
 * but for the name. The original names nobody — its translator *is* its author,
 * and "Translator: ए. नागराज" would be a small lie in a list whose whole job is
 * saying whose words these are.
 */
export function EditionsSheet({
  open,
  onClose,
  editions,
  chapter,
}: {
  open: boolean;
  onClose: () => void;
  editions: EditionRef[];
  /** where the reader has got to — every row resolves against it */
  chapter: number;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Editions">
      <p className="px-5 pb-1 pt-3 text-sm text-(--reader-ink-soft)">
        The same work, rendered by different hands. Pages and paragraph numbers
        differ between them, so a citation belongs to the edition it was taken
        from.
      </p>
      <ul className="pb-2">
        {editions.map((e) => {
          const name = contentLang(e.label);
          const carries = e.chapters.includes(chapter);
          const row = (
            <>
              <span className="min-w-0 flex-1">
                <span
                  {...name}
                  className={`${name.className} block text-sm font-semibold`}
                >
                  {e.label}
                </span>
                <span className="mt-0.5 block text-xs text-(--reader-ink-soft)">
                  {e.isOriginal ? (
                    "The original"
                  ) : (
                    <>
                      Translated by{" "}
                      <span {...contentLang(e.translator)}>{e.translator}</span>
                    </>
                  )}
                  {!e.current && !carries && ` · no chapter ${chapter}; opens at its contents`}
                </span>
              </span>
              {e.current && (
                <span className="shrink-0 text-xs font-semibold" style={{ color: "var(--ws-ink)" }}>
                  Reading
                </span>
              )}
            </>
          );

          return (
            <li key={e.code}>
              {e.current ? (
                <span
                  aria-current="true"
                  className="flex items-center gap-3 px-5 py-3"
                  style={{ background: "color-mix(in srgb, var(--ws-color) 10%, transparent)" }}
                >
                  {row}
                </span>
              ) : (
                <Link
                  href={editionHref(e, chapter)}
                  hrefLang={e.language}
                  onClick={onClose}
                  className="flex items-center gap-3 px-5 py-3 transition-colors active:bg-current/5"
                >
                  {row}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
