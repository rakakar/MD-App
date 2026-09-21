import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharedAnswerView } from "@/components/assistant/SharedAnswerView";
import { firstSentence } from "@/lib/assistant/answer";
import { getSharedAnswer } from "@/lib/api";

// A stored answer does not change; a manager taking a link down is the only
// update, and a day is an acceptable lag for that (contract §9.3).
export const revalidate = 86400;

interface Params {
  code: string;
}

async function load(params: Promise<Params>) {
  const { code } = await params;
  return getSharedAnswer(code).catch(() => null);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const answer = await load(params);
  if (!answer) return { title: "Shared answer", robots: { index: false } };
  const description = firstSentence(answer.answer);
  return {
    title: `${answer.query.slice(0, 90)} · Assistant`,
    description,
    // Readable by anyone with the link, but not listed by search engines yet:
    // an AI answer in a search result reads as the darshan's own position,
    // so that waits until answer quality has been measured. One line to flip.
    robots: { index: false, follow: false },
    openGraph: { title: answer.query.slice(0, 120), description, type: "article" },
  };
}

/**
 * A Research or Deep research answer someone shared (contract §9.3). Open to
 * anyone, no account: the project is open, and reading a stored answer costs
 * nothing. Server-rendered, so the question and the answer are in the HTML a
 * messaging app reads for its preview.
 */
export default async function SharedAnswerPage({ params }: { params: Promise<Params> }) {
  const answer = await load(params);
  if (!answer) notFound();
  return <SharedAnswerView answer={answer} />;
}
