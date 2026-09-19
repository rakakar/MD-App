"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlusIcon } from "@/components/shell/icons";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import { track } from "@/lib/analytics";
import { firstSentence } from "@/lib/assistant/answer";
import {
  getConversation,
  newId,
  putConversation,
  titleFor,
  type Conversation,
  type Turn,
} from "@/lib/assistant/conversations";
import {
  bookDestinations,
  commandSuggestions,
  matchDestinations,
  resumeDestination,
  type Destination,
} from "@/lib/assistant/destinations";
import {
  detectIntent,
  INTENT_LABEL,
  INTENT_PLACEHOLDER,
  INTENTS,
  type Intent,
} from "@/lib/assistant/intent";
import type { ChatQuota } from "@/lib/types";
import { BookSearchAnswer } from "./BookSearchAnswer";
import { Composer } from "./Composer";
import { MenuGlyph } from "./icons";
import { Landing } from "./Landing";
import { NavigateAnswer } from "./NavigateAnswer";
import { ParibhashaAnswer } from "./ParibhashaAnswer";
import { IntentScope, QueryBubble } from "./parts";
import { ResearchAnswer } from "./ResearchAnswer";
import { useDictionary, useOriginalBooks } from "./useAssistantData";
import { canListen, VoiceSheet } from "./VoiceSheet";

/**
 * Nothing chosen when the screen opens (designer's recording, 19 Sep): the
 * four chips stand above the box, and choosing one is the first thing a
 * reader does. A default choice would hide the very row that says what the
 * Assistant can do.
 */
const DEFAULT_MODE: Intent | null = null;

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
  const [mode, setMode] = useState<Intent | null>(DEFAULT_MODE);
  const [text, setText] = useState("");
  const [quota, setQuota] = useState<ChatQuota | null>(null);
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const turnRefs = useRef(new Map<string, HTMLElement>());
  const scrollTo = useRef<string | null>(null);

  useEffect(() => {
    setVoice(canListen());
  }, []);

  /**
   * A fresh Assistant opens ready to type, the chips sitting just above the
   * keyboard. Not when reopening a saved
   * conversation (`?c=`): there the reader came to read, and a keyboard would
   * cover half the answer. `preventScroll` keeps the header in view while the
   * keyboard rises.
   *
   * Browsers decide whether focus brings the keyboard up. Android does after
   * a tap on the tab bar; iOS Safari only raises it from a tap on the box
   * itself, so there the caret is in place and one tap opens the keyboard.
   */
  useEffect(() => {
    if (params.get("c")) return;
    inputRef.current?.focus({ preventScroll: true });
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // The chip decides the question that starts a conversation. Follow-ups
      // are read from what is typed: the chips are not on screen by then, so a
      // choice made there must not silently turn "explain simply" into a
      // dictionary look-up three turns later.
      const chosen = conv ? null : mode;
      const intent = forced ?? chosen ?? detectIntent(q, dictionary);
      // Navigate, chosen, "opens it instead of answering": straight to the
      // best place, no conversation. Only when nothing matches does it become
      // a turn, so the reader is told why nothing happened.
      if (intent === "navigate" && !forced && chosen === "navigate") {
        const resume = resumeDestination();
        const best = matchDestinations(q, [...(resume ? [resume] : []), ...bookDestinations(books ?? [])])
          .matches[0]?.destination;
        if (best) {
          track("assistant_ask", { intent, chosen: "chip", length: q.length });
          router.push(best.href);
          return;
        }
      }
      const turn: Turn = {
        id: newId(),
        intent,
        query: q,
        at: new Date().toISOString(),
        ...(intent === "books" && chosen === "books" ? { exact: true } : {}),
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
      track("assistant_ask", { intent, chosen: forced || chosen ? "chip" : "auto", length: q.length });
    },
    [conv, mode, dictionary, router, books]
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
    setMode(DEFAULT_MODE);
    setText("");
    router.replace("/assistant", { scroll: false });
    window.scrollTo({ top: 0 });
    inputRef.current?.focus();
  };

  const commands = useMemo(() => commandSuggestions(text), [text]);
  const onCommand = (d: Destination) => {
    track("assistant_ask", { intent: "navigate", chosen: "command", length: text.length });
    router.push(d.href);
  };

  const turns = conv?.turns ?? [];
  const placeholder = conv
    ? turns[turns.length - 1]?.intent === "books"
      ? "Narrow this, or ask about it"
      : "Ask a follow-up"
    : INTENT_PLACEHOLDER[mode ?? "auto"];

  return (
    <AppAccent>
      <Header active={conv !== null} onNew={startOver} />

      {conv && (
        <div className="mx-auto w-full max-w-3xl px-4 pb-40 sm:px-6">
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
                        exact={!!t.exact}
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
        </div>
      )}

      <Composer
        inputRef={inputRef}
        value={text}
        onChange={setText}
        onSubmit={() => ask(text)}
        placeholder={placeholder}
        commands={commands}
        onCommand={onCommand}
        canListen={voice}
        onListen={() => setListening(true)}
        pill={
          !conv && mode
            ? {
                label: INTENT_LABEL[mode],
                onClear: () => {
                  setMode(null);
                  setText("");
                  inputRef.current?.focus();
                },
              }
            : null
        }
        above={
          conv ? null : (
            <Landing
              books={books?.length ?? null}
              mode={mode}
              onMode={(m) => {
                setMode(m);
                inputRef.current?.focus();
              }}
              text={text}
              dictionary={dictionary}
              onPick={(word) => ask(word, "paribhasha")}
            />
          )
        }
      />

      <VoiceSheet
        open={listening}
        initialLang="hi"
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

/**
 * The Assistant's own app bar, as the 19 Sep comps draw it: conversations on
 * the left, the name in the middle, a new conversation on the right. Sticky,
 * so both doors stay in reach down a long answer — which is what the old
 * compact bar that appeared on scroll was for.
 */
function Header({ active, onNew }: { active: boolean; onNew: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-surface">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/assistant/conversations"
          aria-label="Past conversations"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-rule bg-card"
        >
          <MenuGlyph className="h-5 w-5" />
        </Link>
        <h1 className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <span className="font-display text-2xl font-medium leading-tight tracking-[-0.015em]">
            Assistant
          </span>
          <AiBadge />
        </h1>
        <button
          type="button"
          onClick={onNew}
          aria-label="New conversation"
          disabled={!active}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-rule bg-card disabled:opacity-40"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
