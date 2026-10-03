"use client";

import { useState } from "react";
import type { HighlightColour } from "@/lib/storage";

/**
 * A note in the desktop reader's right margin, beside the passage it is about.
 *
 * Every marked passage gets one: a note shows its words, a highlight with no
 * note offers "+ Add a note" — the comps' answer to "where do I write about
 * this?", in the place a reader with a pencil would write it. Clicking a note
 * edits it there; nothing opens over the page.
 *
 * `data-reader-chrome` and `data-margin` keep a click or a selection in here
 * from being read as one on the book: no chrome toggling, no selection bar.
 */
export function MarginNote({
  colour,
  label,
  note,
  editing,
  onEdit,
  onSave,
  onCancel,
}: {
  colour?: HighlightColour;
  /** "p. 1 · today" */
  label: string;
  note?: string;
  editing: boolean;
  onEdit: () => void;
  /** empty text removes the note */
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  return (
    <div
      data-reader-chrome
      data-margin
      className="border-l-2 pl-3.5"
      style={{ borderColor: colour ? `var(--color-hl-${colour}-mark)` : "var(--reader-rule)" }}
    >
      <p className="hi-tight text-xs text-(--reader-ink-soft)">
        {label}
      </p>
      {editing ? (
        <Editor initial={note ?? ""} onSave={onSave} onCancel={onCancel} canDelete={!!note} />
      ) : note ? (
        <button
          type="button"
          onClick={onEdit}
          title="Edit note"
          className="mt-1 block w-full whitespace-pre-line text-start text-sm leading-relaxed transition-colors line-clamp-6 hover:text-(--ws-ink)"
        >
          {note}
        </button>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="mt-1 text-sm font-semibold hover:underline"
          style={{ color: "var(--ws-ink)" }}
        >
          + Add a note
        </button>
      )}
    </div>
  );
}

function Editor({
  initial,
  onSave,
  onCancel,
  canDelete,
}: {
  initial: string;
  onSave: (text: string) => void;
  onCancel: () => void;
  canDelete: boolean;
}) {
  const [text, setText] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(text.trim());
      }}
      className="mt-1.5"
    >
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onCancel();
          } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSave(text.trim());
          }
        }}
        rows={4}
        placeholder="Your note…"
        className="w-full resize-none rounded-md border border-(--reader-rule) bg-(--reader-bg) p-2 text-sm outline-none focus:border-(--ws-ink)"
      />
      <div className="mt-1.5 flex items-center gap-1">
        {canDelete && (
          <button
            type="button"
            onClick={() => onSave("")}
            className="h-8 rounded-md px-2 text-xs text-(--reader-ink-soft) hover:bg-current/5 hover:text-(--reader-ink)"
          >
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto h-8 rounded-md px-2.5 text-xs text-(--reader-ink-soft) hover:bg-current/5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!text.trim() && !canDelete}
          className="h-8 rounded-md px-3 text-xs font-semibold text-white disabled:opacity-40"
          style={{ background: "var(--ws-color)" }}
        >
          Save
        </button>
      </div>
    </form>
  );
}
