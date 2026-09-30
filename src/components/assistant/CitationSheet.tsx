"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { BookmarkIcon, CloseIcon, ShareIcon } from "@/components/shell/icons";
import { Sheet } from "@/components/ui";
import { getParibhashaWord, resolvePara } from "@/lib/api";
import { localBookmarks, saveBookmark, unsaveBookmark } from "@/lib/personal";
import { parseRef, refToHref } from "@/lib/refs";
import type { ChatCitation, ParaResolution, ParibhashaWord } from "@/lib/types";
import { WORKSPACES } from "@/lib/workspaceConfig";
import { BookGlyph } from "./icons";

/**
 * 6 · Citation expanded to its source passage.
 *
 * The passage itself, fetched by its ref (`paras/{ref}/`), so a reader can
 * check the claim against the words before deciding whether to go and read
 * more. The citation was verified by the BE against a passage it actually
 * retrieved, so this lookup is expected to succeed; if it does not, the sheet
 * still offers the way into the reader.
 */
export function CitationSheet(props: {
  citation: ChatCitation | null;
  number: number;
  onClose: () => void;
  /** where it is drawn — the phone's bottom sheet unless told otherwise */
  frame?: Frame;
}) {
  const p = { ...props, frame: props.frame ?? SheetFrame };
  return props.citation?.kind === "definition" ? <DefinitionSheet {...p} /> : <PassageSheet {...p} />;
}

/**
 * What a source is drawn inside. The same heading, passage and actions go in
 * a bottom sheet on a phone and in the side panel on desktop (`SourcePanel`),
 * so the two cannot drift apart — only the frame differs.
 */
export type Frame = (p: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  footer: ReactNode;
  /** the page this source lives on, for the panel's share button */
  href: string | null;
  children: ReactNode;
}) => ReactNode;

const SheetFrame: Frame = ({ open, onClose, title, subtitle, footer, children }) => (
  <Sheet
    open={open}
    onClose={onClose}
    title={title}
    subtitle={subtitle}
    accent={WORKSPACES.originals.color}
    footer={footer}
  >
    {children}
  </Sheet>
);

/**
 * The desktop frame: a column at the right of the Assistant, beside the
 * answer rather than over it, so the reader can check a claim against its
 * passage with the answer still in view (desktop revision, 30 Sep 2026).
 */
export const PanelFrame: Frame = (props) => <PanelFrameView {...props} />;

/** "Source 2 of 5" — set by the panel around the frame. */
export const SourceLabel = createContext("Source");

function PanelFrameView({ open, onClose, footer, href, children }: Parameters<Frame>[0]) {
    const label = useContext(SourceLabel);
    const [copied, setCopied] = useState(false);
    if (!open) return null;
    const share = async () => {
      if (!href) return;
      const url = `${window.location.origin}${href}`;
      if (navigator.share) {
        await navigator.share({ url }).catch(() => {});
        return;
      }
      await navigator.clipboard?.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    };
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-rule px-5 py-3">
          <p className="min-w-0 flex-1 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
            {label}
          </p>
          {href && (
            <button
              type="button"
              onClick={() => void share()}
              aria-label={copied ? "Link copied" : "Share this source"}
              className="flex h-11 w-11 items-center justify-center rounded-control border border-rule bg-card"
            >
              {copied ? <span className="text-xs font-semibold">Copied</span> : <ShareIcon className="h-4 w-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the source"
            className="flex h-11 w-11 items-center justify-center rounded-control border border-rule bg-card"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-6">{children}</div>
        {footer && <div className="shrink-0 border-t border-rule px-5 py-3">{footer}</div>}
      </div>
    );
}

/**
 * A definition from परिभाषा संहिता, cited in the answer. Not a passage in a
 * book, so there is no reader to open: the glossary entry is where it lives,
 * and its page leads back here (`?from=assistant`).
 */
function DefinitionSheet({
  citation,
  number,
  onClose,
  frame: Frame,
}: {
  citation: ChatCitation | null;
  number: number;
  onClose: () => void;
  frame: Frame;
}) {
  const id = citation?.word_id ?? null;
  const [word, setWord] = useState<ParibhashaWord | null>(null);
  const [failed, setFailed] = useState(false);
  const headword = citation?.canonical_ref.replace(/^परिभाषा:\s*/, "") ?? "";

  useEffect(() => {
    if (id === null) return;
    let alive = true;
    setWord(null);
    setFailed(false);
    getParibhashaWord(id)
      .then((w) => alive && (w ? setWord(w) : setFailed(true)))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <Frame
      open={citation !== null}
      onClose={onClose}
      title={`Source ${number}`}
      subtitle="Official definition"
      href={id !== null ? `/paribhasha/${id}` : null}
      footer={
        id !== null ? (
          <Link
            href={`/paribhasha/${id}?from=assistant`}
            className="flex min-h-12 items-center justify-center gap-2 rounded-control px-4 text-title font-semibold text-white"
            style={{ background: "var(--ws-color)" }}
          >
            Open in Paribhasha
          </Link>
        ) : null
      }
    >
      <div className="px-5 pt-4">
        <p lang="hi" className="hi-note text-xl font-semibold">
          {word?.hindi ?? headword}
        </p>
        <p lang="hi" className="hi-note mt-1 text-sm text-ink-soft">
          परिभाषा संहिता · A. Nagraj
        </p>
        <div className="mt-4 rounded-card border border-rule bg-card p-4">
          {!word && !failed && <p className="text-sm text-ink-soft">Opening the definition…</p>}
          {failed && <p className="text-sm text-ink-soft">The definition could not be loaded here.</p>}
          {word && (
            <ol lang="hi" className="hi flex list-decimal flex-col gap-2 pl-5 text-lg leading-relaxed">
              {word.definitions.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Frame>
  );
}

function PassageSheet({
  citation,
  number,
  onClose,
  frame: Frame,
}: {
  citation: ChatCitation | null;
  number: number;
  onClose: () => void;
  frame: Frame;
}) {
  const { user } = useAuth();
  const ref = citation?.canonical_ref ?? null;
  const [para, setPara] = useState<ParaResolution | null>(null);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!ref) return;
    let alive = true;
    setPara(null);
    setFailed(false);
    setSaved(localBookmarks().some((b) => b.canonical_ref === ref));
    resolvePara(ref)
      .then((p) => alive && setPara(p))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [ref]);

  const parsed = ref ? parseRef(ref) : null;
  const where = [
    citation?.chapter || (para?.chapter_number !== undefined && `Chapter ${para.chapter_number}`),
    para?.chapter_title && `“${para.chapter_title}”`,
    (para?.page_label || parsed?.page) && `page ${para?.page_label || parsed?.page}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Frame
      open={citation !== null}
      onClose={onClose}
      title={`Source ${number}`}
      subtitle="Cited in the answer"
      href={ref ? refToHref(ref) : null}
      footer={
        ref ? (
          <div className="flex gap-3">
            <Link
              href={refToHref(ref)}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control px-4 text-title font-semibold text-white"
              style={{ background: "var(--ws-color)" }}
            >
              <BookGlyph className="h-5 w-5" />
              Open in reader
            </Link>
            {(para?.book_code || parsed?.code) && (
              <button
                type="button"
                aria-pressed={saved}
                onClick={() => {
                  if (saved) unsaveBookmark(ref, !!user);
                  else
                    saveBookmark(
                      {
                        canonical_ref: ref,
                        book_code: para?.book_code ?? parsed!.code,
                        book_title: para?.book_title ?? citation?.book ?? undefined,
                        text_hi: para?.text_hi,
                      },
                      !!user
                    );
                  setSaved(!saved);
                }}
                className="flex min-h-12 items-center gap-2 rounded-control border border-rule bg-card px-5 text-title font-semibold"
              >
                <BookmarkIcon filled={saved} className="h-5 w-5" />
                {saved ? "Saved" : "Save"}
              </button>
            )}
          </div>
        ) : null
      }
    >
      <div className="px-5 pt-4">
        <p lang="hi" className="hi-note text-xl font-semibold">
          {para?.book_title ?? citation?.book ?? parsed?.code}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          A. Nagraj{where && ` · ${where}`}
        </p>

        <div className="mt-4 rounded-card border border-rule bg-card p-4">
          {!para && !failed && <p className="text-sm text-ink-soft">Opening the passage…</p>}
          {failed && (
            <p className="text-sm text-ink-soft">
              The passage could not be loaded here. It is at {ref} in the reader.
            </p>
          )}
          {para && (
            <blockquote
              lang="hi"
              className="hi border-l-4 py-2 pl-4 pr-2 text-lg leading-relaxed"
              style={{
                borderColor: "color-mix(in srgb, var(--ws-color) 55%, transparent)",
                background: "color-mix(in srgb, var(--ws-color) 7%, var(--color-card))",
              }}
            >
              {para.text_hi}
            </blockquote>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-soft">{ref}</p>
      </div>
    </Frame>
  );
}
