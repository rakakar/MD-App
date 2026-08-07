import { bookHue, coverGradient } from "@/lib/bookHue";
import { contentLang } from "@/lib/script";

/**
 * The picture on a document's card — or, when there is none, a title card.
 *
 * **A missing picture is a design state, not a failure.** Three things can be
 * true of a library file and the BE deliberately tells us only the result: an
 * operator uploaded a cover; or it is a PDF and we rendered its own first page;
 * or neither, because it is audio, or the render failed, or — most usefully —
 * somebody looked at the rendered page, saw a wall of body text, and threw it
 * away. That last case is why the fallback matters. Falling back to a grey
 * document icon would put the shelf straight back where it started, and a
 * photograph of a paragraph is not a better cover than no cover.
 *
 * So the fallback is the title, set on the same generated colour the folder
 * heroes already use. It costs nobody an afternoon in an image editor, it is
 * stable per file, and at arm's length a wall of coloured spines with words on
 * them reads as a shelf — which a wall of grey icons never did.
 *
 * `<img>` and not `next/image`: these come from R2 on a domain that is one env
 * var away from changing, the BE already sized them for this exact box, and a
 * loader in front of a 40 KB JPEG buys nothing.
 */
export function FileCover({
  src,
  title,
  id,
  className,
}: {
  src: string | null;
  title: string;
  /** what the colour is drawn from — stable per file, so it never shifts */
  id: number | string;
  /** the frame: size, radius and any shadow, chosen by the card */
  className: string;
}) {
  const hue = bookHue(`file-${id}`);

  return (
    <span
      className={`relative block shrink-0 overflow-hidden ring-1 ring-black/[.06] ${className}`}
      style={src ? undefined : { background: coverGradient(hue) }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          // `cover`, so a first page whose aspect is not the frame's fills it
          // rather than leaving letterbox bars that make a shelf look broken.
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-full w-full items-center p-1.5"
          // White, which is what this palette was measured for: its dark end
          // clears 4.5:1 against small white text (see `bookHue`).
          style={{ color: "#fff" }}
        >
          {/* Four lines at most, then an ellipsis: a long Hindi title shrunk to
              fit a 66px box is unreadable, and the title is spelled out in full
              beside the cover anyway. This is a silhouette to recognise, not a
              label to read. */}
          <span
            {...contentLang(title)}
            className={`${contentLang(title).className} line-clamp-4 text-[0.5rem] font-semibold leading-[1.25] break-words`}
          >
            {title}
          </span>
        </span>
      )}
      <span className="sr-only">{title}</span>
    </span>
  );
}
