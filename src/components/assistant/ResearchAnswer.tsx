"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ChevronRight, InfoIcon, ShareIcon } from "@/components/shell/icons";
import { ctaPrimary } from "@/components/ui";
import { answerAsText, parseAnswer, type Run } from "@/lib/assistant/answer";
import { glossaryWordsIn } from "@/lib/assistant/related";
import { askChat, isAnswerServiceDown, isQuotaExhausted } from "@/lib/chat";
import { parseRef } from "@/lib/refs";
import type { ChatAnswer, ChatCitation, ChatQuota, ParibhashaWord } from "@/lib/types";
import { WORKSPACES } from "@/lib/workspaceConfig";
import { CitationSheet } from "./CitationSheet";
import { CopyIcon, NoteIcon } from "./icons";
import { Eyebrow, SuggestionChip, Thinking } from "./parts";
import type { Ask } from "./types";

/**
 * One question per turn, ever.
 *
 * Every ask spends one of the reader's thirty a day, and React runs effects
 * twice in development and again on any remount — so the request is held
 * here, outside the component, keyed by the turn. A remount picks up the same
 * promise instead of asking again.
 */
const inflight = new Map<string, Promise<{ answer: ChatAnswer; quota: ChatQuota }>>();

type Failure = { kind: "signin" } | { kind: "quota"; detail: string } | { kind: "down" } | { kind: "error" };

/**
 * 5 & 7 · Research — an answer written from cited passages.
 *
 * **Not streamed.** The comp draws the answer arriving word by word; the chat
 * API returns it whole (`POST chat/`, contract addition of 29 Jul), so this
 * shows the working state until it lands and then the whole answer at once.
 * Typing it out after the fact would only be theatre, and would make a stop
 * button that stops nothing. When the BE streams, the working state is where
 * the text goes.
 */
export function ResearchAnswer({
  turnId,
  query,
  stored,
  continueFrom,
  dictionary,
  saved,
  onToggleSaved,
  onAsk,
  onSettle,
  onQuota,
}: {
  turnId: string;
  query: string;
  /** the answer from an earlier visit — shown as-is, never re-asked */
  stored?: ChatAnswer;
  /** the previous Research answer in this conversation, for a follow-up */
  continueFrom?: number;
  dictionary: ParibhashaWord[] | null;
  saved: boolean;
  onToggleSaved: () => void;
  onAsk: Ask;
  onSettle: (answer: ChatAnswer) => void;
  onQuota: (quota: ChatQuota) => void;
}) {
  const { user, loading } = useAuth();
  const [answer, setAnswer] = useState<ChatAnswer | null>(stored ?? null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (answer || loading) return;
    if (!user) {
      setFailure({ kind: "signin" });
      return;
    }
    setFailure(null);
    let alive = true;
    const key = `${turnId}:${attempt}`;
    let job = inflight.get(key);
    if (!job) {
      job = askChat(query, { continueFrom });
      inflight.set(key, job);
    }
    job
      .then(({ answer: a, quota }) => {
        if (!alive) return;
        setAnswer(a);
        onQuota(quota);
        onSettle(a);
      })
      .catch((e: unknown) => {
        inflight.delete(key);
        if (!alive) return;
        const status = (e as { status?: number }).status;
        if (status === 401 || status === 403) setFailure({ kind: "signin" });
        else if (isQuotaExhausted(e)) {
          const detail = (e as { data?: { detail?: string } }).data?.detail;
          setFailure({ kind: "quota", detail: detail ?? "You have asked all of today’s questions." });
        } else if (isAnswerServiceDown(e)) setFailure({ kind: "down" });
        else setFailure({ kind: "error" });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer, user, loading, attempt]);

  const blocks = useMemo(
    () => (answer ? parseAnswer(answer.answer, answer.citations) : []),
    [answer]
  );

  /** Glossary words the answer leans on — the natural next questions. */
  const next = useMemo(() => {
    if (!answer || !dictionary || answer.status !== "ok") return [];
    return glossaryWordsIn(dictionary, [answer.answer], [], 2);
  }, [answer, dictionary]);

  if (failure) return <FailureCard failure={failure} onRetry={() => setAttempt((n) => n + 1)} onAsk={onAsk} query={query} />;

  if (!answer) {
    return <Thinking>Reading the passages that answer this</Thinking>;
  }

  const cites = answer.citations;
  const books = new Set(cites.map((c) => c.book).filter(Boolean)).size;
  const text = answerAsText(query, answer.answer, cites);

  return (
    <div className="flex flex-col gap-5">
      {answer.rewritten_query && (
        <p className="text-sm text-ink-soft">
          Answered as: <span className="text-ink">{answer.rewritten_query}</span>
        </p>
      )}

      {cites.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background: "color-mix(in srgb, var(--color-accent) 14%, var(--color-card))",
              color: "var(--color-accent-deep)",
            }}
          >
            ✦
          </span>
          Read {cites.length} {cites.length === 1 ? "passage" : "passages"}
          {books > 1 && ` from ${books} books`}
        </p>
      )}

      <div className="flex flex-col gap-4 text-lg leading-relaxed">
        {blocks.map((b, i) =>
          b.kind === "item" ? (
            <p key={i} className="flex gap-2">
              <span aria-hidden className="text-ink-soft">
                •
              </span>
              <span>
                <Runs runs={b.runs} cites={cites} onOpen={setOpen} />
              </span>
            </p>
          ) : (
            <p key={i}>
              <Runs runs={b.runs} cites={cites} onOpen={setOpen} />
            </p>
          )
        )}
      </div>

      {/* The answer's own standing, said plainly — it is assembled, not taught. */}
      <div className="flex gap-3 rounded-card border border-rule bg-inset p-4 text-sm leading-relaxed text-ink-soft">
        <InfoIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          {answer.status === "not_found"
            ? "The books don’t answer this directly, so nothing has been assembled. Try Book search for the words themselves."
            : "Assembled from cited passages only. Where the books differ, both readings are shown — this is not a prabodhak’s interpretation."}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          aria-pressed={saved}
          onClick={onToggleSaved}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control border border-rule bg-card px-4 text-title font-semibold"
        >
          <span style={{ color: WORKSPACES.translations.color }}>
            <NoteIcon className="h-5 w-5" />
          </span>
          {saved ? "Saved to Journey" : "Save to Journey"}
        </button>
        <button
          type="button"
          aria-label={copied ? "Copied" : "Copy answer"}
          onClick={() => {
            void navigator.clipboard?.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            });
          }}
          className="flex h-12 w-14 items-center justify-center rounded-control border border-rule bg-card"
        >
          {copied ? <span className="text-xs font-semibold">Copied</span> : <CopyIcon className="h-5 w-5" />}
        </button>
        <button
          type="button"
          aria-label="Share answer"
          onClick={() => {
            if (navigator.share) void navigator.share({ title: query, text }).catch(() => {});
            else void navigator.clipboard?.writeText(text);
          }}
          className="flex h-12 w-14 items-center justify-center rounded-control border border-rule bg-card"
        >
          <ShareIcon className="h-5 w-5" />
        </button>
      </div>

      {cites.length > 0 && (
        <section className="flex flex-col gap-3">
          <Eyebrow>{cites.length === 1 ? "Source" : `All ${cites.length} sources`}</Eyebrow>
          <ul className="flex flex-col gap-2">
            {cites.map((c, i) => (
              <li key={c.canonical_ref}>
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-card border border-rule bg-card px-4 text-left"
                >
                  <CiteBadge n={i + 1} />
                  <span className="min-w-0 flex-1 truncate">
                    <span lang="hi" className="hi-note font-medium">
                      {c.book ?? parseRef(c.canonical_ref)?.code}
                    </span>
                    {parseRef(c.canonical_ref) && (
                      <span className="text-ink-soft"> · p. {parseRef(c.canonical_ref)!.page}</span>
                    )}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {next.length > 0 && (
        <section className="flex flex-col gap-3">
          <Eyebrow>Ask next</Eyebrow>
          <div className="flex flex-wrap gap-2">
            <SuggestionChip tone="tint" onClick={() => onAsk(next[0].hindi, "books")}>
              Where does&nbsp;
              <span lang="hi" className="hi font-semibold">
                {next[0].hindi}
              </span>
              &nbsp;appear?
            </SuggestionChip>
            {next[1] && (
              <SuggestionChip tone="tint" onClick={() => onAsk(next[1].hindi, "paribhasha")}>
                Paribhasha:&nbsp;
                <span lang="hi" className="hi font-semibold">
                  {next[1].hindi}
                </span>
              </SuggestionChip>
            )}
          </div>
        </section>
      )}

      <CitationSheet
        citation={open !== null ? (cites[open] ?? null) : null}
        number={(open ?? 0) + 1}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}

function CiteBadge({ n, onClick }: { n: number; onClick?: () => void }) {
  const cls =
    "inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 text-xs font-bold align-[0.1em]";
  const style = {
    borderColor: "color-mix(in srgb, var(--color-accent) 35%, transparent)",
    background: "color-mix(in srgb, var(--color-accent) 12%, var(--color-card))",
    color: "var(--color-accent-deep)",
  };
  if (!onClick)
    return (
      <span className={cls} style={style} aria-hidden>
        {n}
      </span>
    );
  return (
    // 24px drawn, but the hit area is padded out to the 44px floor with a
    // pseudo-element-free trick: negative margin + padding on the button.
    <button
      type="button"
      onClick={onClick}
      aria-label={`Source ${n}`}
      className="-my-2.5 mx-0.5 inline-flex p-2.5 align-middle"
    >
      <span className={cls} style={style}>
        {n}
      </span>
    </button>
  );
}

function Runs({
  runs,
  cites,
  onOpen,
}: {
  runs: Run[];
  cites: ChatCitation[];
  onOpen: (i: number) => void;
}) {
  return (
    <>
      {runs.map((r, i) =>
        r.kind === "cite" ? (
          cites[r.index] ? (
            <CiteBadge key={i} n={r.index + 1} onClick={() => onOpen(r.index)} />
          ) : null
        ) : r.bold ? (
          <strong key={i} className={/[ऀ-ॿ]/.test(r.text) ? "hi-note font-bold" : "font-semibold"}>
            {r.text}
          </strong>
        ) : (
          <span key={i}>{r.text}</span>
        )
      )}
    </>
  );
}

function FailureCard({
  failure,
  onRetry,
  onAsk,
  query,
}: {
  failure: Failure;
  onRetry: () => void;
  onAsk: Ask;
  query: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const here = `${pathname}${params.size ? `?${params}` : ""}`;

  const body =
    failure.kind === "signin" ? (
      <>
        <p className="font-semibold">Research needs you to be signed in</p>
        <p className="mt-1 text-sm text-ink-soft">
          Each answer is written from the books for you, and there is a daily limit per
          reader. Paribhasha, Book search and Navigate work without signing in.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/login?next=${encodeURIComponent(here)}`}
            className={ctaPrimary}
            style={{ background: "var(--color-accent-deep)" }}
          >
            Sign in
          </Link>
          <SuggestionChip onClick={() => onAsk(query, "books")}>Search the books instead</SuggestionChip>
        </div>
      </>
    ) : failure.kind === "quota" ? (
      <>
        <p className="font-semibold">Today’s questions are used up</p>
        <p className="mt-1 text-sm text-ink-soft">{failure.detail}</p>
        <div className="mt-4">
          <SuggestionChip onClick={() => onAsk(query, "books")}>Search the books instead</SuggestionChip>
        </div>
      </>
    ) : (
      <>
        <p className="font-semibold">
          {failure.kind === "down" ? "The answer service is down right now" : "Something went wrong"}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {failure.kind === "down"
            ? "Your question was not counted. Try again in a little while."
            : "The question may not have been answered. Try again."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRetry}
            className={ctaPrimary}
            style={{ background: "var(--color-accent-deep)" }}
          >
            Try again
          </button>
          <SuggestionChip onClick={() => onAsk(query, "books")}>Search the books instead</SuggestionChip>
        </div>
      </>
    );

  return <div className="rounded-card border border-rule bg-card p-5">{body}</div>;
}
