"use client";

import Link from "next/link";
import { PersonalHeader, usePersonalRows } from "@/components/me/PersonalTabs";
import { savedDate } from "@/components/me/SavedCard";
import { CloseIcon } from "@/components/shell/icons";
import { EmptyState, PageContainer } from "@/components/ui";
import { setSavedToJourney, type Conversation } from "@/lib/assistant/conversations";
import { contentLang } from "@/lib/script";

/**
 * **Research — the third tab of My Journey's Highlights & Notes.**
 *
 * The Assistant's Research answers carry a "Save to Journey" button, and until
 * this tab nothing in My Journey showed what it saved. Each card is one saved
 * conversation: what was asked, the first line of what came back, and how
 * much of the literature it drew on. Tapping it reopens the conversation in
 * the Assistant with its answers as they arrived — stored with the thread, so
 * looking again never spends a question from the day's allowance.
 *
 * Removing a card only takes it out of My Journey. The conversation stays in
 * the Assistant's history, which is why the control is a plain "remove" and
 * not the bin the highlight and note cards wear.
 */
export default function ResearchPage() {
  const { rows, reload, titles } = usePersonalRows();
  const saved = rows?.research ?? null;

  const remove = (id: string) => {
    setSavedToJourney(id, false);
    reload();
  };

  return (
    <PageContainer>
      <PersonalHeader active="research" rows={rows} titles={titles} book={null} onBook={() => {}} />

      <div className="mt-5">
        {saved === null ? null : saved.length === 0 ? (
          <EmptyState
            title="No saved research yet"
            hint="Ask a question in the Assistant’s Research and choose Save to Journey — it will be kept here."
          />
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {saved.map((c) => (
                <li key={c.id}>
                  <ResearchCard conversation={c} onRemove={() => remove(c.id)} />
                </li>
              ))}
            </ul>
            {/* Said once, under the list: these are not in the account the way
                highlights and notes are, signed in or not. */}
            <p className="mt-4 text-xs text-ink-soft">
              Saved research is kept on this device — it does not sync to your account yet.
            </p>
          </>
        )}
      </div>
    </PageContainer>
  );
}

function ResearchCard({
  conversation: c,
  onRemove,
}: {
  conversation: Conversation;
  onRemove: () => void;
}) {
  const research = c.turns.filter((t) => t.intent === "research");
  // The latest answer that settled — the one the reader last saw.
  const last = [...research].reverse().find((t) => t.summary || t.answer);
  const summary = last?.summary ?? "";
  const passages = last?.count ?? last?.answer?.citations.length ?? 0;
  const questions = c.turns.length;
  const facts = [
    last?.deep ? "Deep research" : "Research",
    questions > 1 ? `${questions} questions` : null,
    passages > 0 ? `${passages} ${passages === 1 ? "passage" : "passages"}` : null,
  ].filter(Boolean);

  const title = contentLang(c.title);
  const line = contentLang(summary);

  return (
    <article className="relative rounded-card border border-rule bg-card p-4 shadow-card transition-shadow hover:shadow-md">
      <h2
        lang={title.lang}
        className={`${title.className} hi-tight text-title font-semibold`}
      >
        {/* The whole card reopens the conversation; the remove keeps its own tap. */}
        <Link href={`/assistant?c=${encodeURIComponent(c.id)}`} className="after:absolute after:inset-0">
          {c.title}
        </Link>
      </h2>
      {summary && (
        <p
          lang={line.lang}
          className={`${line.className} mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft`}
        >
          {summary}
        </p>
      )}

      <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-rule pt-3">
        <p className="min-w-0 truncate text-xs text-ink-soft">
          <span className="font-semibold" style={{ color: "var(--ws-ink)" }}>
            {facts[0]}
          </span>
          {facts.slice(1).map((f) => ` · ${f}`)}
          {savedDate(c.updatedAt) && ` · ${savedDate(c.updatedAt)}`}
        </p>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove “${c.title}” from My Journey`}
          title="Remove from My Journey"
          className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-ink/[.04] hover:text-ink"
        >
          <CloseIcon className="h-4.5 w-4.5" />
        </button>
      </div>
    </article>
  );
}
