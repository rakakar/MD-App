"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import { ctaPrimary } from "@/components/ui";
import type { ChatAnswer, SharedAnswer } from "@/lib/types";
import { IntentScope, QueryBubble } from "./parts";
import { ResearchAnswer } from "./ResearchAnswer";

/**
 * The shared answer, drawn exactly as the asker saw it — the same component,
 * given the stored answer, so it never asks anything and costs nothing.
 *
 * Two things a shared page adds: Save as PDF (the browser's own print, with
 * the app's chrome left off the page — see globals.css), and a way for the
 * person it was sent to to ask their own question, which is where an account
 * comes in.
 */
export function SharedAnswerView({ answer }: { answer: SharedAnswer }) {
  const router = useRouter();
  const { user } = useAuth();
  const path = `/a/${answer.code}`;
  // The full address, for the foot of the printed page. Known only in the
  // browser, so it arrives after the first render and the server's HTML and
  // the client's agree.
  const [address, setAddress] = useState(path);
  useEffect(() => setAddress(`${window.location.origin}${path}`), [path]);
  const ask = user ? "/assistant" : `/signup?next=${encodeURIComponent("/assistant")}`;
  const stored: ChatAnswer = { ...answer, id: 0, feedback: null };

  return (
    <AppAccent>
      <div className="print-page mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6">
        <p className="text-sm text-ink-soft print:hidden">
          Shared from the Assistant · answered from the books of Madhyasth Darshan
        </p>
        <p className="hidden text-sm print:block">
          MD Study · Assistant — {answer.mode === "deep" ? "Deep research" : "Research"}
        </p>

        <div className="mt-6 flex flex-col gap-5">
          <QueryBubble>{answer.query}</QueryBubble>
          <IntentScope intent="research">
            <ResearchAnswer
              turnId={`shared-${answer.code}`}
              query={answer.query}
              stored={stored}
              books={answer.books}
              deep={answer.mode === "deep"}
              shareUrl={path}
              readOnly
              dictionary={null}
              saved={false}
              onToggleSaved={() => {}}
              onAsk={(q, intent) =>
                router.push(`/assistant?q=${encodeURIComponent(q)}${intent ? `&mode=${intent}` : ""}`)
              }
              onSettle={() => {}}
              onQuota={() => {}}
            />
          </IntentScope>
        </div>

        <div className="mt-8 flex flex-col gap-3 print:hidden sm:flex-row">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex min-h-12 flex-1 items-center justify-center rounded-control border border-rule bg-card px-4 text-title font-semibold"
          >
            Save as PDF
          </button>
          <Link
            href={ask}
            className={`${ctaPrimary} min-h-12 flex-1 justify-center text-title`}
            style={{ background: "var(--color-accent-deep)" }}
          >
            Ask your own question
          </Link>
        </div>
        <p className="mt-3 text-center text-xs text-ink-soft print:hidden">
          {user
            ? "Research and Deep research answer from the books, with every source cited."
            : "Free. Sign in to ask Research and Deep research questions of your own."}
        </p>
        <p className="hidden pt-6 text-xs print:block">{address}</p>
      </div>
    </AppAccent>
  );
}
