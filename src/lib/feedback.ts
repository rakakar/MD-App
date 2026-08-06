// What the reader tells us, and the state of the app when they told us.
//
// The message is the small half. The valuable half is `collectContext()` — the
// route, the build, the device, the last few errors — because it is the only
// part of a bug report nobody can get wrong. A reader saying "audio stops"
// costs us an afternoon; the same sentence with a build id and a failed
// request beside it costs ten minutes.
//
// What this file will never collect: notes, bookmarks, chat history, the
// session token, or anything a reader typed anywhere other than into the
// feedback box itself. The BE drops unknown keys as a second guard, but the
// rule is enforced here first, where it is readable.

import { apiBase } from "./api";
import { lastFailure, recentErrors, recordApiFailure } from "./clientErrors";
import { sessionToken } from "./me";
import { getPrefs } from "./storage";

export type FeedbackKind = "content" | "bug" | "idea" | "other";

export const FEEDBACK_KINDS: { value: FeedbackKind; label: string; hint: string }[] = [
  { value: "content", label: "Correction", hint: "Something in the text is wrong" },
  { value: "bug", label: "Bug", hint: "Something in the app is broken" },
  { value: "idea", label: "Idea", hint: "Something that would make it better" },
  { value: "other", label: "Other", hint: "Anything else" },
];

export interface FeedbackContext {
  url?: string;
  route?: string;
  workspace?: string;
  book_code?: string;
  chapter?: string;
  page?: string;
  viewport?: string;
  dpr?: number;
  ua?: string;
  platform?: string;
  app_version?: string;
  locale?: string;
  theme?: string;
  font_scale?: number;
  reader_face?: string;
  online?: boolean;
  errors?: string[];
  last_api_failure?: string;
  queued_at?: string;
}

export interface FeedbackDraft {
  kind: FeedbackKind;
  message: string;
  quoted_text?: string;
  suggested_text?: string;
  canonical_ref?: string;
}

export interface MyFeedback {
  id: number;
  kind: FeedbackKind;
  kind_label: string;
  status: string;
  status_label: string;
  message: string;
  canonical_ref: string;
  created_at: string;
  resolution_note: string;
  replies: { text: string; created_at: string }[];
}

/** How large an attachment the BE will take. Checked here so a 12 MB photo is
 *  refused before it is uploaded over a phone connection, not after. */
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

const QUEUE_KEY = "md.feedback_queue";

const APP_VERSION =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "dev";

/** The state of the app right now. Every field is machine-read; none of it is
 *  anything the reader typed. */
export function collectContext(workspace?: string): FeedbackContext {
  if (typeof window === "undefined") return {};
  const prefs = getPrefs();
  const route = window.location.pathname;
  // "/books/{code}/{chapter}" — the two ids that turn "it broke" into a place.
  const inBook = route.match(/^\/books\/([^/]+)(?:\/([^/]+))?/);
  return {
    url: `${window.location.origin}${route}`,
    route,
    workspace,
    book_code: inBook?.[1] ? decodeURIComponent(inBook[1]) : undefined,
    chapter: inBook?.[2],
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    dpr: window.devicePixelRatio,
    ua: navigator.userAgent.slice(0, 300),
    platform: /iPhone|iPad|iPod/.test(navigator.userAgent)
      ? "ios"
      : /Android/.test(navigator.userAgent)
        ? "android"
        : "web",
    app_version: APP_VERSION,
    locale: navigator.language,
    theme: prefs.theme,
    font_scale: prefs.fontScale,
    reader_face: prefs.face,
    online: navigator.onLine,
    errors: recentErrors().length ? recentErrors() : undefined,
    last_api_failure: lastFailure() || undefined,
  };
}

// ---- sending ----

function feedbackUrl(path = ""): string {
  return new URL(`feedback/${path}`, apiBase()).toString();
}

async function post(body: FormData): Promise<MyFeedback> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = sessionToken();
  if (token) headers["X-Session-Token"] = token;
  // Deliberately no Content-Type: the browser has to set the multipart
  // boundary itself, and naming the type here would strip it.
  const res = await fetch(feedbackUrl(), { method: "POST", headers, body });
  if (!res.ok) {
    recordApiFailure(feedbackUrl(), res.status);
    const err = new Error(`Feedback failed: ${res.status}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as MyFeedback;
}

function toForm(draft: FeedbackDraft, context: FeedbackContext, screenshot?: File | null): FormData {
  const form = new FormData();
  form.set("kind", draft.kind);
  form.set("message", draft.message);
  if (draft.quoted_text) form.set("quoted_text", draft.quoted_text);
  if (draft.suggested_text) form.set("suggested_text", draft.suggested_text);
  if (draft.canonical_ref) form.set("canonical_ref", draft.canonical_ref);
  form.set("context", JSON.stringify(context));
  if (screenshot) form.set("screenshot", screenshot);
  return form;
}

interface QueuedDraft extends FeedbackDraft {
  context: FeedbackContext;
}

function readQueue(): QueuedDraft[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as QueuedDraft[];
  } catch {
    return [];
  }
}

function writeQueue(rows: QueuedDraft[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(rows.slice(-20)));
  } catch {
    // storage full — the report is lost rather than the app broken
  }
}

/**
 * Send one report, or keep it until the network comes back.
 *
 * Returns `"queued"` rather than throwing, because from where the reader
 * stands a report written on a train has been sent — it is our job to carry
 * it, not theirs to remember to try again. An attachment is the one thing that
 * does not survive the wait: a 5 MB image will not fit in localStorage beside
 * everything else the app keeps there, so a queued report goes without it and
 * the sheet says so.
 */
export async function sendFeedback(
  draft: FeedbackDraft,
  context: FeedbackContext,
  screenshot?: File | null
): Promise<"sent" | "queued"> {
  try {
    await post(toForm(draft, context, screenshot));
    return "sent";
  } catch (e) {
    const status = (e as { status?: number }).status;
    // 4xx is our fault or theirs, and retrying changes neither. Only a
    // transport failure (no status) or a server error is worth keeping.
    if (status && status < 500) throw e;
    writeQueue([
      ...readQueue(),
      { ...draft, context: { ...context, queued_at: new Date().toISOString() } },
    ]);
    return "queued";
  }
}

/** Drain whatever is waiting. Safe to call on every reconnect: a row leaves
 *  the queue only once the server has it, and the BE folds a genuine duplicate
 *  into the original rather than filing it twice. */
export async function flushFeedbackQueue(): Promise<void> {
  if (typeof window === "undefined" || !sessionToken()) return;
  const pending = readQueue();
  if (!pending.length) return;
  const left: QueuedDraft[] = [];
  for (const row of pending) {
    try {
      const { context, ...draft } = row;
      await post(toForm(draft, context));
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (!status || status >= 500) left.push(row);
    }
  }
  writeQueue(left);
}

export function queuedFeedbackCount(): number {
  if (typeof window === "undefined") return 0;
  return readQueue().length;
}

export async function getMyFeedback(): Promise<MyFeedback[]> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = sessionToken();
  if (token) headers["X-Session-Token"] = token;
  const url = new URL("me/feedback/", apiBase()).toString();
  const res = await fetch(url, { headers });
  if (!res.ok) {
    recordApiFailure(url, res.status);
    throw new Error(`Could not load feedback: ${res.status}`);
  }
  return (await res.json()) as MyFeedback[];
}
