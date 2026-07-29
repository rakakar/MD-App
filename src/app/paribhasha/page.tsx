import type { Metadata } from "next";
import { GlossaryBrowser } from "@/components/paribhasha/GlossaryBrowser";
import { WordTrailProvider } from "@/components/paribhasha/WordTrail";
import { GlossaryProvider } from "@/components/reader/GlossaryProvider";
import { PageContainer } from "@/components/ui";
import { getParibhasha } from "@/lib/api";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "परिभाषा · Glossary",
  description:
    "मध्यस्थ दर्शन की शब्दावली — परिभाषा संहिता के आधार पर संकलित शब्द और उनकी परिभाषाएँ।",
};

interface Search {
  /** ranked search: headword, Roman spelling, then definition text */
  q?: string;
  /** Devanagari initial for the अ आ इ index */
  letter?: string;
}

/**
 * परिभाषा — the glossary page (contract §14.1).
 *
 * **Not a fourth section.** Like search and Sutra of the day this is a
 * cross-cutting utility, so it neither claims a workspace nor switches the
 * one the reader is in — no `WorkspaceScope` here, exactly as on /search.
 *
 * The first screenful is fetched on the server so a shared ?letter= or ?q=
 * URL arrives with its words already on it, and so 2,802 Hindi definitions
 * are readable without JavaScript.
 */
export default async function ParibhashaPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { q, letter } = await searchParams;
  // A failure here is a page with an empty list, not a crashed route — the
  // browser refetches on its own as soon as the reader touches anything.
  const initial = await getParibhasha({ q, letter }).catch(() => ({
    results: [],
    next: null,
  }));

  return (
    <PageContainer>
      <h1 lang="hi" className="hi text-xl font-bold">
        परिभाषा
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        <span lang="hi" className="hi">
          मध्यस्थ दर्शन की शब्दावली, परिभाषा संहिता के आधार पर।
        </span>
      </p>

      {/* The same headword index the reader uses, so the words *inside* these
          definitions are marked and tappable — the glossary is written in the
          vocabulary it defines, and following that vocabulary is the whole
          point of a dictionary. The trail above it remembers the path. */}
      <GlossaryProvider>
        <WordTrailProvider>
          {/* Keyed on the letter so stepping to another one starts the list
              over with the words the server just fetched, rather than reusing
              the previous letter's rows. Typing does not change the key — that
              is what keeps the keyboard from closing mid-word. */}
          <GlossaryBrowser key={letter ?? "all"} initial={initial} q={q} letter={letter} />
        </WordTrailProvider>
      </GlossaryProvider>
    </PageContainer>
  );
}
