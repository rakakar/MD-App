"use client";

import { useState } from "react";
import { ShareIcon } from "@/components/shell/icons";
import { HeroIconButton } from "./CollectionHero";

/**
 * The share button in the corner of a hero — a book, an album, a folder.
 *
 * Five of the comps' screens carry it, which is why it is here rather than
 * repeated in five files. It shares the page it is on, so it takes a title and
 * nothing else; the URL is read at press time, which is the only way to get it
 * right on a route the router may have changed under us.
 *
 * Falls back to the clipboard where the Web Share API does not exist — every
 * phone this app is used on has it, and every desktop browser does not. A
 * cancelled share sheet is not an error and says nothing.
 */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // cancelled, or a browser that refuses both — neither is worth a dialog
    }
  };

  return (
    <HeroIconButton onClick={share} aria-label={copied ? "Link copied" : `Share ${title}`}>
      {copied ? (
        <span className="text-xs font-semibold">Copied</span>
      ) : (
        <ShareIcon className="h-4.5 w-4.5" />
      )}
    </HeroIconButton>
  );
}
