import type { Intent } from "@/lib/assistant/intent";

/**
 * Ask the Assistant something new, in this conversation.
 *
 * `exact` keeps a Book search a phrase search when it is asked again from an
 * answer (15 Nov 2026) — "All books" under an empty scoped search. Only the
 * chip sets it otherwise, and the chips are gone once a conversation starts.
 */
export type Ask = (query: string, intent?: Intent, opts?: { exact?: boolean }) => void;
