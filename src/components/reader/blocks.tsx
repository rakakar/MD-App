import type { PaintedSegment } from "@/lib/highlights";
import { formatRuns, formatSegments, parseRich, type RichRun } from "@/lib/richText";
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
  return (
    <>
      {formatted.map((s, i) => {
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
