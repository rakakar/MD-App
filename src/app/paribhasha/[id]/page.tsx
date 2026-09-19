import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EntryBack, GlossaryBack } from "@/components/paribhasha/EntryBack";
import { EntryExtras, EntryShare } from "@/components/paribhasha/EntryExtras";
import { WordEntry } from "@/components/paribhasha/WordEntry";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import { PageContainer } from "@/components/ui";
import { getParibhashaWord } from "@/lib/api";

export const revalidate = 900;

interface Params {
  id: string;
}

async function load(params: Promise<Params>) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) return null;
  return getParibhashaWord(numeric).catch(() => null);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const word = await load(params);
  if (!word) return { title: "Paribhasha" };
  return {
    title: `${word.hindi} · Paribhasha`,
    // The definition itself is the description — it is what someone searching
    // this word wants to see in a result, and it is already plain text.
    description: word.definitions[0]?.slice(0, 300),
  };
}

/**
 * One word (contract §14.2). The glossary list opens its rows in place, so
 * this route exists for the other job: a definition someone can send to
 * another person, and a page a search engine can index.
 *
 * A hidden word 404s on the BE and 404s here — hiding a word is how a manager
 * takes it out of the app, and a stale copy would defeat that.
 */
export default async function ParibhashaWordPage({ params }: { params: Promise<Params> }) {
  const word = await load(params);
  if (!word) notFound();

  // Design 3 · Paribhasha — full entry. The headword and its definitions are
  // server-rendered, so they are in the HTML for a search engine and for a
  // reader with no JavaScript; related words, occurrences and the reading bar
  // need the device and arrive after (`EntryExtras`).
  return (
    <AppAccent>
      <PageContainer>
        <div className="flex items-center gap-3">
          {/* Reads the URL, so it waits in a Suspense boundary; the page
              itself stays statically rendered with the glossary as its back. */}
          <Suspense fallback={<GlossaryBack />}>
            <EntryBack />
          </Suspense>
          <p className="min-w-0 flex-1 text-title font-semibold text-ink-soft">Paribhasha entry</p>
          <EntryShare title={word.hindi} />
        </div>

        <h1 lang="hi" className="hi mt-6 text-5xl font-semibold leading-tight">
          {word.hindi}
        </h1>
        <p className="mt-1 text-base text-ink-soft">
          {[word.hinglish, "Paribhasha"].filter(Boolean).join(" · ")}
        </p>

        <p
          className="mt-6 text-xs font-bold uppercase tracking-[0.09em]"
          style={{ color: "var(--ws-ink)" }}
        >
          Paribhasha
        </p>
        {/* One explanation in the order a manager arranged it (§14.1), never a
            numbered list of competing senses — bulleted only so a second
            definition is visibly a second one. */}
        <div className="mt-2 border-b border-rule pb-6">
          <WordEntry word={word} size="lg" />
        </div>

        <Suspense>
          <EntryExtras word={word} />
        </Suspense>
      </PageContainer>
    </AppAccent>
  );
}
