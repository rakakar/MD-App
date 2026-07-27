import Link from "next/link";
import type { BookSummary } from "@/lib/types";

export function PageContainer({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`mx-auto w-full ${wide ? "max-w-5xl" : "max-w-3xl"} px-4 py-5 sm:px-6`}>
      {children}
    </div>
  );
}

export function SectionHeading({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 mt-8 flex items-baseline justify-between first:mt-0">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function BookCard({ book }: { book: BookSummary }) {
  return (
    <Link
      href={`/books/${encodeURIComponent(book.code)}`}
      className="group flex gap-4 rounded-2xl border border-rule bg-white p-4 transition-shadow hover:shadow-md"
    >
      {book.cover_image ? (
        // covers come from the BE media host; plain img keeps it simple and
        // avoids configuring remote patterns for an evolving host
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.cover_image}
          alt=""
          className="h-24 w-16 shrink-0 rounded-md object-cover shadow-sm"
          loading="lazy"
        />
      ) : (
        <div
          className="flex h-24 w-16 shrink-0 items-center justify-center rounded-md text-white shadow-sm"
          style={{ background: "var(--ws-color)" }}
          aria-hidden
        >
          <span className="hi text-lg font-bold">{book.title_hi?.[0] ?? "ग्र"}</span>
        </div>
      )}
      <div className="min-w-0">
        <h3 lang="hi" className="hi text-base font-semibold leading-snug group-hover:underline">
          {book.title_hi}
        </h3>
        {book.subtitle_hi && (
          <p lang="hi" className="hi mt-0.5 truncate text-sm text-ink-soft">
            {book.subtitle_hi}
          </p>
        )}
        <p className="mt-1 text-xs text-ink-soft">
          {book.author}
          {book.publication_year ? ` · ${book.publication_year}` : ""}
          {book.page_count ? ` · ${book.page_count} pages` : ""}
        </p>
      </div>
    </Link>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-rule bg-white/50 p-8 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-white p-8 text-center">
      <p className="text-sm font-medium text-ink">Couldn&apos;t load this right now.</p>
      <p className="mt-1 text-xs text-ink-soft">
        {message ?? "Check your connection and try again."}
      </p>
    </div>
  );
}
