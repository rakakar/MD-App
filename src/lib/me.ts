// Session-authenticated personal API (/api/v1/me/, contract §6) and
// django-allauth headless auth flows.
//
// The session travels as an `X-Session-Token` header, not a cookie. The BE is
// on welfareinfo.net and this app is not, so a session cookie is third-party:
// iOS Safari discards it outright and Chrome is heading the same way, which
// would mean signed-in reading works on the desktop it was built on and
// nowhere else. A header has no such rule. It also costs nothing on the BE —
// allauth's `app` client is mounted alongside the cookie-based `browser` one,
// so moving this app onto a welfareinfo.net subdomain later and switching back
// to cookies is a change to this file alone.
//
// The token lives in localStorage, which is readable by any script that gets
// injected into this origin. That is the trade for cross-device sign-in; it is
// the reason the app renders no user-supplied HTML anywhere.

import { apiBase } from "./api";
import { recordApiFailure } from "./clientErrors";
import type { HighlightColour } from "./storage";
import type { Bookmark, MeUser, Note, Progress } from "./types";

const TOKEN_KEY = "md.session_token";

function beOrigin(): string {
  return new URL(apiBase()).origin;
}

export function sessionToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setSessionToken(token: string | null): void {
  if (typeof localStorage === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * Exported because /me/ is no longer the only signed-in surface — the chat
 * endpoints authenticate the same way, and a second copy of this would be a
 * second place to forget the header when the auth scheme changes.
 */
export async function authedFetch<T>(
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.headers as Record<string, string>),
  };
  const token = sessionToken();
  if (token) headers["X-Session-Token"] = token;
  if (init.method && init.method !== "GET" && init.body) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    // Kept for the next bug report — status and path only (lib/clientErrors).
    recordApiFailure(url, res.status);
    const err = new Error(`Request failed: ${res.status}`) as Error & {
      status: number;
      data?: unknown;
    };
    err.status = res.status;
    try {
      err.data = await res.json();
    } catch {
      // non-JSON error body
    }
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function meUrl(path: string): string {
  return new URL(`me/${path}`, apiBase()).toString();
}

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : (data?.results ?? []);
}

// ---- /me/ trio (contract §6) ----
// Every row is anchored to canonical_ref, on the way in and on the way out.
//
// Rows without one are dropped rather than shown. A bookmark on an audio track
// has no canonical_ref and no reader location to open; a row from a BE too old
// to send the field would otherwise render as a link to nowhere. Silence beats
// a dead link in a saved list.

type RawRow = Record<string, unknown>;

const withRef = (rows: RawRow[]): RawRow[] =>
  rows.filter((r) => typeof r.canonical_ref === "string" && r.canonical_ref !== "");

export async function getMe(): Promise<MeUser | null> {
  // No token means signed out, which is the common case — don't spend a
  // round-trip on every cold load to be told so.
  if (!sessionToken()) return null;
  try {
    return await authedFetch<MeUser>(meUrl(""));
  } catch (e) {
    // A token the server refuses is worse than no token: it would ride along
    // on every later request and keep failing. Drop it and be plainly signed
    // out. A network failure is not the same thing — keep the token then, the
    // reader is still signed in and simply offline.
    const status = (e as { status?: number })?.status;
    if (status === 401 || status === 403) setSessionToken(null);
    return null;
  }
}

/** Set the reader's display name. */
export const updateMe = (name: string): Promise<MeUser> =>
  authedFetch<MeUser>(meUrl(""), { method: "PATCH", body: JSON.stringify({ name }) });

export const getBookmarks = async (): Promise<Bookmark[]> =>
  withRef(unwrap(await authedFetch<RawRow[] | { results: RawRow[] }>(meUrl("bookmarks/")))).map(
    (r) => ({
      ...r,
      id: r.id as number,
      canonical_ref: r.canonical_ref as string,
      text_hi: (r.text_hi as string) || undefined,
      // "" is the contract's "saved but not painted", and it has to come back
      // as undefined rather than as an empty string — the reader's list styles
      // on the field being absent.
      colour: (r.colour as HighlightColour) || undefined,
    })
  );

/**
 * Save a passage, optionally painted (contract §6.0).
 *
 * POST upserts: sending a ref that is already bookmarked with a different
 * colour repaints it and answers with the same id, which is what makes a
 * repaint a push rather than a delete and a re-save. Omitting `colour` leaves
 * whatever is there alone, so a plain save never strips an existing highlight.
 */
export const createBookmark = (
  canonical_ref: string,
  colour?: HighlightColour
): Promise<{ id: number }> =>
  authedFetch<{ id: number }>(meUrl("bookmarks/"), {
    method: "POST",
    body: JSON.stringify(colour ? { canonical_ref, colour } : { canonical_ref }),
  });

export const deleteBookmark = (id: number): Promise<void> =>
  authedFetch<void>(meUrl(`bookmarks/${id}/`), { method: "DELETE" });

export const getNotes = async (): Promise<Note[]> =>
  withRef(unwrap(await authedFetch<RawRow[] | { results: RawRow[] }>(meUrl("notes/")))).map(
    (r) => ({
      ...r,
      id: r.id as number,
      canonical_ref: r.canonical_ref as string,
      text_hi: (r.text_hi as string) || undefined,
      text: (r.text as string) ?? "",
    })
  );

export const createNote = (canonical_ref: string, text: string): Promise<{ id: number }> =>
  authedFetch<{ id: number }>(meUrl("notes/"), {
    method: "POST",
    body: JSON.stringify({ canonical_ref, text }),
  });

export const updateNote = (id: number, text: string): Promise<unknown> =>
  authedFetch(meUrl(`notes/${id}/`), {
    method: "PATCH",
    body: JSON.stringify({ text }),
  });

export const deleteNote = (id: number): Promise<void> =>
  authedFetch<void>(meUrl(`notes/${id}/`), { method: "DELETE" });

export const getProgress = async (): Promise<Progress[]> =>
  withRef(unwrap(await authedFetch<RawRow[] | { results: RawRow[] }>(meUrl("progress/")))).map(
    (r) => {
      const ref = r.canonical_ref as string;
      return {
        ...r,
        canonical_ref: ref,
        // canonical_ref format: "{code} {chapter}.{page}.{para}" (contract §5)
        book_code: (r.book_code as string) || ref.split(" ")[0] || "",
        book_title: (r.book_title as string) || undefined,
      };
    }
  );

export const upsertProgress = (canonical_ref: string): Promise<unknown> =>
  authedFetch(meUrl("progress/"), {
    method: "POST",
    body: JSON.stringify({ canonical_ref }),
  });

/**
 * Where the reader stopped in a **library file** — a recording or a video.
 *
 * The other address the endpoint takes (contract §6). A file has no
 * canonical_ref to be anchored to, so it is named by `target` and its position
 * is whole seconds rather than a paragraph sequence.
 *
 * This is what makes a playhead survive the device it was made on. Locally one
 * is written every few seconds against `library-file:<id>`, which is the same
 * id in a different dress; this carries it to the account, so a shivir begun on
 * a phone resumes on a laptop.
 */
export const upsertItemProgress = (
  itemId: number,
  positionSeconds: number
): Promise<unknown> =>
  authedFetch(meUrl("progress/"), {
    method: "POST",
    body: JSON.stringify({
      target: `item:${itemId}`,
      position: Math.max(0, Math.round(positionSeconds)),
    }),
  });

// ---- allauth headless (`app` client) ----

const ALLAUTH_BASE = "/_allauth/app/v1";

interface AllauthResponse {
  status: number;
  data?: { user?: MeUser };
  meta?: { session_token?: string };
  errors?: { message: string; param?: string }[];
}

async function allauth(
  path: string,
  method: string,
  body?: Record<string, string>
): Promise<AllauthResponse> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = sessionToken();
  if (token) headers["X-Session-Token"] = token;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${beOrigin()}${ALLAUTH_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: AllauthResponse;
  try {
    json = (await res.json()) as AllauthResponse;
  } catch {
    json = { status: res.status };
  }
  const out = { ...json, status: json.status ?? res.status };
  // A successful sign-up or sign-in hands back the token every later request
  // is authenticated by; nothing else in the app knows it exists.
  if (out.status === 200 && out.meta?.session_token) {
    setSessionToken(out.meta.session_token);
  }
  return out;
}

/**
 * Kept for the call site in AuthForm: with token auth there is no CSRF cookie
 * to prime, so this is now just an early liveness check on the BE. Harmless
 * and cheap — and it stops the first sign-in attempt from being the moment we
 * discover the API is unreachable.
 */
export const primeSession = (): Promise<AllauthResponse> =>
  allauth("/auth/session", "GET");

export const login = (email: string, password: string): Promise<AllauthResponse> =>
  allauth("/auth/login", "POST", { email, password });

export const signup = (email: string, password: string): Promise<AllauthResponse> =>
  allauth("/auth/signup", "POST", { email, password });

export async function logout(): Promise<AllauthResponse> {
  const res = await allauth("/auth/session", "DELETE");
  // Drop it whatever the server said. If the call failed the token is stale or
  // the network is down; either way the reader asked to be signed out on this
  // device and holding on to it would defy that.
  setSessionToken(null);
  return res;
}

/**
 * Change password with the old one — no email involved, which is why this is
 * the reader's only self-service recovery path until SMTP is configured.
 * A reader who has forgotten their password is reset by a manager.
 */
export const changePassword = (
  current_password: string,
  new_password: string
): Promise<AllauthResponse> =>
  allauth("/account/password/change", "POST", { current_password, new_password });

/**
 * Google sign-in — not wired for the alpha (no Google API project yet), so the
 * button that called this is hidden. The redirect flow needs allauth's
 * `browser` client because it is a full page round-trip, not a fetch.
 */
export function googleLoginUrl(callbackPath: string): string {
  const callback = `${window.location.origin}${callbackPath}`;
  return `${beOrigin()}/accounts/google/login/?process=login&next=${encodeURIComponent(callback)}`;
}

// Merge-on-login is not a special case any more — signing in just gives the
// local store somewhere to sync to, and the ordinary sync pass in
// lib/personal.ts pushes whatever was saved beforehand. See syncPersonal().
