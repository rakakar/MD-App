"use client";

import { GlossaryProvider } from "@/components/reader/GlossaryProvider";
import { useDefinitionSegments } from "./DefinitionText";
import { DefinitionList, WordTrailProvider } from "./WordTrail";
import type { ParibhashaWord } from "@/lib/types";

/**
 * The definitions on `/paribhasha/{id}`, marked and followable.
 *
 * The shared page needs the same recursion as the list — someone who arrives
 * on अनुभव गम्य from a link is in exactly the position that makes the terms
 * inside it worth tapping. Still server-rendered as plain text first, so the
 * definition is in the HTML for a search engine and for a reader with no
 * JavaScript; the marks arrive with the headword index.
 */
export function WordEntry({ word }: { word: ParibhashaWord }) {
  return (
    <GlossaryProvider>
      <WordTrailProvider>
        <Definitions word={word} />
      </WordTrailProvider>
    </GlossaryProvider>
  );
}

function Definitions({ word }: { word: ParibhashaWord }) {
  const segments = useDefinitionSegments(word.definitions, word.hindi);
  return <DefinitionList definitions={word.definitions} segments={segments} />;
}
