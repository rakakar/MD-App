import type { Metadata } from "next";
import { Suspense } from "react";
import { AssistantScreen } from "@/components/assistant/AssistantScreen";

export const metadata: Metadata = {
  title: "Assistant",
  description:
    "Look up a word in Paribhasha, find a phrase in the books, ask a question answered from cited passages, or go anywhere in the app.",
};

export default function AssistantPage() {
  return (
    <Suspense>
      <AssistantScreen />
    </Suspense>
  );
}
