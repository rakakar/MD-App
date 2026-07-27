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

function Marker({ marker }: { marker: string }) {
  if (!marker) return null;
  return <span className="me-2 font-semibold text-(--reader-ink-soft)">{marker}</span>;
}

/** One paragraph block. Font sizing inherits from the reader root scale. */
export function Block({ para }: { para: Paragraph }) {
  const align = ALIGN[para.align] ?? "text-left";
  const indent = indentStyle(para.indent_level);

  switch (para.block_type) {
    case "heading":
      return (
        <h2 lang="hi" className={`hi mt-8 mb-3 text-[1.35em] font-bold leading-snug ${align}`} style={indent}>
          <Marker marker={para.marker} />
          {para.text_hi}
        </h2>
      );
    case "subheading":
      return (
        <h3 lang="hi" className={`hi mt-6 mb-2 text-[1.15em] font-semibold leading-snug ${align}`} style={indent}>
          <Marker marker={para.marker} />
          {para.text_hi}
        </h3>
      );
    case "list":
      return (
        <p lang="hi" className={`hi my-1.5 ${align}`} style={indentStyle(para.indent_level + 1)}>
          <Marker marker={para.marker} />
          {para.text_hi}
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
          {para.text_hi}
        </p>
      );
    case "quote":
      return (
        <blockquote
          lang="hi"
          className={`hi my-4 border-s-2 ps-4 italic text-(--reader-ink-soft) ${align}`}
          style={{ ...indent, borderColor: "var(--ws-color)" }}
        >
          <Marker marker={para.marker} />
          {para.text_hi}
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
              {para.text_hi}
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
                      {cell}
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
                      {cell}
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
        <p lang="hi" className={`hi my-3 ${align}`} style={indent}>
          <Marker marker={para.marker} />
          {para.text_hi}
          {para.footnote_text && (
            <span className="ms-1 align-super text-[0.7em] text-(--reader-ink-soft)" title={para.footnote_text}>
              *
            </span>
          )}
        </p>
      );
  }
}
