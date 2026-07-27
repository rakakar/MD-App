// Session-authenticated personal API (/api/v1/me/, contract §6) and
// django-allauth headless auth flows. All requests carry the shared-parent-
// domain session cookie (PRD §1) — credentials: "include" everywhere.

import { apiBase } from "./api";
import {
  clearGuestStore,
  getGuestStore,
} from "./storage";
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

// ---- /me/ trio ----
// The live serializers expose the anchor as a read-only `target` string;
// normalise every row to `canonical_ref` and send both keys on writes so
// the client keeps working whichever name the write serializer accepts.

type RawRow = Record<string, unknown>;

function anchorOf(row: RawRow): string {
  return (row.canonical_ref as string) ?? (row.target as string) ?? "";
}

export async function getMe(): Promise<MeUser | null> {
  try {
    return await authedFetch<MeUser>(meUrl(""));
  } catch {
    return null; // 401/403 → guest
  }
}

export const getBookmarks = async (): Promise<Bookmark[]> =>
  unwrap(await authedFetch<RawRow[] | { results: RawRow[] }>(meUrl("bookmarks/"))).map(
    (r) => ({ ...r, id: r.id as number, canonical_ref: anchorOf(r) })
  );

export const createBookmark = (canonical_ref: string): Promise<unknown> =>
  authedFetch(meUrl("bookmarks/"), {
    method: "POST",
    body: JSON.stringify({ canonical_ref, target: canonical_ref }),
  });

export const deleteBookmark = (id: number): Promise<void> =>
  authedFetch<void>(meUrl(`bookmarks/${id}/`), { method: "DELETE" });

export const getNotes = async (): Promise<Note[]> =>
  unwrap(await authedFetch<RawRow[] | { results: RawRow[] }>(meUrl("notes/"))).map(
    (r) => ({
      ...r,
      id: r.id as number,
      canonical_ref: anchorOf(r),
      text: (r.text as string) ?? "",
    })
  );

export const createNote = (canonical_ref: string, text: string): Promise<unknown> =>
  authedFetch(meUrl("notes/"), {
    method: "POST",
    body: JSON.stringify({ canonical_ref, target: canonical_ref, text }),
  });

export const deleteNote = (id: number): Promise<void> =>
  authedFetch<void>(meUrl(`notes/${id}/`), { method: "DELETE" });

export const getProgress = async (): Promise<Progress[]> =>
  unwrap(await authedFetch<RawRow[] | { results: RawRow[] }>(meUrl("progress/"))).map(
    (r) => {
      const ref = anchorOf(r);
      return {
        ...r,
        canonical_ref: ref,
        // canonical_ref format: "{code} {chapter}.{page}.{para}" (contract §5)
        book_code: (r.book_code as string) ?? ref.split(" ")[0] ?? "",
      };
    }
  );

export const upsertProgress = (book_code: string, canonical_ref: string): Promise<unknown> =>
  authedFetch(meUrl("progress/"), {
    method: "POST",
    body: JSON.stringify({ book_code, canonical_ref, target: canonical_ref }),
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

// ---- guest → account merge (PRD §9: union by canonical_ref, server wins,
// then clear local) ----

export async function mergeGuestData(): Promise<void> {
  const store = getGuestStore();
  const hasData =
    store.bookmarks.length > 0 ||
    store.notes.length > 0 ||
    Object.keys(store.progress).length > 0;
  if (!hasData) return;

  const [serverBookmarks, serverNotes, serverProgress] = await Promise.all([
    getBookmarks().catch(() => [] as Bookmark[]),
    getNotes().catch(() => [] as Note[]),
    getProgress().catch(() => [] as Progress[]),
  ]);

  const bookmarkRefs = new Set(serverBookmarks.map((b) => b.canonical_ref));
  const noteRefs = new Set(serverNotes.map((n) => n.canonical_ref));
  const progressBooks = new Set(serverProgress.map((p) => p.book_code));

  const ops: Promise<unknown>[] = [];
  for (const b of store.bookmarks) {
    if (!bookmarkRefs.has(b.canonical_ref)) {
      ops.push(createBookmark(b.canonical_ref).catch(() => undefined));
    }
  }
  for (const n of store.notes) {
    // server wins on conflict — only push notes the server doesn't have
    if (!noteRefs.has(n.canonical_ref)) {
      ops.push(createNote(n.canonical_ref, n.text).catch(() => undefined));
    }
  }
  for (const p of Object.values(store.progress)) {
    if (!progressBooks.has(p.book_code)) {
      ops.push(upsertProgress(p.book_code, p.canonical_ref).catch(() => undefined));
    }
  }
  await Promise.all(ops);
  clearGuestStore();
}
