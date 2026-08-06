// A five-deep memory of what has gone wrong lately, read by nothing except a
// bug report.
//
// Its own module rather than part of lib/feedback.ts because the two fetch
// wrappers write to it and lib/feedback.ts reads the API base from one of
// them — putting the buffer in either would make the pair import each other.
//
// A ring buffer, not a log: five entries is what fits on a triage screen, and
// the sixth would only push the useful one off the top.

const MAX_ERRORS = 5;

const recent: string[] = [];
let lastApiFailure = "";

/** Path only, never the query string — a search a reader ran is their business
 *  and has no place in a bug report about the screen it happened on. */
export function safePath(input: string): string {
  try {
    return new URL(input, "http://x").pathname;
  } catch {
    return "";
  }
}

export function recordClientError(what: string): void {
  const line = `${new Date().toISOString().slice(11, 19)} ${what}`.slice(0, 300);
  recent.push(line);
  if (recent.length > MAX_ERRORS) recent.shift();
}

/** Called from both fetch wrappers. Status and path, never the response body —
 *  the body of a failed /me/ call is the reader's own data. */
export function recordApiFailure(url: string, status: number): void {
  lastApiFailure = `${status} ${safePath(url)}`;
}

export function recentErrors(): string[] {
  return [...recent];
}

export function lastFailure(): string {
  return lastApiFailure;
}

/** Installed once, by FeedbackProvider. Returns its own uninstaller. */
export function watchClientErrors(): () => void {
  const onError = (e: ErrorEvent) =>
    recordClientError(`${e.message} @ ${safePath(e.filename ?? "")}:${e.lineno ?? 0}`);
  const onRejection = (e: PromiseRejectionEvent) =>
    recordClientError(`unhandled: ${String(e.reason).slice(0, 200)}`);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
