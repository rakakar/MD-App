import type { Metadata } from "next";
import type { ReactNode } from "react";

// A server layout only to carry the title, as /me/path does.
export const metadata: Metadata = { title: "History" };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
