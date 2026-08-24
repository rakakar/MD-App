import { contentLang } from "@/lib/script";

/**
 * The invitation note.
 *
 * It is **plain text with blank lines between paragraphs** — not HTML, not
 * Markdown — so nothing here interprets anything except the blank lines that
 * separate paragraphs and the URLs a manager typed into the middle of one.
 *
 * The URLs are the reason this is a component rather than a `<p>`. Organisers
 * write "पंजीकरण के लिए:" and then paste a forms.gle link on the next line, and
 * the comps draw that link in the accent, as a link. Left as text it is a
 * phone number you have to copy by hand.
 *
 * Deliberately narrow about what it recognises: a bare `http(s)://…` run, and
 * nothing else. Anything cleverer — bare domains, emails, phone numbers —
 * starts guessing at a manager's prose, and the one place it guesses wrong is
 * the sentence a reader most needs to be able to read.
 */

// Stops at whitespace, and lets go of the punctuation a sentence puts after a
// link — a trailing "।", full stop, comma or bracket belongs to the prose.
const URL_RE = /https?:\/\/[^\s<>"]+[^\s<>".,;:!?।)\]]/g;

function linkify(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(
      <a
        key={`${at}-${m[0]}`}
        href={m[0]}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold underline decoration-1 underline-offset-2 [overflow-wrap:anywhere]"
        style={{ color: "var(--ws-ink)" }}
      >
        {m[0]}
      </a>
    );
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function EventNote({ note }: { note: string }) {
  const paragraphs = note.split(/\n[ \t]*\n+/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return null;
  return (
    <div className="flex flex-col gap-3.5">
      {paragraphs.map((p, i) => {
        const l = contentLang(p);
        return (
          // `whitespace-pre-line` keeps the single newlines *inside* a
          // paragraph — an address or a list of dates is typed one per line —
          // while the blank lines between paragraphs have already become the
          // gap this stack draws.
          // `hi-note` is Mukta at 1.5 rather than the book serif at 1.85: this
          // is a manager's letter, not a line of scripture.
          <p
            key={i}
            {...l}
            className={`${l.className} hi-note whitespace-pre-line text-title leading-relaxed`}
          >
            {linkify(p)}
          </p>
        );
      })}
    </div>
  );
}
