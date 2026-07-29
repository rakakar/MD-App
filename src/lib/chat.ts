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
  opts: { mode?: "quick" | "deep"; continueFrom?: number } = {}
): Promise<{ answer: ChatAnswer; quota: ChatQuota }> {
  return authedFetch(chatUrl(), {
    method: "POST",
    body: JSON.stringify({
      query,
      mode: opts.mode ?? "quick",
      ...(opts.continueFrom !== undefined ? { continue_from: opts.continueFrom } : {}),
    }),
  });
}

/**
 * 429 here means the daily cap, not a network problem — the BE sends the
 * reader-facing sentence in `detail`, in Hindi and English, so the UI shows
 * that rather than inventing its own wording for a limit it does not own.
 */
export function isQuotaExhausted(err: unknown): boolean {
  return (err as { status?: number })?.status === 429;
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

/** Upsert — a reader changing their mind replaces the verdict. */
export const rateChatAnswer = (
  id: number,
  feedback: ChatFeedback
): Promise<ChatAnswer> =>
  authedFetch(chatUrl(`${id}/feedback/`), {
    method: "PUT",
    body: JSON.stringify(feedback),
  });
