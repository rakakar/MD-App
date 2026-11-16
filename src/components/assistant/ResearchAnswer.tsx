"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRoutePath } from "@/components/shell/useRoutePath";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { ChevronRight, HeadphonesIcon, InfoIcon, PauseIcon, ShareIcon } from "@/components/shell/icons";
import { ctaPrimary, ctaSecondary } from "@/components/ui";
import { answerAsText, firstSentence, parseAnswer, type Run } from "@/lib/assistant/answer";
import { settleStoredTurn } from "@/lib/assistant/conversations";
import { glossaryWordsIn } from "@/lib/assistant/related";
import {
  askChat,
  isAnswerServiceDown,
  isDeepQuotaExhausted,
  isQuotaExhausted,
  rateChatAnswer,
  resumeChat,
  shareChatAnswer,
} from "@/lib/chat";
import { parseRef } from "@/lib/refs";
import type { BookSummary, ChatAnswer, ChatCitation, ChatQuota, ParibhashaWord } from "@/lib/types";
import { contentLang, scriptOf } from "@/lib/script";
import { WORKSPACES } from "@/lib/workspaceConfig";
import { CitationSheet } from "./CitationSheet";
import { DeepResearchProgress, clock } from "./DeepResearchProgress";
import { useSourcePanel } from "./SourcePanel";
import { CopyIcon, NoteIcon } from "./icons";
import { Eyebrow, SuggestionChip, Thinking } from "./parts";
import type { Ask } from "./types";
import { useAnswerSpeech } from "./useAnswerSpeech";

/**
 * One question per turn, ever.
 *
 * Every ask spends one of the reader's thirty a day, and React runs effects
 * twice in development and again on any remount — so the request is held
 * here, outside the component, keyed by the turn. A remount picks up the same
 * promise instead of asking again.
 */
const inflight = new Map<
  string,
  { job: Promise<{ answer: ChatAnswer; quota: ChatQuota }>; startedAt: number }
>();

type Failure =
  | { kind: "signin" }
  | { kind: "quota"; detail: string }
  | { kind: "deep_quota"; detail: string }
  | { kind: "down" }
  | { kind: "error" }
  /** a deep answer the server failed to write — not counted, see the card */
  | { kind: "deep_error" };

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
  books,
  deep = false,
  shelf,
  quota,
  onDeepen,
  askedAt,
  shareUrl,
  readOnly = false,
  dictionary,
  saved,
  onToggleSaved,
  onAsk,
  onSettle,
  onQuota,
  onCancel,
  took,
}: {
  turnId: string;
  query: string;
  /** the answer from an earlier visit — shown as-is, never re-asked */
  stored?: ChatAnswer;
  /** the previous Research answer in this conversation, for a follow-up */
  continueFrom?: number;
  /** answer only from these book codes; absent means every book */
  books?: string[];
  /** Deep research: planned, every part searched, definitions, the large model */
  deep?: boolean;
  /** the shelf, to name the chosen books */
  shelf?: BookSummary[] | null;
  /** the reader's allowance as last reported, for the "Deep research" count */
  quota?: ChatQuota | null;
  /** ask this same question again, deeper — absent once it has been */
  onDeepen?: () => void;
  /** the public link (a path is fine), when this answer is shown from one */
  shareUrl?: string;
  /** a shared answer: nothing to save to this reader's Journey */
  readOnly?: boolean;
  dictionary: ParibhashaWord[] | null;
  saved: boolean;
  onToggleSaved: () => void;
  onAsk: Ask;
  /** `took` — how long it was waited for, in ms; only when it was asked now */
  onSettle: (answer: ChatAnswer, took?: number) => void;
  onQuota: (quota: ChatQuota) => void;
  /** Deep research: stop waiting and take the turn away */
  onCancel?: () => void;
  /** how long a deep answer took, as recorded when it arrived */
  took?: number;
  /** when the turn was asked (ISO) — an older one may already be answered */
  askedAt?: string;
}) {
  const { user, loading } = useAuth();
  const [answer, setAnswer] = useState<ChatAnswer | null>(stored ?? null);
  const [failure, setFailure] = useState<Failure | null>(null);
  /** the folded "how it was searched" lines — see the answer's header */
  const [howOpen, setHowOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpenSheet] = useState<number | null>(null);
  /** on desktop a source opens in the Assistant's side panel, not a sheet */
  const panel = useSourcePanel();
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState<"idle" | "working" | "copied">("idle");

  useEffect(() => {
    if (answer || loading) return;
    if (!user) {
      setFailure({ kind: "signin" });
      return;
    }
    setFailure(null);
    let alive = true;
    const key = `${turnId}:${attempt}`;
    let entry = inflight.get(key);
    if (!entry) {
      const startedAt = Date.now();
      const opts = { continueFrom, books, mode: deep ? ("deep" as const) : ("quick" as const) };
      // Not in flight here, but asked a while ago: the page was reloaded under
      // it. The server may have the answer already — see `resumeChat`.
      const asked = askedAt ? Date.parse(askedAt) : NaN;
      const earlier = attempt === 0 && Number.isFinite(asked) && startedAt - asked > 5_000;
      entry = {
        job: earlier ? resumeChat(query, opts, asked) : askChat(query, opts),
        startedAt: earlier ? asked : startedAt,
      };
      inflight.set(key, entry);
      // Kept even if the reader has gone to another conversation by the time
      // it lands — this component is gone then, and `onSettle` with it.
      entry.job
        .then(({ answer: a }) =>
          settleStoredTurn(turnId, {
            answer: a,
            summary: firstSentence(a.answer),
            count: a.citations.length,
            ...(deep ? { took: Date.now() - startedAt } : {}),
          })
        )
        .catch(() => {});
    }
    const { startedAt: began } = entry;
    entry.job
      .then(({ answer: a, quota }) => {
        if (!alive) return;
        setAnswer(a);
        onQuota(quota);
        onSettle(a, Date.now() - began);
      })
      .catch((e: unknown) => {
        inflight.delete(key);
        if (!alive) return;
        const status = (e as { status?: number }).status;
        if (status === 401 || status === 403) setFailure({ kind: "signin" });
        else if (isDeepQuotaExhausted(e)) {
          const detail = (e as { data?: { detail?: string } }).data?.detail;
          setFailure({ kind: "deep_quota", detail: detail ?? "Today’s deep research is used up." });
        } else if (isQuotaExhausted(e)) {
          const detail = (e as { data?: { detail?: string } }).data?.detail;
          setFailure({ kind: "quota", detail: detail ?? "You have asked all of today’s questions." });
        } else if (isAnswerServiceDown(e)) setFailure({ kind: "down" });
        // A deep answer the server could not finish (16 Nov 2026: every deep
        // question was coming back as a bare 500 after 50–60 s). Said as
        // what it is — the server failed, nothing was counted, the Research
        // answer it deepens is still there — rather than "may not have been
        // answered", which sent readers to Try again into the same failure.
        else if (deep && typeof status === "number" && status >= 500) setFailure({ kind: "deep_error" });
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

  const speech = useAnswerSpeech(blocks);
  /** the block the device voice is reading, marked as the reader marks a paragraph */
  const lit = (i: number) => (speech.speaking === i ? SPOKEN : undefined);

  if (failure) return <FailureCard failure={failure} onRetry={() => setAttempt((n) => n + 1)} onAsk={onAsk} query={query} />;

  if (!answer && deep) {
    return (
      <DeepResearchProgress
        // From the in-flight entry, so a remount keeps the clock running.
        startedAt={inflight.get(`${turnId}:${attempt}`)?.startedAt ?? null}
        onCancel={
          onCancel &&
          (() => {
            // The request cannot be called back; its answer is let go instead.
            inflight.delete(`${turnId}:${attempt}`);
            onCancel();
          })
        }
      />
    );
  }

  if (!answer) {
    return (
      <Thinking>
        {deep
          ? "Deep research takes about a minute — looking up the definitions, searching each part of your question, then writing"
          : "Reading the passages that answer this"}
      </Thinking>
    );
  }

  const cites = answer.citations;
  const setOpen = (i: number | null) => {
    if (i !== null && panel) panel({ cites, index: i });
    else setOpenSheet(i);
  };
  const passages = cites.filter((c) => c.kind !== "definition");
  const definitions = cites.length - passages.length;
  const citedBooks = new Set(passages.map((c) => c.book).filter(Boolean)).size;
  // How the question was read: the first planned query is the whole question
  // in Hindi, worth showing only when the reader did not write it that way.
  const readAs = answer.plan?.queries[0] && /[A-Za-z]/.test(query) ? answer.plan.queries[0] : null;
  const parts = answer.plan?.queries.slice(1) ?? [];
  const text = answerAsText(query, answer.answer, cites);

  /**
   * Share as a link (contract §9.3): anyone can open it, no account needed,
   * and it shows the answer as it is here — tables, sources you can open.
   * The link is made on the first share and is the same ever after. If it
   * cannot be made (offline, an answer from before sharing existed), the
   * answer goes out as text instead, as it always used to.
   */
  const share = async () => {
    let url = shareUrl?.startsWith("/") ? `${window.location.origin}${shareUrl}` : shareUrl;
    if (!url) {
      setShared("working");
      try {
        const { code } = await shareChatAnswer(answer.id);
        url = `${window.location.origin}/a/${code}`;
      } catch {
        url = undefined;
      }
    }
    if (navigator.share) {
      await navigator.share(url ? { title: query, url } : { title: query, text }).catch(() => {});
      setShared("idle");
    } else {
      await navigator.clipboard?.writeText(url ?? text).catch(() => {});
      setShared("copied");
      setTimeout(() => setShared("idle"), 1800);
    }
  };
  const scopeNames = (answer.books ?? books ?? []).map(
    (code) => shelf?.find((b) => b.code === code)?.title_hi ?? code
  );
  const deepLeft = quota?.capped ? (quota.deep_remaining ?? null) : null;
  const isDeep = answer.mode === "deep" || deep;
  const hasHow = !!readAs || parts.length > 0 || !!answer.rewritten_query;
  const followUps =
    !readOnly && answer.status === "ok" && !answer.off_topic
      ? contentLang(answer.answer).lang === "hi"
        ? { simpler: "इसे और सरल शब्दों में समझाइए", example: "इसका एक उदाहरण दीजिए" }
        : { simpler: "Explain this more simply", example: "Give an example of this" }
      : null;

  return (
    <div className="flex flex-col gap-5">
      {/* How it was made, folded into one line (16 Nov 2026, UX audit AS5).
          A deep answer opened with up to six lines — Deep research, the
          time, Read as, Searched in, Answered as, Read N passages — so on a
          phone the answer itself began below the fold. Now one line says
          what was read and how long it took, and the process is a tap away. */}
      {scopeNames.length > 0 && (
        <p className="text-sm text-ink-soft">
          Answered only from{" "}
          <span lang="hi" className="hi-note font-semibold text-ink">
            {scopeNames.join(", ")}
          </span>
        </p>
      )}


      {(cites.length > 0 || isDeep) && (
        <div className="flex flex-col gap-1.5">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: "color-mix(in srgb, var(--ws-color) 14%, var(--color-card))",
                color: "var(--ws-ink)",
              }}
            >
              ✦
            </span>
            <span>
              {isDeep && <span className="font-semibold" style={{ color: "var(--ws-ink)" }}>Deep research · </span>}
              {passages.length > 0 &&
                `${passages.length} ${passages.length === 1 ? "passage" : "passages"}${
                  citedBooks > 1 ? ` from ${citedBooks} books` : ""
                }`}
              {passages.length > 0 && definitions > 0 && " · "}
              {definitions > 0 && `${definitions} ${definitions === 1 ? "definition" : "definitions"}`}
              {isDeep && took != null && (
                <>
                  {" · "}
                  <span className="tabular-nums">{clock(took / 1000)}</span>
                </>
              )}
            </span>
            {hasHow && (
              <button
                type="button"
                aria-expanded={howOpen}
                onClick={() => setHowOpen((o) => !o)}
                className="inline-flex min-h-11 items-center gap-1 font-semibold"
                style={{ color: "var(--ws-ink)" }}
              >
                How it was searched
                <span aria-hidden className={`transition-transform ${howOpen ? "rotate-180" : ""}`}>⌄</span>
              </button>
            )}
            {/* Listen (16 Nov 2026, UX audit IN10): the device voice, as the
                reader uses for chapters with no recording — Hindi blocks in
                the Hindi voice. Up here rather than in the action row the
                audit named: that row is already full on a 360px phone, and
                a reader who wants the answer read out wants it before
                reading, not after scrolling past it. */}
            {answer.status === "ok" && speech.available && (
              <button
                type="button"
                aria-pressed={speech.playing}
                onClick={speech.toggle}
                className="ms-auto inline-flex min-h-11 items-center gap-1.5 font-semibold"
                style={{ color: "var(--ws-ink)" }}
              >
                {speech.playing ? <PauseIcon className="h-4 w-4" /> : <HeadphonesIcon className="h-4 w-4" />}
                {speech.playing ? "Stop" : "Listen"}
              </button>
            )}
          </p>
          {howOpen && (
            <div className="flex flex-col gap-1.5 border-s-2 border-rule ps-3">
              {readAs && (
                <p className="text-sm text-ink-soft">
                  Read as{" "}
                  <span lang="hi" className="hi-note text-ink">
                    {readAs}
                  </span>
                </p>
              )}
              {parts.length > 0 && (
                <p className="text-sm text-ink-soft">
                  Searched in {parts.length} parts:{" "}
                  <span lang="hi" className="hi-note text-ink">
                    {parts.join(" · ")}
                  </span>
                </p>
              )}
              {answer.rewritten_query && (
                <p className="text-sm text-ink-soft">
                  Answered as: <span className="text-ink">{answer.rewritten_query}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Each block says its own language (15 Nov 2026). Without it a Hindi
          answer inherited the page's lang="en": read aloud in an English
          voice, and set in whatever the sans stack fell back to. */}
      <div className="flex flex-col gap-4 text-lg leading-relaxed">
        {blocks.map((b, i) =>
          b.kind === "item" ? (
            <p key={i} {...blockLang(b.runs, `flex gap-2 ${b.depth ? "pl-6" : ""}`)} style={lit(i)}>
              <span aria-hidden className="text-ink-soft">
                {b.depth ? "◦" : "•"}
              </span>
              <span>
                <Runs runs={b.runs} cites={cites} onOpen={setOpen} />
              </span>
            </p>
          ) : b.kind === "heading" ? (
            <h3 key={i} {...blockLang(b.runs, "mt-2 text-title font-semibold leading-snug", "hi-note")} style={lit(i)}>
              <Runs runs={b.runs} cites={cites} onOpen={setOpen} />
            </h3>
          ) : b.kind === "rule" ? (
            <hr key={i} className="border-rule" />
          ) : b.kind === "table" ? (
            // Its own scroll: a comparison is wider than a phone, and the
            // page itself must never scroll sideways.
            <div key={i} className="-mx-4 overflow-x-auto px-4 print:mx-0 print:overflow-visible print:px-0">
              <table className="w-full min-w-[32rem] border-collapse text-base leading-snug print:min-w-0 print:text-sm">
                {b.head.length > 0 && (
                  <thead>
                    <tr>
                      {b.head.map((c, j) => (
                        <th
                          key={j}
                          {...blockLang(c, "border border-rule bg-inset p-2 text-left align-top font-semibold", "hi-note")}
                        >
                          <Runs runs={c} cites={cites} onOpen={setOpen} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {b.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((c, j) => (
                        <td key={j} {...blockLang(c, "whitespace-pre-line border border-rule p-2 align-top", "hi-note")}>
                          <Runs runs={c} cites={cites} onOpen={setOpen} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p key={i} {...blockLang(b.runs)} style={lit(i)}>
              <Runs runs={b.runs} cites={cites} onOpen={setOpen} />
            </p>
          )
        )}
      </div>

      {/* Why there is no answer, when there is none. An answer that was
          found carries no note under it: the standing line ("assembled from
          cited passages only…") came off at the designer's call, 13 Oct 2026 —
          the citations on every sentence already say it. */}
      {answer.status === "not_found" && (
        <div className="flex gap-3 rounded-card border border-rule bg-inset p-4 text-sm leading-relaxed text-ink-soft">
          <InfoIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            {answer.off_topic
              ? "This isn’t something the books of Madhyasth Darshan speak about, so it isn’t answered here."
              : deep || answer.mode === "deep"
                ? "The books don’t answer this directly, so nothing has been assembled. Try Book search for the words themselves."
                : "The passages this search found don’t answer it, so nothing has been assembled. Deep research below searches each part of the question on its own; Book search finds the words themselves."}
          </p>
        </div>
      )}

      {/* Deep research is offered after an answer, never chosen up front: the
          quick one is usually enough, and deep costs about ten times as much.
          After "not found" too — it searches each part of the question on its
          own and reads three times the passages, so it finds what one search
          missed, and a deep answer that finds nothing does not use up one.
          Not for a question the books could never answer ("the capital of
          India"): searching harder cannot find what is not there. */}
      {/* Deep research and the answer's own actions: stacked on a phone, one
          row when the column has room for it (desktop revision, 30 Sep
          2026) — measured on the column rather than the window, so opening the
          source panel beside it puts them back on two lines. */}
      <div className="@container print:hidden">
      <div className="flex flex-col gap-3 @2xl:flex-row">
      {onDeepen && answer.status !== "error" && !answer.off_topic && (
        <div className="flex flex-col gap-1.5 @2xl:flex-1">
          <button
            type="button"
            onClick={onDeepen}
            disabled={deepLeft === 0}
            className="flex min-h-12 items-center justify-center gap-2 rounded-control border px-4 text-title font-semibold disabled:opacity-50"
            style={{
              borderColor: "color-mix(in srgb, var(--ws-color) 40%, transparent)",
              background: "color-mix(in srgb, var(--ws-color) 10%, var(--color-card))",
              color: "var(--ws-ink)",
            }}
          >
            <span aria-hidden>✦</span> {answer.status === "not_found" ? "Try Deep research" : "Deep research"}
          </button>
          <p className="text-center text-xs text-ink-soft @2xl:hidden">
            {deepLeft === 0
              ? "Today’s deep research is used up"
              : answer.status === "not_found"
                ? `Searches each part of your question on its own and reads more passages · about a minute · not counted if it finds nothing${
                    deepLeft !== null ? ` · ${deepLeft} left today` : ""
                  }`
                : `Definitions, each part of the question searched, a fuller answer · about a minute${
                    deepLeft !== null ? ` · ${deepLeft} left today` : ""
                  }`}
          </p>
        </div>
      )}

      <div className="flex gap-3 @2xl:self-start">
        {!readOnly && (
        <button
          type="button"
          aria-pressed={saved}
          onClick={onToggleSaved}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-control border border-rule bg-card px-4 text-title font-semibold lg:flex-none"
        >
          <span style={{ color: WORKSPACES.translations.color }}>
            <NoteIcon className="h-5 w-5" />
          </span>
          {saved ? "Saved to Journey" : "Save to Journey"}
        </button>
        )}
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
          aria-label={shared === "copied" ? "Link copied" : "Share answer as a link"}
          disabled={shared === "working"}
          onClick={() => void share()}
          className={`flex h-12 items-center justify-center gap-2 rounded-control border border-rule bg-card ${
            readOnly ? "flex-1 px-4 text-title font-semibold" : "w-14"
          } ${shared === "copied" && !readOnly ? "w-auto px-3" : ""}`}
        >
          {shared === "copied" ? (
            <span className="text-xs font-semibold">Link copied</span>
          ) : (
            <>
              <ShareIcon className="h-5 w-5" />
              {readOnly && "Share"}
            </>
          )}
        </button>
      </div>
      </div>
      {/* In one row the button has no room for its explanation, so it moves
          under the whole row. */}
      {onDeepen && answer.status !== "error" && !answer.off_topic && (
        <p className="mt-1.5 hidden text-xs text-ink-soft @2xl:block">
          {deepLeft === 0
            ? "Today’s deep research is used up"
            : answer.status === "not_found"
              ? `Deep research searches each part of your question on its own and reads more passages · about a minute · not counted if it finds nothing${
                  deepLeft !== null ? ` · ${deepLeft} left today` : ""
                }`
              : `Deep research: definitions, each part of the question searched, a fuller answer · about a minute${
                  deepLeft !== null ? ` · ${deepLeft} left today` : ""
                }`}
        </p>
      )}
      </div>

      {!readOnly && answer.status === "ok" && (
        <Faithful
          answer={answer}
          text={text}
          onRated={(a) => {
            setAnswer(a);
            onSettle(a);
          }}
        />
      )}

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
                    {c.kind === "definition" ? (
                      <span lang="hi" className="hi-note font-medium">
                        परिभाषा · {c.canonical_ref.replace(/^परिभाषा:\s*/, "")}
                      </span>
                    ) : (
                      <>
                        <span lang="hi" className="hi-note font-medium">
                          {c.book ?? parseRef(c.canonical_ref)?.code}
                        </span>
                        {parseRef(c.canonical_ref) && (
                          <span className="text-ink-soft"> · p. {parseRef(c.canonical_ref)!.page}</span>
                        )}
                      </>
                    )}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(next.length > 0 || followUps) && (
        <section className="flex flex-col gap-3 print:hidden">
          <Eyebrow>Ask next</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {/* Asked as Research, carrying on from this answer (UX audit AS7):
                typed, "उदाहरण दीजिए" reads as a phrase and went to Book search.
                In the answer's own language, so a Hindi answer is not followed
                by an English one. */}
            {followUps && (
              <>
                <SuggestionChip tone="tint" onClick={() => onAsk(followUps.simpler, "research")}>
                  Explain simply
                </SuggestionChip>
                <SuggestionChip tone="tint" onClick={() => onAsk(followUps.example, "research")}>
                  Give an example
                </SuggestionChip>
              </>
            )}
            {next[0] && (
            <SuggestionChip tone="tint" onClick={() => onAsk(next[0].hindi, "books")}>
              Where does&nbsp;
              <span lang="hi" className="hi font-semibold">
                {next[0].hindi}
              </span>
              &nbsp;appear?
            </SuggestionChip>
            )}
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

/** the block being read aloud — a tint that grows outward, so nothing reflows */
const SPOKEN = {
  background: "color-mix(in srgb, var(--ws-color) 12%, transparent)",
  boxShadow: "0 0 0 6px color-mix(in srgb, var(--ws-color) 12%, transparent)",
  borderRadius: "var(--radius-control)",
};

/**
 * "Was this faithful to the books?" (16 Nov 2026, UX audit AS9). An answer
 * that misreads the darshan had no way to be flagged from where it is read.
 * The verdict goes to the chat API (`rateChatAnswer`, an upsert, so it can be
 * changed); a No also opens the feedback sheet with the question, the answer
 * and its sources already in it, for what was wrong.
 */
function Faithful({
  answer,
  text,
  onRated,
}: {
  answer: ChatAnswer;
  /** the answer as plain text with its sources — what the report quotes */
  text: string;
  onRated: (a: ChatAnswer) => void;
}) {
  const { open } = useFeedback();
  const verdict = answer.feedback?.is_positive ?? null;
  const [failed, setFailed] = useState(false);
  /** asking again after "Change" */
  const [asking, setAsking] = useState(false);

  const rate = (yes: boolean) => {
    setFailed(false);
    setAsking(false);
    const before = answer.feedback;
    onRated({ ...answer, feedback: { is_positive: yes } });
    rateChatAnswer(answer.id, { is_positive: yes }).catch(() => {
      onRated({ ...answer, feedback: before });
      setFailed(true);
    });
    if (!yes) report();
  };
  const report = () =>
    open({ kind: "content", quoted_text: text, quoted_label: "Assistant answer", source: "assistant" });

  const pill = "inline-flex min-h-11 items-center rounded-full border border-rule bg-card px-4 font-semibold text-ink";
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft print:hidden" aria-live="polite">
      {verdict === null || asking ? (
        <>
          <span>Was this faithful to the books?</span>
          <span className="flex gap-2">
            <button type="button" onClick={() => rate(true)} className={pill}>
              Yes
            </button>
            <button type="button" onClick={() => rate(false)} className={pill}>
              No
            </button>
          </span>
        </>
      ) : (
        <>
          <span>{verdict ? "Thank you — marked as faithful to the books." : "Thank you — marked as not faithful."}</span>
          {!verdict && (
            <button type="button" onClick={report} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2">
              Say what was wrong
            </button>
          )}
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2"
          >
            Change
          </button>
        </>
      )}
      {failed && <span className="basis-full">Couldn’t save that. Check your connection and try again.</span>}
    </div>
  );
}

function CiteBadge({ n, onClick }: { n: number; onClick?: () => void }) {
  const cls =
    "inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 text-xs font-bold align-[0.1em]";
  // The answer's own hue, not the app's terracotta (15 Nov 2026): every
  // accent in a Research answer used to be `--color-accent`, so a green
  // answer drew orange badges and an orange Sign in. `IntentScope` sets
  // `--ws-color` / `--ws-ink` around each answer, the shared page included.
  const style = {
    borderColor: "color-mix(in srgb, var(--ws-color) 35%, transparent)",
    background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
    color: "var(--ws-ink)",
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

/**
 * `lang` and the face for one block of the answer, read from its own words —
 * an answer can be Hindi prose with an English table, or the reverse.
 *
 * Body paragraphs take `.hi` (Mukta, 1.85, the app's Hindi reading measure);
 * the size stays `text-lg`, since `.hi` sets no size. Headings and table cells
 * pass `hi-note` (1.5) instead: they are set snug, and `.hi` is unlayered, so
 * its 1.85 would beat their `leading-snug` and open every wrapped heading.
 */
function blockLang(runs: Run[], className = "", hiClass?: string) {
  const l = contentLang(runs.map((r) => (r.kind === "text" ? r.text : "")).join(""));
  const face = l.lang === "hi" ? (hiClass ?? l.className) : "";
  return { lang: l.lang, className: `${face} ${className}`.trim() || undefined };
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
          // `hi-note` rather than `.hi`: inside an English line, 1.85 on one
          // bold Hindi word would open that line alone.
          <strong
            key={i}
            lang={scriptOf(r.text)}
            className={scriptOf(r.text) === "hi" ? "hi-note font-bold" : "font-semibold"}
          >
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
  const pathname = useRoutePath();
  const params = useSearchParams();
  const here = `${pathname}${params.size ? `?${params}` : ""}`;

  const body =
    failure.kind === "signin" ? (
      <>
        <p className="font-semibold">Research needs you to be signed in</p>
        <p className="mt-1 text-sm text-ink-soft">
          Each answer is written from the books for you, and there is a daily limit per
          reader. Paribhasha and Navigate work without signing in.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/login?next=${encodeURIComponent(here)}`}
            className={ctaPrimary}
            style={{ background: "var(--ws-color)" }}
          >
            Sign in
          </Link>
          <SuggestionChip onClick={() => onAsk(query, "books")}>Search the books instead</SuggestionChip>
        </div>
      </>
    ) : failure.kind === "deep_quota" ? (
      <>
        <p className="font-semibold">Today’s deep research is used up</p>
        <p className="mt-1 text-sm text-ink-soft">{failure.detail}</p>
        <p className="mt-1 text-sm text-ink-soft">The answer above still stands, and you can keep asking.</p>
      </>
    ) : failure.kind === "deep_error" ? (
      <>
        <p className="font-semibold">Deep research couldn’t finish</p>
        <p className="mt-1 text-sm text-ink-soft">
          It failed on our side while writing the answer. Your question was not counted, and the
          answer above still stands.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onRetry} className={ctaSecondary}>
            Try deep research again
          </button>
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
            style={{ background: "var(--ws-color)" }}
          >
            Try again
          </button>
          <SuggestionChip onClick={() => onAsk(query, "books")}>Search the books instead</SuggestionChip>
        </div>
      </>
    );

  return <div className="rounded-card border border-rule bg-card p-5">{body}</div>;
}
