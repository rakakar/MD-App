"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Sheet } from "@/components/reader/Sheet";
import { track } from "@/lib/analytics";
import { watchClientErrors } from "@/lib/clientErrors";
import {
  collectContext,
  FEEDBACK_KINDS,
  flushFeedbackQueue,
  MAX_SCREENSHOT_BYTES,
  sendFeedback,
  type FeedbackKind,
} from "@/lib/feedback";

/** What a caller already knows that the reader should not have to retype. */
export interface FeedbackPrefill {
  kind?: FeedbackKind;
  canonical_ref?: string;
  quoted_text?: string;
  /** where the report was raised from — for the analytics event, not the row */
  source?: string;
}

interface FeedbackApi {
  open: (prefill?: FeedbackPrefill) => void;
}

const FeedbackContext = createContext<FeedbackApi>({ open: () => {} });

/** Anywhere in the app: `const { open } = useFeedback()`. */
export function useFeedback(): FeedbackApi {
  return useContext(FeedbackContext);
}

/**
 * One sheet, mounted once, opened from four places — the reader's selection
 * bar, the account menu, the error screen and the offline screen.
 *
 * Mounted at the shell rather than per-screen for the reason the error screen
 * exists at all: the moment a reader most wants to report something is the
 * moment a route has just failed to render, and a sheet that lives inside a
 * route cannot open then.
 *
 * It adds no chrome. Nothing here paints anything until `open()` is called.
 */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [prefill, setPrefill] = useState<FeedbackPrefill | null>(null);

  const open = useCallback((next: FeedbackPrefill = {}) => {
    track("feedback_open", { source: next.source ?? "menu", kind: next.kind ?? "none" });
    setPrefill(next);
  }, []);

  const api = useMemo(() => ({ open }), [open]);

  // The error buffer has to be filling long before anyone opens the sheet —
  // by the time a reader decides to report a bug, the error that caused it has
  // already happened.
  useEffect(() => watchClientErrors(), []);

  // Anything written while offline goes out on reconnect, and on cold start
  // for the reader who closed the tab before the network returned.
  useEffect(() => {
    void flushFeedbackQueue();
    const onOnline = () => void flushFeedbackQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <FeedbackSheet prefill={prefill} onClose={() => setPrefill(null)} />
    </FeedbackContext.Provider>
  );
}

type Phase = "form" | "sending" | "sent" | "queued";

function FeedbackSheet({
  prefill,
  onClose,
}: {
  prefill: FeedbackPrefill | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [suggested, setSuggested] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const fileRef = useRef<HTMLInputElement>(null);

  const openedFrom = prefill?.source ?? "menu";

  // Every open is a fresh sheet. A half-written bug report is not something to
  // resurrect three screens later next to a passage it has nothing to do with.
  useEffect(() => {
    if (!prefill) return;
    setKind(prefill.kind ?? "bug");
    setMessage("");
    setSuggested("");
    setScreenshot(null);
    setError("");
    setPhase("form");
  }, [prefill]);

  const pickScreenshot = (file: File | null) => {
    if (file && file.size > MAX_SCREENSHOT_BYTES) {
      setError("That image is over 5 MB. Try a screenshot rather than a photo.");
      return;
    }
    setError("");
    setScreenshot(file);
  };

  const submit = async () => {
    const text = message.trim();
    if (text.length < 3) {
      setError("Tell us a little more — a few words is enough.");
      return;
    }
    setPhase("sending");
    setError("");
    try {
      const result = await sendFeedback(
        {
          kind,
          message: text,
          quoted_text: prefill?.quoted_text,
          suggested_text: suggested.trim() || undefined,
          canonical_ref: prefill?.canonical_ref,
        },
        collectContext(),
        screenshot
      );
      track("feedback_submit", { kind, source: openedFrom, queued: result === "queued" ? 1 : 0 });
      setPhase(result === "queued" ? "queued" : "sent");
      // Long enough to read the confirmation, short enough that nobody has to
      // dismiss it before getting back to the page they were on.
      window.setTimeout(onClose, 1800);
    } catch (e) {
      const status = (e as { status?: number }).status;
      setPhase("form");
      setError(
        status === 429
          ? "That's a lot of feedback today — thank you. Try again tomorrow."
          : "Couldn't send that. Try once more."
      );
    }
  };

  if (!prefill) return null;

  const title =
    kind === "content" ? "Report a correction" : "Send feedback";

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="px-5 pb-5">
        {!user ? (
          <div className="py-2">
            <p className="text-sm text-(--reader-ink-soft)">
              Sign in to send feedback — it&apos;s how we can tell you what happened to it.
            </p>
            <Link
              href="/login?next=/me"
              onClick={onClose}
              className="mt-3 inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold text-white"
              style={{ background: "var(--ws-color)" }}
            >
              Sign in
            </Link>
          </div>
        ) : phase === "sent" || phase === "queued" ? (
          <p className="py-6 text-center text-sm">
            {phase === "sent"
              ? "Thank you — we've got it."
              : "Saved. It'll send itself when you're back online."}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_KINDS.map((k) => {
                const active = k.value === kind;
                return (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKind(k.value)}
                    aria-pressed={active}
                    title={k.hint}
                    className="min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors"
                    style={
                      active
                        ? { background: "var(--ws-color)", borderColor: "var(--ws-color)", color: "#fff" }
                        : { borderColor: "var(--reader-rule)" }
                    }
                  >
                    {k.label}
                  </button>
                );
              })}
            </div>

            {prefill.quoted_text && (
              <div className="mt-3 rounded-xl border border-(--reader-rule) px-3 py-2">
                <p className="text-[11px] text-(--reader-ink-soft)">
                  {prefill.canonical_ref || "Selected passage"}
                </p>
                <p className="mt-0.5 line-clamp-3 text-sm">{prefill.quoted_text}</p>
              </div>
            )}

            <textarea
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder={
                kind === "content"
                  ? "What is wrong here?"
                  : kind === "idea"
                    ? "What would make this better?"
                    : "What happened?"
              }
              className="mt-3 w-full rounded-xl border border-(--reader-rule) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--ws-color)"
            />

            {kind === "content" && (
              <textarea
                value={suggested}
                onChange={(e) => setSuggested(e.target.value)}
                maxLength={4000}
                rows={2}
                placeholder="What should it say? (optional)"
                className="mt-2 w-full rounded-xl border border-(--reader-rule) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--ws-color)"
              />
            )}

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => pickScreenshot(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="min-h-11 text-sm text-(--reader-ink-soft) underline underline-offset-4"
                >
                  {screenshot ? `📎 ${screenshot.name.slice(0, 24)}` : "📎 Add screenshot"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={phase === "sending"}
                className="min-h-11 rounded-full px-6 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "var(--ws-color)" }}
              >
                {phase === "sending" ? "Sending…" : "Send"}
              </button>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-(--reader-ink-soft)">
              We also attach the screen you were on, your app version and device — never your
              notes, bookmarks or reading history.
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}
