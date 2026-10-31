import type { Metadata } from "next";
import { DownloadsScreen } from "@/components/downloads/DownloadsScreen";

export const metadata: Metadata = { title: "Downloads", robots: { index: false } };

export default function DownloadsPage() {
  return <DownloadsScreen />;
}
