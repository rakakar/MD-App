import { notFound, redirect } from "next/navigation";
import { ApiError, resolvePara } from "@/lib/api";
import { parseRef } from "@/lib/refs";

// Paragraph deep link: resolves a canonical_ref (contract §2.5) and opens
// the reader at that paragraph. Also the landing route for front-matter
// refs ("MVD fm.iii.2"), whose chapter number isn't derivable locally.
export default async function ParaDeepLink({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref: raw } = await params;
  const ref = decodeURIComponent(raw);

  let para;
  try {
    para = await resolvePara(ref);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const parsed = parseRef(ref);
  const pageKey = para.page_label || parsed?.page || String(para.page_number);
  redirect(
    `/books/${encodeURIComponent(para.book_code)}/${para.chapter_number}#p-${pageKey}-${para.para_number}`
  );
}
