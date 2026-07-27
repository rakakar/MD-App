import { notFound, redirect } from "next/navigation";
import { ApiError, resolvePage } from "@/lib/api";

// Shareable page deep link (PRD §4): one resolver call on the server, then
// open the reader at that printed page.
export default async function PageDeepLink({
  params,
}: {
  params: Promise<{ code: string; n: string }>;
}) {
  const { code: rawCode, n } = await params;
  const code = decodeURIComponent(rawCode);
  const page = Number(n);
  if (!Number.isInteger(page)) notFound();

  let resolution;
  try {
    resolution = await resolvePage(code, page);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  redirect(
    `/books/${encodeURIComponent(code)}/${resolution.chapter_number}#p-${page}-0`
  );
}
