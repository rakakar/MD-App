import type { Metadata } from "next";
import type { ReactNode } from "react";

// A server layout only to carry the title: this segment's page is a client
// component and cannot export metadata, so the tab and history read the
// site-wide default (15 Nov 2026).
// The template is restated, not inherited: a layout that sets its own title
// ends the root's template for everything beneath it, so /me/notes came out
// as a bare "Notes".
export const metadata: Metadata = { title: { default: "My Journey", template: "%s · MD Study" } };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
