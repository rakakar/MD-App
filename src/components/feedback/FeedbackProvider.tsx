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
// The shell's sheet. Feedback can be sent from a chapter, but it is the app
// being written to rather than the book being read — and the reader's own
// paper on a form nobody is reading is a colour with no argument for it.
import { ctaPrimary } from "@/components/ui";
import { Sheet } from "@/components/ui/Sheet";
import { Dialog, useIsDesktop } from "@/components/ui/Dialog";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import { CloseIcon } from "@/components/shell/icons";
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
  const desktop = useIsDesktop();
  const { workspace } = useWorkspace();

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

  const placeholder =
    kind === "content"
      ? "What is wrong here?"
      : kind === "idea"
        ? "What would make this better?"
        : "What happened?";

  if (desktop) {
    return (
      <FeedbackDialog
        accent={workspace.color}
        title={title}
        onClose={onClose}
        signedIn={!!user}
        phase={phase}
        kind={kind}
        onKind={setKind}
        quoted={prefill.quoted_text ? { ref: prefill.canonical_ref, text: prefill.quoted_text } : null}
        message={message}
        onMessage={setMessage}
        placeholder={placeholder}
        suggested={suggested}
        onSuggested={setSuggested}
        error={error}
        screenshot={screenshot}
        onPickScreenshot={() => fileRef.current?.click()}
        fileInput={
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pickScreenshot(e.target.files?.[0] ?? null)}
          />
        }
        onSubmit={() => void submit()}
      />
    );
  }

  return (
    <Sheet open onClose={onClose} title={title}>
      {/* `pt-3` because the sheet's own body wrapper has no top padding — it
          leaves that to whatever it is given, and this was giving none, so the
          Correction/Bug/Idea/Other chips sat flat against the header's rule at
          a measured 0px. The same 12px the reader's Contents sheet puts above
          its tab row, which is the same shape: a row of controls directly
          under a sheet header. (Display gets away with `pt-1` because it opens
          on a heading, and a heading brings its own leading with it.) */}
      <div className="px-5 pb-5 pt-3">
        {!user ? (
          <div className="py-2">
            <p className="text-sm text-(--reader-ink-soft)">
              Sign in to send feedback — it&apos;s how we can tell you what happened to it.
            </p>
            <Link
              href="/login?next=/me"
              onClick={onClose}
              className={`mt-3 ${ctaPrimary}`}
              style={{ background: "var(--ws-color)" }}
            >
              Sign in
            </Link>
          </div>
        ) : phase === "sent" || phase === "queued" ? (
          <p className="pb-6 pt-3 text-center text-sm">
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
              placeholder={placeholder}
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
                // Greyed out until there is something to send, as on desktop.
                disabled={phase === "sending" || message.trim().length === 0}
                className={ctaPrimary}
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

/**
 * **Send feedback on a desktop** (designer's comp, 7 Oct 2026): a dialog in
 * the middle of the window instead of a sheet from its floor. The same form
 * and the same state as the sheet — kind, message, the correction's
 * suggested text, a screenshot — laid out for a pointer: the four kinds as one
 * segmented control, a taller box to write in, and the privacy line, Cancel
 * and Send together in a footer. ⌘↵ sends, as the button says.
 */
function FeedbackDialog({
  accent,
  title,
  onClose,
  signedIn,
  phase,
  kind,
  onKind,
  quoted,
  message,
  onMessage,
  placeholder,
  suggested,
  onSuggested,
  error,
  screenshot,
  onPickScreenshot,
  fileInput,
  onSubmit,
}: {
  accent: string;
  title: string;
  onClose: () => void;
  signedIn: boolean;
  phase: Phase;
  kind: FeedbackKind;
  onKind: (k: FeedbackKind) => void;
  quoted: { ref?: string; text: string } | null;
  message: string;
  onMessage: (v: string) => void;
  placeholder: string;
  suggested: string;
  onSuggested: (v: string) => void;
  error: string;
  screenshot: File | null;
  onPickScreenshot: () => void;
  fileInput: ReactNode;
  onSubmit: () => void;
}) {
  const field =
    "w-full resize-y rounded-control border border-rule bg-card px-3.5 py-3 text-sm text-ink outline-none transition-[box-shadow,border-color] placeholder:text-ink-soft focus:border-(--ws-color) focus:ring-3 focus:ring-(--ws-color)/15";
  const done = phase === "sent" || phase === "queued";

  return (
    <Dialog open onClose={onClose} label={title} accent={accent} className="flex w-full max-w-lg flex-col">
      <div className="flex items-center justify-between px-6 pb-4 pt-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-me-2 flex h-9 w-9 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <CloseIcon className="h-4.5 w-4.5" />
        </button>
      </div>

      {!signedIn ? (
        <div className="px-6 pb-6">
          <p className="text-sm text-ink-soft">
            Sign in to send feedback — it&apos;s how we can tell you what happened to it.
          </p>
          <Link
            href="/login?next=/me"
            onClick={onClose}
            className={`mt-4 ${ctaPrimary}`}
            style={{ background: "var(--ws-color)" }}
          >
            Sign in
          </Link>
        </div>
      ) : done ? (
        <p className="px-6 pb-10 pt-4 text-center text-sm">
          {phase === "sent" ? "Thank you — we've got it." : "Saved. It'll send itself when you're back online."}
        </p>
      ) : (
        <>
          <div className="px-6 pb-5">
            <div role="radiogroup" aria-label="Kind of feedback" className="flex gap-1 rounded-control border border-rule bg-inset p-1">
              {FEEDBACK_KINDS.map((k) => {
                const active = k.value === kind;
                return (
                  <button
                    key={k.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onKind(k.value)}
                    title={k.hint}
                    className={`min-h-9 flex-1 rounded-md border text-sm transition-colors ${
                      active ? "border-rule bg-card font-semibold shadow-sm" : "border-transparent text-ink hover:bg-ink/5"
                    }`}
                    style={active ? { color: "var(--ws-ink)" } : undefined}
                  >
                    {k.label}
                  </button>
                );
              })}
            </div>

            {quoted && (
              <div className="mt-4 rounded-control border border-rule px-3.5 py-2.5">
                <p className="text-xs text-ink-soft">{quoted.ref || "Selected passage"}</p>
                <p lang="hi" className="hi mt-0.5 line-clamp-3 text-sm">{quoted.text}</p>
              </div>
            )}

            <textarea
              autoFocus
              value={message}
              onChange={(e) => onMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              maxLength={2000}
              rows={6}
              placeholder={placeholder}
              className={`mt-4 ${field}`}
            />

            {kind === "content" && (
              <textarea
                value={suggested}
                onChange={(e) => onSuggested(e.target.value)}
                maxLength={4000}
                rows={2}
                placeholder="What should it say? (optional)"
                className={`mt-2 ${field}`}
              />
            )}

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            {fileInput}
            <button
              type="button"
              onClick={onPickScreenshot}
              className="mt-4 inline-flex min-h-9 max-w-full items-center gap-2 rounded-control border border-dashed border-rule px-3.5 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
            >
              <PaperclipIcon className="h-4 w-4 shrink-0 text-ink-soft" />
              <span className="truncate">{screenshot ? screenshot.name : "Add screenshot"}</span>
            </button>
          </div>

          <div className="flex items-center gap-4 border-t border-rule bg-inset px-6 py-4">
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-ink-soft">
              We also attach the screen you were on, your app version and device — never your
              notes, bookmarks or reading history.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="h-10 shrink-0 rounded-control border border-rule bg-card px-4 text-sm font-semibold transition-colors hover:bg-ink/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={phase === "sending" || message.trim().length === 0}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-control px-4 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: "var(--ws-color)" }}
            >
              {phase === "sending" ? "Sending…" : "Send"}
              {phase !== "sending" && (
                <kbd className="rounded border border-white/40 px-1 py-px font-sans text-xs font-medium">⌘↵</kbd>
              )}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}

function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M21 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l7.9-7.9" />
    </svg>
  );
}
