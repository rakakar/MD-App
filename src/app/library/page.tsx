import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NodeCardView } from "@/components/library/NodeCard";
import { EmptyState, PageContainer } from "@/components/ui";
import { getTopics, openTopic } from "@/lib/api";
import { shelfMap } from "@/lib/library";
import type { LocatedNodeCard, Topic } from "@/lib/types";

export const revalidate = 900;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}): Promise<Metadata> {
  const { topic } = await searchParams;
  const row = topic ? await findTopic(topic) : null;
  return {
    title: row ? `${row.name} · संसाधन` : "संसाधन",
    description: row?.description || undefined,
  };
}

async function findTopic(code: string): Promise<Topic | null> {
  const topics = await getTopics().catch(() => [] as Topic[]);
  return topics.find((t) => t.code === code) ?? null;
}

/**
 * A विषय, across the whole library.
 *
 * विषय is a **door**, not a sieve (contract §13.4): tapping one leaves the
 * folder you were in, because what you are asking for is everything filed
 * under व्यवस्था wherever it lives — not the व्यवस्था inside this one shivir.
 * That is why it navigates here rather than narrowing in place.
 *
 * Which is also why every row prints its path: these arrive from every depth
 * and every workspace, so the reader who left a folder to get here has no
 * context left but what the card carries.
 */
export default async function LibraryTopicPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic } = await searchParams;
  // The only thing this page is for. Without a विषय there is no "whole
  // library" list worth showing — that is what the shelves are.
  if (!topic) notFound();

  const [row, nodes, shelves] = await Promise.all([
    findTopic(topic),
    openTopic({ topic }).catch(() => [] as LocatedNodeCard[]),
    shelfMap(),
  ]);
  if (!row) notFound();

  return (
    <PageContainer size="shelf">
      <p lang="hi" className="hi text-[11.5px] font-bold uppercase tracking-wide text-ink-soft">
        विषय
      </p>
      <h1 lang="hi" className="hi mt-0.5 text-[22px] font-semibold leading-tight lg:text-3xl">
        {row.name}
      </h1>
      {row.description && (
        <p lang="hi" className="hi mt-1 text-sm text-ink-soft">
          {row.description}
        </p>
      )}

      {nodes.length > 0 ? (
        <ul className="mt-5 flex flex-col gap-3">
          {nodes.map((card) => (
            <li key={card.id}>
              <NodeCardView card={card} shelves={shelves} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="इस विषय पर अभी कुछ नहीं"
            hint="Folders appear here as material is published and filed under this विषय."
          />
        </div>
      )}
    </PageContainer>
  );
}
