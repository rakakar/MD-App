"use client";

import { CloseIcon, Icon } from "@/components/shell/icons";

/**
 * The one search box — the chrome, and none of the policy.
 *
 * This app has three search surfaces and they answer to different rules: the
 * catalogue find bar navigates the URL on submit, the citation search fetches
 * and renders its own results, the Paribhasha box filters a dictionary already
 * on the device. What they share is not behaviour, it is the *control* — a
 * bordered row, a magnifier that submits, a clear button, and tap targets big
 * enough for a thumb.
 *
 * They shared it by copy, which is why they had drifted: the browser's own
 * clear button was suppressed in one and not the others, and only one had a
 * magnifier a reader could press. So the control lives here and the policy
 * stays with the caller, which is the only split that holds — a `mode` prop
 * choosing between "search as you type" and "search on submit" would put the
 * two next to each other as if they were interchangeable, and picking the
 * wrong one is exactly the mistake that made a word cost six billed calls.
 *
 * Whether a surface is instant or submit-only is decided by where its data
 * lives: on the device it can be instant, over the network it waits to be
 * asked. See `FindBar` and `SearchScreen`.
 */
export function SearchField({
  inputRef,
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder,
  label,
  unasked = false,
  pending = false,
}: {
  /** the caller's handle on the box — for focusing it, and for asking whether
   *  the reader is in it before anything overwrites what they typed */
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
  /** Enter, the phone keyboard's search key, or the magnifier */
  onSubmit: () => void;
  onClear: () => void;
  placeholder: string;
  /** the accessible name; sighted readers get `placeholder` */
  label: string;
  /** something typed that has not been asked yet — lights the magnifier */
  unasked?: boolean;
  /** a search is in flight */
  pending?: boolean;
}) {
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
        // Closes the phone keyboard, and hands the box back to whatever the
        // caller does with focus — a submitted search should not leave the
        // keyboard sitting over its own results.
        inputRef.current?.blur();
      }}
      // No vertical padding of its own: the button carries the height, and
      // `min-h-11` there is the 44px this row has always been.
      className="flex items-center gap-1 rounded-control border border-rule bg-card ps-1 pe-3 focus-within:border-(--ws-color)"
    >
      <button
        type="submit"
        aria-label={label}
        // The magnifier is the button rather than an ornament beside one: it
        // is already where a reader looks for search, and on a phone the
        // keyboard's own search key is the other way in (`enterKeyHint`). It
        // takes the workspace colour only when there is something unasked in
        // the box, so the control that costs a round trip says when it would
        // actually do something.
        className={`flex min-h-11 shrink-0 items-center justify-center rounded-xl px-2.5 transition-colors ${
          unasked ? "text-(--ws-color)" : "text-ink-soft"
        }`}
      >
        <Icon name="search" className={`h-4.5 w-4.5 ${pending ? "animate-pulse" : ""}`} />
      </button>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        enterKeyHint="search"
        // The browser draws its own clear button inside a `type="search"` box,
        // in its own colour and with a 10px hit area. Ours is beside it and
        // does more than empty the text, so the native one is two controls for
        // one job — and the wrong one wins on a phone, being the harder of the
        // two to hit.
        // `ui-hi`, not `hi`: the placeholder is now English chrome around a
        // folder's own name, and a reader types either script into it — so the
        // stack switches per glyph rather than setting the whole box in the
        // Devanagari serif.
        className="ui-hi w-full bg-transparent text-base outline-none [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="flex min-h-11 shrink-0 items-center px-1 text-ink-soft transition-colors hover:text-ink"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
