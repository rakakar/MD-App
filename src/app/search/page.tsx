import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchScreen } from "@/components/search/SearchScreen";

export const metadata: Metadata = {
  title: "Search",
  description: "Search across published books, audio and videos.",
};

export default function SearchPage() {
  return (
    <Suspense>
      <SearchScreen />
    </Suspense>
  );
}
