import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NodeCardView } from "@/components/library/NodeCard";
import { EmptyState, PageContainer } from "@/components/ui";
import { getTopics, openTopic } from "@/lib/api";
import { shelfMap } from "@/lib/library";
import { contentLang } from "@/lib/script";
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
    title: row ? `${row.name} · Library` : "Library",
    description: row?.description || undefined,
  };
}

async function findTopic(code: string): Promise<Topic | null> {
  const topics = await getTopics().catch(() => [] as Topic[]);
  return topics.find((t) => t.code === code) ?? null;
}

/**
 * A topic, across the whole library.
 *
 * Topic is a **door**, not a sieve (contract §13.4): tapping one leaves the
 * folder you were in, because what you are asking for is everything filed
 * under a topic wherever it lives — not that topic inside this one shivir.
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
  // The only thing this page is for. Without a topic there is no "whole
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
      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Topic</p>
      <h1
        {...contentLang(row.name)}
        className={`${contentLang(row.name).className} mt-0.5 text-[1.375rem] font-semibold leading-tight lg:text-3xl`}
      >
        {row.name}
      </h1>
      {row.description && (
        <p
          {...contentLang(row.description)}
          className={`${contentLang(row.description).className} mt-1 text-sm text-ink-soft`}
        >
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
            title="Nothing under this topic yet"
            hint="Folders appear here as material is published and filed under this topic."
          />
        </div>
      )}
    </PageContainer>
  );
}
