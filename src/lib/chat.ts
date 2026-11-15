// MD Chat — the grounded-answer half of the assistant (2A), /api/v1/chat/.
//
// Signed-in and metered, unlike `search()` in api.ts: search is anonymous and
// costs an embedding, an answer costs an LLM call. Every response carries the
// reader's remaining quota so the UI can say how many questions are left
// before the day's limit rather than discovering it on a refusal.
//
// Conversation context is not held here. To ask a follow-up, pass the id of
// the answer being followed up on as `continueFrom`; the BE rebuilds the
// prior turns from that reader's own stored questions. Starting a fresh
// conversation is simply not passing it — there is nothing to clear.

import { apiBase } from "./api";
import { authedFetch } from "./me";
import type { ChatAnswer, ChatFeedback, ChatSession, ChatQuota } from "./types";

function chatUrl(path = ""): string {
  return new URL(`chat/${path}`, apiBase()).toString();
}

/** Quota, answer modes, feedback categories and the last few answers. */
export const getChatSession = (): Promise<ChatSession> =>
  authedFetch<ChatSession>(chatUrl());

export async function askChat(
  query: string,
  opts: { mode?: "quick" | "deep"; continueFrom?: number; books?: string[] } = {}
): Promise<{ answer: ChatAnswer; quota: ChatQuota }> {
  const since = Date.now();
  try {
    return await postChat(query, opts);
  } catch (err) {
    if (!lostInTransit(err)) throw err;
    // The question reached the BE, which goes on to answer and store it — so
    // the answer is fetched back rather than reported as an error (and a
    // "Try again" asking, and paying for, the same question twice).
    const found = await recoverAnswer(query, opts.mode ?? "quick", since);
    if (found) return found;
    throw err;
  }
}

function postChat(
  query: string,
  opts: { mode?: "quick" | "deep"; continueFrom?: number; books?: string[] }
): Promise<{ answer: ChatAnswer; quota: ChatQuota }> {
  return authedFetch(chatUrl(), {
    method: "POST",
    body: JSON.stringify({
      query,
      mode: opts.mode ?? "quick",
      ...(opts.continueFrom !== undefined ? { continue_from: opts.continueFrom } : {}),
      // answer only from these books; omitted means every book
      ...(opts.books?.length ? { books: opts.books } : {}),
    }),
  });
}

/**
 * The request died with no answer from the BE itself: a fetch that threw
 * ("Load failed" — no status), or a gateway giving up on a slow one (502/504).
 *
 * The usual cause is the installed iOS app (15 Nov 2026): Deep research takes
 * 30–60 s, and if the phone locks or the reader switches apps meanwhile, iOS
 * suspends the WKWebView and kills the in-flight fetch. The BE never notices.
 */
function lostInTransit(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === undefined || status === 502 || status === 504;
}

/**
 * Look for the answer among the reader's recent ones: same question, same
 * mode, asked no earlier than this attempt (a minute's grace for clock skew).
 * Polls for up to two minutes from the ask, since a deep answer may still be
 * being written when the app comes back. Timers do not run while iOS has the
 * app suspended, so the waiting resumes when the reader returns.
 */
async function recoverAnswer(
  query: string,
  mode: "quick" | "deep",
  since: number
): Promise<{ answer: ChatAnswer; quota: ChatQuota } | null> {
  const deadline = since + 120_000;
  const q = query.trim();
  for (;;) {
    try {
      const s = await getChatSession();
      const a = s.recent.find(
        (r) =>
          r.query.trim() === q &&
          (r.mode ?? "quick") === mode &&
          Date.parse(r.asked_at) >= since - 60_000
      );
      if (a) return { answer: a, quota: s.quota };
    } catch {
      // still offline — keep waiting until the deadline
    }
    if (Date.now() > deadline) return null;
    await new Promise((r) => setTimeout(r, 4000));
  }
}

/**
 * 429 here means the daily cap, not a network problem — the BE sends the
 * reader-facing sentence in `detail`, in Hindi and English, so the UI shows
 * that rather than inventing its own wording for a limit it does not own.
 */
export function isQuotaExhausted(err: unknown): boolean {
  return (err as { status?: number })?.status === 429;
}

/** Only the day's deep answers are used up — a quick answer still works. */
export function isDeepQuotaExhausted(err: unknown): boolean {
  const e = err as { status?: number; data?: { code?: string } };
  return e?.status === 429 && e.data?.code === "deep_limit";
}

/** The answer service is down; the question was not spent. */
export function isAnswerServiceDown(err: unknown): boolean {
  return (err as { status?: number })?.status === 503;
}

export async function getChatHistory(cursor?: string): Promise<{
  results: ChatAnswer[];
  next: string | null;
  previous: string | null;
}> {
  const url = new URL(chatUrl("history/"));
  if (cursor) url.searchParams.set("cursor", cursor);
  return authedFetch(url.toString());
}

/**
 * Make one of the reader's own answers public (contract §9.3). The same code
 * every time, so a link already sent keeps working; the page is `/a/{code}`.
 */
export const shareChatAnswer = (id: number): Promise<{ code: string }> =>
  authedFetch(chatUrl(`${id}/share/`), { method: "POST" });

/** Upsert — a reader changing their mind replaces the verdict. */
export const rateChatAnswer = (
  id: number,
  feedback: ChatFeedback
): Promise<ChatAnswer> =>
  authedFetch(chatUrl(`${id}/feedback/`), {
    method: "PUT",
    body: JSON.stringify(feedback),
  });
