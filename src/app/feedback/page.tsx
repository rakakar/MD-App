"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { EmptyState, PageContainer, ctaPrimary } from "@/components/ui";
import { getMyFeedback, queuedFeedbackCount, type MyFeedback } from "@/lib/feedback";
import { refToHref } from "@/lib/refs";

/**
 * What happened to what you sent.
 *
 * This screen is the half of the feature that makes the other half keep
 * working. A reader who reports a broken line and never hears anything back
 * reports exactly once; one who watches it go from New to Fixed reports for
 * years. That is the whole argument for it existing.
 *
 * Only two things travel back from the team — the resolution note and replies
 * they marked public. Priority, assignee and the internal thread are not
 * hidden by this component; the API never sends them.
 */

const TONE: Record<string, string> = {
  new: "bg-ink/5 text-ink-soft",
  triaged: "bg-ink/5 text-ink-soft",
  in_progress: "bg-amber-100 text-amber-900",
  resolved: "bg-emerald-100 text-emerald-900",
  declined: "bg-ink/5 text-ink-soft",
  duplicate: "bg-ink/5 text-ink-soft",
};

export default function MyFeedbackPage() {
  const { user, loading } = useAuth();
  const { open } = useFeedback();
  const [rows, setRows] = useState<MyFeedback[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [queued, setQueued] = useState(0);

  useEffect(() => {
    if (loading || !user) return;
    setQueued(queuedFeedbackCount());
    getMyFeedback()
      .then(setRows)
      .catch(() => setFailed(true));
  }, [user, loading]);

  if (!loading && !user) {
    return (
      <PageContainer>
        <h1 className="font-display text-2xl font-medium">My feedback</h1>
        <div className="mt-4 rounded-2xl border border-rule bg-card p-4">
          <p className="text-sm text-ink-soft">Sign in to see what you&apos;ve sent us.</p>
          <Link
            href="/login?next=/feedback"
            className={`mt-3 ${ctaPrimary}`}
            style={{ background: "var(--ws-color)" }}
          >
            Sign in
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-2xl font-medium">My feedback</h1>
        <button
          type="button"
          onClick={() => open({ source: "my_feedback" })}
          className="min-h-11 text-sm font-semibold"
          style={{ color: "var(--ws-color)" }}
        >
          Send new
        </button>
      </div>

      {queued > 0 && (
        <p className="mt-3 rounded-xl bg-ink/5 px-3 py-2 text-xs text-ink-soft">
          {queued === 1 ? "One report is" : `${queued} reports are`} waiting to send — they&apos;ll
          go out on your next connection.
        </p>
      )}

      {failed && (
        <p className="mt-4 text-sm text-ink-soft">Couldn&apos;t load this just now.</p>
      )}

      {rows?.length === 0 && !failed && (
        <div className="mt-4">
          <EmptyState
            title="Nothing sent yet"
            hint="Spot a wrong word in a book, or something broken in the app? Select the passage and tap Report, or use Send feedback in your account menu."
          />
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {rows?.map((row) => (
          <li key={row.id} className="rounded-2xl border border-rule bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-ink-soft">
                {row.kind_label}
                {row.canonical_ref && (
                  <>
                    {" · "}
                    <Link href={refToHref(row.canonical_ref)} className="underline underline-offset-2">
                      {row.canonical_ref}
                    </Link>
                  </>
                )}
              </p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  TONE[row.status] ?? "bg-ink/5 text-ink-soft"
                }`}
              >
                {row.status_label}
              </span>
            </div>
            <p className="mt-1.5 text-sm">{row.message}</p>
            {row.resolution_note && (
              <p className="mt-2 border-s-2 border-rule ps-3 text-sm text-ink-soft">
                {row.resolution_note}
              </p>
            )}
            {row.replies.map((reply, i) => (
              <p key={i} className="mt-2 border-s-2 border-rule ps-3 text-sm text-ink-soft">
                {reply.text}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
