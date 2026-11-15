import type { Metadata } from "next";
import type { ReactNode } from "react";

// A server layout only to carry the title: this segment's page is a client
// component and cannot export metadata, so the tab and history read the
// site-wide default (15 Nov 2026).
export const metadata: Metadata = { title: "Notifications" };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
