"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackIcon, PlusIcon } from "@/components/shell/icons";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import { track } from "@/lib/analytics";
import { firstSentence } from "@/lib/assistant/answer";
import {
  ago,
  getConversation,
  kindOf,
  listConversations,
  newId,
  putConversation,
  titleFor,
  type Conversation,
  type Turn,
} from "@/lib/assistant/conversations";
import { commandSuggestions, type Destination } from "@/lib/assistant/destinations";
import {
  detectIntent,
  INTENT_HINT,
  INTENT_LABEL,
  INTENT_PLACEHOLDER,
  INTENTS,
  type Intent,
} from "@/lib/assistant/intent";
import type { ChatQuota } from "@/lib/types";
import { APP_ACCENT } from "@/lib/workspaceConfig";
import { BookSearchAnswer } from "./BookSearchAnswer";
import { Composer, type InputLang } from "./Composer";
import { HistoryIcon, IntentGlyph, SparkIcon } from "./icons";
import { NavigateAnswer } from "./NavigateAnswer";
import { ParibhashaAnswer } from "./ParibhashaAnswer";
import { Eyebrow, INTENT_COLOR, IntentScope, QueryBubble } from "./parts";
import { ResearchAnswer } from "./ResearchAnswer";
import { useDictionary, useOriginalBooks } from "./useAssistantData";
import { canListen, VoiceSheet } from "./VoiceSheet";

const LANG_KEY = "md.assistant.lang";

/**
 * The Assistant — one box, four kinds of answer (designer's comps, 18 Sep).
 *
 * A conversation is a list of turns, each a question and the answer it got.
 * Which answer is decided per turn: by the chip the reader picked, or — with
 * none picked — by `detectIntent` reading what they typed. Each answer is its
 * own component and fetches its own data, so a conversation can mix a
 * dictionary look-up, a passage search and a written answer, which is how
 * people actually move between them.
 *
 * The URL carries the conversation (`?c=`), so a reload, the back button and
 * the Conversations list all land on the same thread. `?q=` asks once on
 * arrival — how the old `/search?q=` links and the glossary's "ask about this"
 * get here — except for Research, which only pre-fills: a link must never
 * spend one of somebody's daily questions without them pressing the button.
 */
export function AssistantScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const dictionary = useDictionary();
  const books = useOriginalBooks();

  const [conv, setConv] = useState<Conversation | null>(null);
  const [mode, setMode] = useState<Intent | null>(null);
  const [text, setText] = useState("");
  const [lang, setLang] = useState<InputLang>("hi");
  const [quota, setQuota] = useState<ChatQuota | null>(null);
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState(false);
  const [recent, setRecent] = useState<Conversation[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const turnRefs = useRef(new Map<string, HTMLElement>());
  const scrollTo = useRef<string | null>(null);

  useEffect(() => {
    setVoice(canListen());
    setRecent(listConversations().slice(0, 3));
    try {
      const saved = window.localStorage.getItem(LANG_KEY);
      if (saved === "hi" || saved === "en") setLang(saved);
    } catch {}
  }, []);

  // ---- the conversation in the URL ----
  const cParam = params.get("c");
  /** the conversation this screen just started — its URL is ours, not a visit */
  const created = useRef<string | null>(null);
  useEffect(() => {
    if (!cParam) {
      setConv(null);
      return;
    }
    if (conv?.id === cParam || created.current === cParam) return;
    setConv(getConversation(cParam));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cParam]);

  useEffect(() => {
    if (conv && conv.turns.length > 0) putConversation(conv);
  }, [conv]);

  // ---- asking ----
  const ask = useCallback(
    (query: string, forced?: Intent) => {
      const q = query.trim();
      if (!q) return;
      const intent = forced ?? mode ?? detectIntent(q, dictionary);
      const turn: Turn = {
        id: newId(),
        intent,
        query: q,
        at: new Date().toISOString(),
        ...(intent === "books" && lang === "en" ? { asTyped: true } : {}),
      };
      const now = turn.at;
      // The id is made out here, not in the updater: React may run an updater
      // twice, and two ids would put one in the URL and the other on screen.
      const fresh = conv ? null : newId();
      setConv((c) =>
        c
          ? { ...c, turns: [...c.turns, turn], updatedAt: now }
          : { id: fresh ?? newId(), title: titleFor(q), turns: [turn], savedToJourney: false, createdAt: now, updatedAt: now }
      );
      if (fresh) {
        created.current = fresh;
        router.replace(`/assistant?c=${fresh}`, { scroll: false });
      }
      scrollTo.current = turn.id;
      setText("");
      track("assistant_ask", { intent, chosen: forced || mode ? "chip" : "auto", length: q.length });
    },
    [conv, mode, dictionary, lang, router]
  );

  // A new turn scrolls its question to the top, so the answer reads downward
  // from where the reader's eyes already are.
  useEffect(() => {
    const id = scrollTo.current;
    if (!id) return;
    const el = turnRefs.current.get(id);
    if (el) {
      scrollTo.current = null;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  // ?q= arrives already asked (or, for Research, typed in and waiting).
  const qParam = params.get("q");
  const modeParam = params.get("mode");
  const arrived = useRef(false);
  useEffect(() => {
    if (arrived.current || !qParam || cParam) return;
    const forced = (INTENTS as string[]).includes(modeParam ?? "") ? (modeParam as Intent) : undefined;
    // wait for the dictionary before guessing, unless the link said what it is
    if (!forced && dictionary === null) return;
    arrived.current = true;
    const intent = forced ?? detectIntent(qParam, dictionary);
    if (intent === "research") {
      setMode("research");
      setText(qParam);
      inputRef.current?.focus();
    } else {
      ask(qParam, intent);
    }
  }, [qParam, modeParam, cParam, dictionary, ask]);

  const settle = useCallback((turnId: string, patch: Partial<Turn>) => {
    setConv((c) =>
      c ? { ...c, turns: c.turns.map((t) => (t.id === turnId ? { ...t, ...patch } : t)) } : c
    );
  }, []);

  const startOver = () => {
    setConv(null);
    setMode(null);
    setText("");
    setRecent(listConversations().slice(0, 3));
    router.replace("/assistant", { scroll: false });
    window.scrollTo({ top: 0 });
    inputRef.current?.focus();
  };

  const commands = useMemo(() => commandSuggestions(text), [text]);
  const onCommand = (d: Destination) => {
    track("assistant_ask", { intent: "navigate", chosen: "command", length: text.length });
    router.push(d.href);
  };

  // ---- the compact header, once the big one has scrolled away ----
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [conv === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const turns = conv?.turns ?? [];
  const placeholder = conv
    ? turns[turns.length - 1]?.intent === "books"
      ? "Narrow this, or ask about it"
      : "Ask a follow-up"
    : INTENT_PLACEHOLDER[mode ?? "auto"];

  return (
    <AppAccent>
      {conv && compact && (
        <div className="fixed inset-x-0 top-0 z-30 border-b border-rule bg-surface/95 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={startOver}
              aria-label="New conversation"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-rule bg-card"
            >
              <BackIcon className="h-5 w-5" />
            </button>
            <p className="min-w-0 flex-1 truncate text-title font-semibold">{conv.title}</p>
            <AiBadge />
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-3xl px-4 pb-40 sm:px-6">
        <Header books={books?.length ?? null} active={conv !== null} onNew={startOver} />
        <div ref={sentinel} aria-hidden className="h-px" />

        {!conv ? (
          <EmptyState mode={mode} onMode={setMode} recent={recent} />
        ) : (
          <div className="flex flex-col gap-8 pt-6">
            {turns.map((t, i) => {
              const prevResearch = turns
                .slice(0, i)
                .reverse()
                .find((p) => p.intent === "research" && p.answer)?.answer?.id;
              return (
                <section
                  key={t.id}
                  ref={(el) => {
                    if (el) turnRefs.current.set(t.id, el);
                    else turnRefs.current.delete(t.id);
                  }}
                  className="flex scroll-mt-24 flex-col gap-5"
                  aria-label={`${INTENT_LABEL[t.intent]}: ${t.query}`}
                >
                  <QueryBubble>{t.query}</QueryBubble>
                  <IntentScope intent={t.intent}>
                    {t.intent === "paribhasha" && (
                      <ParibhashaAnswer
                        query={t.query}
                        dictionary={dictionary}
                        onAsk={ask}
                        onSettle={(summary, count) => settle(t.id, { summary, count })}
                      />
                    )}
                    {t.intent === "books" && (
                      <BookSearchAnswer
                        query={t.query}
                        asTyped={!!t.asTyped}
                        onSettle={(summary, count) => settle(t.id, { summary, count })}
                      />
                    )}
                    {t.intent === "navigate" && (
                      <NavigateAnswer
                        query={t.query}
                        books={books}
                        onAsk={ask}
                        onSettle={(summary, count) => settle(t.id, { summary, count })}
                      />
                    )}
                    {t.intent === "research" && (
                      <ResearchAnswer
                        turnId={t.id}
                        query={t.query}
                        stored={t.answer}
                        continueFrom={prevResearch}
                        dictionary={dictionary}
                        saved={conv.savedToJourney}
                        onToggleSaved={() =>
                          setConv((c) => (c ? { ...c, savedToJourney: !c.savedToJourney } : c))
                        }
                        onAsk={ask}
                        onQuota={setQuota}
                        onSettle={(answer) =>
                          settle(t.id, {
                            answer,
                            summary: firstSentence(answer.answer),
                            count: answer.citations.length,
                          })
                        }
                      />
                    )}
                  </IntentScope>
                </section>
              );
            })}
            {quota?.capped && quota.remaining !== null && quota.limit !== null && (
              <p className="text-center text-sm text-ink-soft">
                {quota.remaining} of {quota.limit} research questions left today
              </p>
            )}
          </div>
        )}
      </div>

      <Composer
        inputRef={inputRef}
        value={text}
        onChange={setText}
        onSubmit={() => ask(text)}
        placeholder={placeholder}
        lang={lang}
        onLang={(l) => {
          setLang(l);
          try {
            window.localStorage.setItem(LANG_KEY, l);
          } catch {}
        }}
        commands={commands}
        onCommand={onCommand}
        canListen={voice}
        onListen={() => setListening(true)}
      />

      <VoiceSheet
        open={listening}
        initialLang={lang}
        onClose={() => setListening(false)}
        onDone={(heard, send) => {
          setListening(false);
          if (send) ask(heard);
          else {
            setText(heard);
            inputRef.current?.focus();
          }
        }}
      />
    </AppAccent>
  );
}

function AiBadge() {
  return (
    <span
      className="inline-flex h-7 items-center rounded-md border px-2 text-xs font-bold tracking-wide"
      style={{
        borderColor: "color-mix(in srgb, var(--ws-color) 30%, transparent)",
        background: "color-mix(in srgb, var(--ws-color) 10%, var(--color-card))",
        color: "var(--ws-ink)",
      }}
    >
      AI
    </span>
  );
}

function Header({
  books,
  active,
  onNew,
}: {
  books: number | null;
  active: boolean;
  onNew: () => void;
}) {
  return (
    <header className="-mx-4 flex items-center gap-4 border-b border-rule px-4 pb-4 pt-5 sm:-mx-6 sm:px-6">
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-tile text-white shadow-card"
        style={{ background: APP_ACCENT }}
        aria-hidden
      >
        <SparkIcon className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="flex items-center gap-2">
          <span className="font-display text-3xl font-medium leading-tight tracking-[-0.015em]">
            Assistant
          </span>
          <AiBadge />
        </h1>
        <p className="text-sm leading-snug text-ink-soft">
          Answers only from {books ? `the ${books} original books` : "the original books"}
        </p>
      </div>
      {active ? (
        <button
          type="button"
          onClick={onNew}
          aria-label="New conversation"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-rule bg-card"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      ) : (
        <Link
          href="/assistant/conversations"
          aria-label="Past conversations"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-rule bg-card"
        >
          <HistoryIcon className="h-5 w-5" />
        </Link>
      )}
    </header>
  );
}

/**
 * 1 · Empty state.
 *
 * The four chips are optional and say so. Chosen, one fixes what the next
 * question is; left alone, the Assistant decides from what is typed. Tapping a
 * chosen chip again un-chooses it — the "leave all four unselected" the hint
 * promises has to be reachable.
 */
function EmptyState({
  mode,
  onMode,
  recent,
}: {
  mode: Intent | null;
  onMode: (m: Intent | null) => void;
  recent: Conversation[];
}) {
  return (
    <div className="pt-7">
      <h2 className="font-display text-3xl font-medium leading-tight tracking-[-0.015em]">
        What are you looking for?
      </h2>
      <p className="mt-2 text-base leading-relaxed text-ink-soft">
        Type a word for its paribhasha, a phrase to find it in the books, a question, or a place in
        the app.
      </p>

      <p className="mt-7 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
        What do you need
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3" role="radiogroup" aria-label="What do you need">
        {INTENTS.map((i) => {
          const on = mode === i;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onMode(on ? null : i)}
              className={`flex min-h-14 items-center gap-3 rounded-card border px-4 text-left text-base font-semibold transition-colors ${
                on ? "border-transparent text-white shadow-card" : "border-rule bg-card text-ink"
              }`}
              style={on ? { background: INTENT_COLOR[i] } : undefined}
            >
              <span style={on ? undefined : { color: INTENT_COLOR[i] }}>
                <IntentGlyph intent={i} className="h-5 w-5" />
              </span>
              {INTENT_LABEL[i]}
            </button>
          );
        })}
      </div>

      <IntentScope intent={mode ?? "paribhasha"}>
        <p
          className="mt-4 flex gap-3 rounded-card border p-4 text-sm leading-relaxed text-ink-soft"
          style={{
            borderColor: "color-mix(in srgb, var(--ws-color) 22%, transparent)",
            background: "color-mix(in srgb, var(--ws-color) 7%, var(--color-card))",
          }}
        >
          <span aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--ws-ink)" }}>
            ⓘ
          </span>
          {INTENT_HINT[mode ?? "auto"]}
        </p>
      </IntentScope>

      {recent.length > 0 && (
        <section className="mt-8">
          <Eyebrow
            action={
              <Link
                href="/assistant/conversations"
                className="inline-flex min-h-11 items-center text-sm font-semibold"
                style={{ color: "var(--ws-ink)" }}
              >
                All
              </Link>
            }
          >
            Continue
          </Eyebrow>
          <ul className="mt-1">
            {recent.map((c) => {
              const k = kindOf(c);
              return (
                <li key={c.id}>
                  <Link href={`/assistant?c=${c.id}`} className="flex min-h-12 items-center gap-3 py-2">
                    <span style={{ color: INTENT_COLOR[k] }}>
                      <IntentGlyph intent={k} className="h-5 w-5" />
                    </span>
                    <span
                      lang={/[ऀ-ॿ]/.test(c.title) ? "hi" : undefined}
                      className={`min-w-0 flex-1 truncate text-base ${/[ऀ-ॿ]/.test(c.title) ? "hi-note" : ""}`}
                    >
                      {c.title}
                    </span>
                    <span className="shrink-0 text-sm text-ink-soft">{ago(c.updatedAt)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
