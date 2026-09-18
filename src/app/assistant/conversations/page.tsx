import type { Metadata } from "next";
import { ConversationsScreen } from "@/components/assistant/ConversationsScreen";

export const metadata: Metadata = { title: "Conversations · Assistant" };

export default function ConversationsPage() {
  return <ConversationsScreen />;
}
