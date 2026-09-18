import type { Intent } from "@/lib/assistant/intent";

/** Ask the Assistant something new, in this conversation. */
export type Ask = (query: string, intent?: Intent) => void;
