import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  if (!word) return { title: "परिभाषा" };
  return {
    title: `${word.hindi} · परिभाषा`,
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
        <span lang="hi" className="hi">← परिभाषा</span>
      </Link>

      <h1 lang="hi" className="hi mt-3 text-2xl font-bold leading-snug">
        {word.hindi}
      </h1>
      {word.hinglish && <p className="mt-0.5 text-sm text-ink-soft">{word.hinglish}</p>}

      {/* One explanation in the order a manager arranged it (§14.1), never a
          numbered list of competing senses. */}
      <div className="mt-5 rounded-2xl border border-rule bg-white p-4">
        {word.definitions.map((d, i) => (
          <p
            key={i}
            lang="hi"
            className={`hi text-[15px] leading-relaxed ${i === 0 ? "" : "mt-3 text-ink-soft"}`}
          >
            {d}
          </p>
        ))}
        {word.definitions.length === 0 && (
          <p lang="hi" className="hi text-sm text-ink-soft">
            इस शब्द की परिभाषा अभी दर्ज नहीं है।
          </p>
        )}
      </div>

      <Link
        href={`/search?q=${encodeURIComponent(word.hindi)}`}
        className="mt-4 block rounded-xl px-4 py-2.5 text-center text-sm font-medium text-white"
        style={{ background: "var(--ws-color)" }}
      >
        <span lang="hi" className="hi">ग्रंथों में यह शब्द खोजें</span>
      </Link>
    </PageContainer>
  );
}
