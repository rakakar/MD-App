// Session-authenticated personal API (/api/v1/me/, contract §6) and
// django-allauth headless auth flows. All requests carry the shared-parent-
// domain session cookie (PRD §1) — credentials: "include" everywhere.

import { apiBase } from "./api";
import type { Bookmark, MeUser, Note, Progress } from "./types";

function beOrigin(): string {
  return new URL(apiBase()).origin;
}

function csrfToken(): string | null {
  if (typeof document === "undefined") return null;
  return (
    document.cookie
      .split("; ")
      .find((c) => c.startsWith("csrftoken="))
      ?.split("=")[1] ?? null
  );
}

async function authedFetch<T>(
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (init.method && init.method !== "GET") {
    const csrf = csrfToken();
    if (csrf) headers["X-CSRFToken"] = csrf;
    if (init.body) headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, { ...init, headers, credentials: "include" });
  if (!res.ok) {
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
  try {
    return await authedFetch<MeUser>(meUrl(""));
  } catch {
    return null; // 401/403 → signed out
  }
}

export const getBookmarks = async (): Promise<Bookmark[]> =>
  withRef(unwrap(await authedFetch<RawRow[] | { results: RawRow[] }>(meUrl("bookmarks/")))).map(
    (r) => ({
      ...r,
      id: r.id as number,
      canonical_ref: r.canonical_ref as string,
      text_hi: (r.text_hi as string) || undefined,
    })
  );

export const createBookmark = (canonical_ref: string): Promise<{ id: number }> =>
  authedFetch<{ id: number }>(meUrl("bookmarks/"), {
    method: "POST",
    body: JSON.stringify({ canonical_ref }),
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

// ---- allauth headless ----

const ALLAUTH_BASE = "/_allauth/browser/v1";

interface AllauthResponse {
  status: number;
  data?: { user?: MeUser };
  errors?: { message: string; param?: string }[];
}

async function allauth(
  path: string,
  method: string,
  body?: Record<string, string>
): Promise<AllauthResponse> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const csrf = csrfToken();
  if (csrf) headers["X-CSRFToken"] = csrf;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${beOrigin()}${ALLAUTH_BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: AllauthResponse;
  try {
    json = (await res.json()) as AllauthResponse;
  } catch {
    json = { status: res.status };
  }
  return { ...json, status: json.status ?? res.status };
}

/** Prime the CSRF cookie before the first mutation (Django sets it on GET). */
export const primeSession = (): Promise<AllauthResponse> =>
  allauth("/auth/session", "GET");

export const login = (email: string, password: string): Promise<AllauthResponse> =>
  allauth("/auth/login", "POST", { email, password });

export const signup = (email: string, password: string): Promise<AllauthResponse> =>
  allauth("/auth/signup", "POST", { email, password });

export const logout = (): Promise<AllauthResponse> =>
  allauth("/auth/session", "DELETE");

/** Google sign-in: allauth's provider redirect flow (server round-trip). */
export function googleLoginUrl(callbackPath: string): string {
  const callback = `${window.location.origin}${callbackPath}`;
  return `${beOrigin()}/accounts/google/login/?process=login&next=${encodeURIComponent(callback)}`;
}

// Merge-on-login is not a special case any more — signing in just gives the
// local store somewhere to sync to, and the ordinary sync pass in
// lib/personal.ts pushes whatever was saved beforehand. See syncPersonal().
