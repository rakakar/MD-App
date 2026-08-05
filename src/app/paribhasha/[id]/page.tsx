import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WordEntry } from "@/components/paribhasha/WordEntry";
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

  return (
    <PageContainer>
      <Link href="/paribhasha" className="text-xs text-ink-soft underline underline-offset-2">
        ← Paribhasha
      </Link>

      <h1 lang="hi" className="hi mt-3 text-2xl font-bold leading-snug">
        {word.hindi}
      </h1>
      {word.hinglish && <p className="mt-0.5 text-sm text-ink-soft">{word.hinglish}</p>}

      {/* One explanation in the order a manager arranged it (§14.1), never a
          numbered list of competing senses — bulleted only so a second
          definition is visibly a second one. */}
      <div className="mt-5 rounded-2xl border border-rule bg-card p-4">
        <WordEntry word={word} />
      </div>

      <Link
        href={`/search?q=${encodeURIComponent(word.hindi)}`}
        className="mt-4 block rounded-xl px-4 py-2.5 text-center text-sm font-medium text-white"
        style={{ background: "var(--ws-color)" }}
      >
        Find this word in the books
      </Link>
    </PageContainer>
  );
}
