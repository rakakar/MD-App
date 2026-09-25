import type { PaintedSegment } from "@/lib/highlights";
import {
  formatRuns,
  formatSegments,
  parseRich,
  type FormattedSegment,
  type RichRun,
} from "@/lib/richText";
import type { HighlightColour } from "@/lib/storage";
import type { Paragraph } from "@/lib/types";

// Block rendering exactly per contract §3.1. Respect align + indent_level
// everywhere; markers print before list/verse text.

const ALIGN: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

function indentStyle(level: number): React.CSSProperties | undefined {
  return level > 0 ? { paddingInlineStart: `${level * 1.5}rem` } : undefined;
}

/**
 * `data-not-text` says this is drawn inside the paragraph but is not part of
 * its `text_hi` — so the offsets a highlight is stored at must not count it.
 * See `lib/highlights.ts`; the marker is the reason list items would otherwise
 * paint a few characters off.
 */
function Marker({ marker }: { marker: string }) {
  if (!marker) return null;
  return (
    <span data-not-text className="reader-marker me-2 font-semibold text-(--reader-ink-soft)">
      {marker}
    </span>
  );
}

/** The three fills, written out — `bg-hl-${c}` is a class Tailwind's scanner
 *  cannot see, and one it cannot see is one it does not emit. */
const HL: Record<HighlightColour, string> = {
  amber: "bg-hl-amber",
  sage: "bg-hl-sage",
  sky: "bg-hl-sky",
};

/**
 * Book text, with Paribhasha headwords marked when the reader has asked for it.
 *
 * Rendered as React nodes, never as HTML — book text can never inject markup,
 * the same rule the search snippet highlighter follows.
 *
 * The marks are plain spans: no `role="button"`, no tab stop. A fifth of the
 * words on a page carry a definition, so announcing each of them as a button
 * would make the chapter unlistenable and untabbable. The tap is picked up by
 * one delegated handler on the content root, and readers using a keyboard or
 * a screen reader reach the same definitions by selecting the word, which is
 * how the bookmark / note / copy actions already work.
 *
 * A run can carry both marks at once — a highlight can start mid-word and a
 * headword can be half painted — so the fill goes on the outside and the
 * headword span stays exactly as it was, which is what the delegated tap
 * handler looks for.
 */
function Text({
  text,
  rich,
  segments,
}: {
  text: string;
  rich?: string;
  segments?: PaintedSegment[] | null;
}) {
  const formatted = formatSegments(text, segments ?? null, formatRuns(text, rich));
  if (!formatted) return <>{text}</>;
  return <Runs runs={formatted} />;
}

function Runs({ runs }: { runs: FormattedSegment[] }) {
  return (
    <>
      {runs.map((s, i) => {
        const word = s.word ? (
          <span data-paribhasha={s.word} className="paribhasha-word">
            {s.text}
          </span>
        ) : (
          s.text
        );
        const inner = <Styled b={s.b} i={s.i}>{word}</Styled>;
        if (!s.hl) return <span key={i}>{inner}</span>;
        return (
          <mark key={i} className={`${HL[s.hl]} text-inherit`}>
            {inner}
          </mark>
        );
      })}
    </>
  );
}

/**
 * The book's own bold and italic (contract §3.3). Inside the highlight, outside
 * the headword span — which stays exactly what the delegated tap handler looks
 * for. Neither element adds characters, so highlight offsets are unaffected.
 */
function Styled({ b, i, children }: { b?: boolean; i?: boolean; children: React.ReactNode }) {
  let out = children;
  if (i) out = <i className="italic">{out}</i>;
  if (b) out = <b className="font-bold">{out}</b>;
  return <>{out}</>;
}

/** Book text with its printed formatting and nothing else — for surfaces
 *  outside the reader, like the Sutra card. */
export function FormattedText({ text, rich }: { text: string; rich?: string }) {
  return <Text text={text} rich={rich} />;
}

/** Formatted text with no highlight or headword layer — a table cell, whose
 *  text is its own (there is no text_hi to measure it against). */
function RichCell({ rich }: { rich: string }) {
  const runs: RichRun[] = parseRich(rich);
  return (
    <>
      {runs.map((r, k) => (
        <Styled key={k} b={r.b} i={r.i}>
          {r.text}
        </Styled>
      ))}
    </>
  );
}

/**
 * A row of a printed contents page.
 *
 * The extractor writes a contents table as one block per row with its cells
 * joined by " | " (the BE's "rule 8" — its own proofread screen draws them as
 * columns). Printed as-is the pipe read as a stray mark, the page numbers
 * never lined up, and a long title pushed its "| 25" onto a line of its own.
 *
 * Only a row whose last cell is a page number or range ("16", "1-3") counts,
 * or a header whose last cell is the page column's own label (पृष्ठ…, पृ.क्र.).
 * Anything else with a pipe in it — a flattened data table in a chapter —
 * stays exactly as it was.
 *
 * `lead` is a separator the row *starts* with. A contents page printed as
 * number | title | page had its number lifted into `marker` and the pipe after
 * it left behind — "| मौलिक अधिकार | 74" — in 8 of the 13 books with a
 * contents page (91 rows).
 */
const TOC_SEP = " | ";
const TOC_LEAD = /^\s*\|\s*/;
const TOC_PAGE = /^[0-9०-९]{1,4}(?:\s*[-–]\s*[0-9०-९]{1,4})?$/;
const TOC_PAGE_HEAD = /^पृ/;

function tocSplit(text: string): { lead: number; at: number } | null {
  if (text.includes("\n")) return null;
  const at = text.lastIndexOf(TOC_SEP);
  const lead = text.match(TOC_LEAD)?.[0].length ?? 0;
  if (at < lead) return null;
  const last = text.slice(at + TOC_SEP.length).trim();
  return TOC_PAGE.test(last) || TOC_PAGE_HEAD.test(last) ? { lead, at } : null;
}

/** The title column's ranges, alternating cell / separator / cell… */
function innerCells(text: string, from: number, to: number): [number, number][] {
  const out: [number, number][] = [];
  let start = from;
  for (let i = text.indexOf(TOC_SEP, from); i !== -1 && i < to; i = text.indexOf(TOC_SEP, start)) {
    out.push([start, i], [i, i + TOC_SEP.length]);
    start = i + TOC_SEP.length;
  }
  out.push([start, to]);
  return out;
}

/** The runs between two offsets of the block's text, cut where they cross. */
function sliceRuns(runs: FormattedSegment[], from: number, to: number): FormattedSegment[] {
  const out: FormattedSegment[] = [];
  let offset = 0;
  for (const r of runs) {
    const start = Math.max(from, offset);
    const end = Math.min(to, offset + r.text.length);
    if (start < end) out.push({ ...r, text: r.text.slice(start - offset, end - offset) });
    offset += r.text.length;
  }
  return out;
}

/**
 * Marker · title · page, as three grid columns: the title wraps inside its own
 * column so the page can never fall onto a line by itself, and every page
 * number sits flush right where the eye can run down them.
 *
 * The separator stays in the DOM, only hidden — highlight offsets are counted
 * over the text nodes of `text_hi`, and " | " is part of it.
 */
function TocRow({
  para,
  lead,
  at,
  segments,
}: {
  para: Paragraph;
  lead: number;
  at: number;
  segments?: PaintedSegment[] | null;
}) {
  const text = para.text_hi;
  const runs = formatSegments(text, segments ?? null, formatRuns(text, para.text_rich)) ?? [
    { text },
  ];
  const cut = at + TOC_SEP.length;
  const cols = para.marker
    ? "grid-cols-[auto_minmax(0,1fr)_auto]"
    : "grid-cols-[minmax(0,1fr)_auto]";
  return (
    <p
      lang="hi"
      className={`hi reader-list grid items-baseline gap-x-[0.5em] ${cols}`}
      style={{ paddingInlineStart: `calc(${para.indent_level * 1.5}rem + 0.4em)` }}
    >
      <Marker marker={para.marker} />
      <span>
        {lead > 0 && (
          <span hidden>
            <Runs runs={sliceRuns(runs, 0, lead)} />
          </span>
        )}
        {innerCells(text, lead, at).map(([from, to], k) =>
          k % 2 ? (
            // a separator between two leading cells — "अध्याय | विषय वस्तु |
            // पृ.क्र." — hidden, with a gap where it stood
            <span key={k} hidden>
              <Runs runs={sliceRuns(runs, from, to)} />
            </span>
          ) : (
            <span key={k} className={k ? "ps-[1em]" : undefined}>
              <Runs runs={sliceRuns(runs, from, to)} />
            </span>
          ),
        )}
      </span>
      <span hidden>
        <Runs runs={sliceRuns(runs, at, cut)} />
      </span>
      <span className="whitespace-nowrap text-end text-(--reader-ink-soft) tabular-nums">
        <Runs runs={sliceRuns(runs, cut, text.length)} />
      </span>
    </p>
  );
}

/** One paragraph block. Font sizing inherits from the reader root scale. */
export function Block({
  para,
  segments,
}: {
  para: Paragraph;
  segments?: PaintedSegment[] | null;
}) {
  const align = ALIGN[para.align] ?? "text-left";
  const indent = indentStyle(para.indent_level);
  const text = <Text text={para.text_hi} rich={para.text_rich} segments={segments} />;
  // Headings and captions carry no highlight or headword layer, only the
  // printed formatting.
  const plainText = <Text text={para.text_hi} rich={para.text_rich} />;

  if (para.block_type === "list" || para.block_type === "para") {
    const toc = tocSplit(para.text_hi);
    if (toc) return <TocRow para={para} lead={toc.lead} at={toc.at} segments={segments} />;
  }

  switch (para.block_type) {
    case "heading":
      return (
        <h2 lang="hi" className={`hi reader-heading mt-8 mb-3 text-[1.35em] font-bold ${align}`} style={indent}>
          <Marker marker={para.marker} />
          {plainText}
        </h2>
      );
    case "subheading":
      return (
        <h3 lang="hi" className={`hi reader-heading mt-6 mb-2 text-[1.15em] font-semibold ${align}`} style={indent}>
          <Marker marker={para.marker} />
          {plainText}
        </h3>
      );
    case "list":
      // A hanging indent: the marker gets its own column, so a wrapped line
      // comes back under the text rather than under the bullet. The marker
      // used to sit inline, one level of indent in — every wrapped line
      // started 40px into a 369px column and read as a new item.
      return (
        <p
          lang="hi"
          className={`hi reader-list ${para.marker ? "grid grid-cols-[auto_minmax(0,1fr)] gap-x-[0.5em]" : ""} ${align}`}
          style={{ paddingInlineStart: `calc(${para.indent_level * 1.5}rem + 0.4em)` }}
        >
          <Marker marker={para.marker} />
          <span>{text}</span>
        </p>
      );
    case "verse":
      // the Sutra look — typographic ceremony (PRD §5)
      return (
        <p
          lang="hi"
          className={`hi my-6 px-4 text-[1.1em] font-semibold leading-loose tracking-wide ${
            para.align ? ALIGN[para.align] : "text-center"
          }`}
          style={indent}
        >
          <Marker marker={para.marker} />
          {text}
        </p>
      );
    case "quote":
      return (
        <blockquote
          lang="hi"
          className={`hi my-4 border-s-2 ps-4 italic text-(--reader-ink-soft) ${align}`}
          style={{ ...indent, borderColor: "var(--ws-ink)" }}
        >
          <Marker marker={para.marker} />
          {text}
        </blockquote>
      );
    case "figure": {
      const b64 = para.extra?.image_b64;
      const mime = para.extra?.image_mime ?? "image/png";
      return (
        <figure className={`my-6 ${ALIGN[para.align] ?? "text-center"}`} style={indent}>
          {b64 && (
            // inline base64 per contract §3.2 — no separate media requests
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:${mime};base64,${b64}`}
              alt={para.text_hi || "Figure"}
              loading="lazy"
              decoding="async"
              className="mx-auto max-w-full rounded-md"
            />
          )}
          {para.text_hi && (
            <figcaption lang="hi" className="hi mt-2 text-[0.85em] text-(--reader-ink-soft)">
              {plainText}
            </figcaption>
          )}
        </figure>
      );
    }
    case "table": {
      const rows = para.extra?.rows ?? [];
      const hasHeader = para.extra?.header === true;
      const bodyRows = hasHeader ? rows.slice(1) : rows;
      return (
        <div className="my-5 overflow-x-auto" style={indent}>
          <table className="hi w-full border-collapse text-[0.95em]" lang="hi">
            {hasHeader && rows[0] && (
              <thead>
                <tr>
                  {rows[0].map((cell, i) => (
                    <th
                      key={i}
                      scope="col"
                      className="border border-(--reader-rule) px-3 py-1.5 text-start font-semibold"
                    >
                      <RichCell rich={cell} />
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-(--reader-rule) px-3 py-1.5">
                      <RichCell rich={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    default:
      return (
        <p lang="hi" className={`hi reader-para ${align}`} style={indent}>
          <Marker marker={para.marker} />
          {text}
          {para.footnote_text && (
            <span
              data-not-text
              className="ms-1 align-super text-[0.7em] text-(--reader-ink-soft)"
              title={para.footnote_text}
            >
              *
            </span>
          )}
        </p>
      );
  }
}
