/**
 * How a chapter is named on a card that is not the reader.
 *
 * "Chapter 5 · <name>" — unless the name is itself a numbered chapter heading,
 * as MVD's TOC entries are ("अध्याय - पाँच निर्भ्रमता ही विश्राम"), where
 * prefixing it numbers the chapter twice. There the printed heading, which is
 * the manager's own words, stands on its own.
 *
 * Shared by the two resume rails rather than written twice: they now show the
 * same kind of card for two kinds of reading, and a chapter that reads one way
 * on Home and another on the Library tab is the sort of drift nobody notices
 * until both are wrong.
 */
export function chapterLine(chapter: string, title: string | null): string {
  if (!title) return `Chapter ${chapter}`;
  return /^अध्याय/.test(title.trim()) ? title : `Chapter ${chapter} · ${title}`;
}
