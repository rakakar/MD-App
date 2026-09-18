// The Assistant's map of the app — every place a reader can ask to be taken.
//
// Written down here rather than read off the router because a route is an
// address, not a name a reader would type: nobody asks for `/me/bookmarks`,
// they ask for "my highlights", "saved passages" or "मेरे नोट्स". Each place
// carries the words people actually use for it, in English, in Hindi, and in
// Hindi typed in Roman letters, because this audience types all three.
//
// Books are added at runtime from the shelf (`bookDestinations`), since a
// manager can publish one without a deploy.

import { getRecentlyRead } from "@/lib/storage";
import type { BookSummary } from "@/lib/types";

export type DestinationIcon =
  | "notes"
  | "highlights"
  | "journey"
  | "book"
  | "audio"
  | "library"
  | "events"
  | "centres"
  | "links"
  | "paribhasha"
  | "settings"
  | "download"
  | "home"
  | "feedback"
  | "history"
  | "resume";

export interface Destination {
  id: string;
  /** "My Journey · Notes" — section, then the place */
  section: string;
  title: string;
  href: string;
  icon: DestinationIcon;
  /** the second line on the card, when there is something true to say */
  detail?: string;
  /** the words that reach it; matched whole-token or by prefix */
  keywords: string[];
  /** the typed command that opens it — "open my journey" */
  command?: string;
}

const PLACES: Destination[] = [
  {
    id: "home",
    section: "Originals",
    title: "Home",
    href: "/",
    icon: "home",
    keywords: ["home", "start", "होम", "ghar", "मुख्य"],
    command: "open home",
  },
  {
    id: "books",
    section: "Originals",
    title: "Books",
    href: "/books",
    icon: "book",
    detail: "All works of Shri A. Nagraj",
    keywords: ["books", "book", "read", "shelf", "pustak", "पुस्तक", "पुस्तकें", "granth", "ग्रंथ", "kitab", "किताब"],
    command: "open books",
  },
  {
    id: "media",
    section: "Originals",
    title: "Audio & video",
    href: "/av",
    icon: "audio",
    detail: "Pravachan recordings and videos",
    keywords: ["audio", "video", "media", "listen", "pravachan", "प्रवचन", "recording", "recordings", "सुनें", "suno", "videos"],
    command: "open audio",
  },
  {
    id: "library",
    section: "Originals",
    title: "Library",
    href: "/originals",
    icon: "library",
    detail: "Documents, photographs and collections",
    keywords: ["library", "collection", "collections", "documents", "photos", "pdf", "पुस्तकालय"],
    command: "open library",
  },
  {
    id: "translations",
    section: "Translations",
    title: "Translations",
    href: "/translations",
    icon: "book",
    keywords: ["translation", "translations", "english", "anuvad", "अनुवाद", "kannada", "marathi"],
    command: "open translations",
  },
  {
    id: "materials",
    section: "Resources",
    title: "Student materials",
    href: "/resources",
    icon: "library",
    detail: "Shodh patra, textbooks and more",
    keywords: ["resources", "materials", "student", "shodh", "शोध", "textbook", "textbooks", "paper", "papers"],
    command: "open resources",
  },
  {
    id: "journey",
    section: "My Journey",
    title: "Dashboard",
    href: "/me",
    icon: "journey",
    detail: "Your reading, progress and path",
    keywords: ["journey", "dashboard", "progress", "yatra", "यात्रा", "profile", "account"],
    command: "open my journey",
  },
  {
    id: "path",
    section: "My Journey",
    title: "Study roadmap",
    href: "/me/path",
    icon: "journey",
    keywords: ["roadmap", "path", "stage", "level", "abhyas", "अभ्यास", "study"],
    command: "open study roadmap",
  },
  {
    id: "highlights",
    section: "My Journey",
    title: "Highlights",
    href: "/me/bookmarks",
    icon: "highlights",
    detail: "Passages you saved or highlighted",
    keywords: ["highlights", "highlight", "bookmarks", "bookmark", "saved", "save", "passages"],
    command: "open highlights",
  },
  {
    id: "notes",
    section: "My Journey",
    title: "Notes",
    href: "/me/notes",
    icon: "notes",
    detail: "Everything you wrote against a passage",
    keywords: ["notes", "note", "नोट्स", "नोट", "tippani", "टिप्पणी"],
    command: "open notes",
  },
  {
    id: "events",
    section: "Connect",
    title: "Shivirs & events",
    href: "/connect",
    icon: "events",
    keywords: ["events", "event", "shivir", "shivirs", "शिविर", "camp", "camps", "calendar", "parichay", "परिचय"],
    command: "open events",
  },
  {
    id: "centres",
    section: "Connect",
    title: "Centres",
    href: "/connect/centres",
    icon: "centres",
    keywords: ["centres", "centre", "centers", "center", "kendra", "केंद्र", "near"],
    command: "open centres",
  },
  {
    id: "contacts",
    section: "Connect",
    title: "Contacts",
    href: "/connect/centres/contacts",
    icon: "centres",
    keywords: ["contacts", "contact", "phone", "sampark", "संपर्क", "prabodhak", "प्रबोधक"],
    command: "open contacts",
  },
  {
    id: "links",
    section: "Connect",
    title: "Links",
    href: "/connect/links",
    icon: "links",
    keywords: ["links", "link", "website", "youtube", "whatsapp", "group"],
    command: "open links",
  },
  {
    id: "paribhasha",
    section: "Originals",
    title: "Paribhasha glossary",
    href: "/paribhasha",
    icon: "paribhasha",
    detail: "Every defined word, A to Z",
    keywords: ["paribhasha", "परिभाषा", "glossary", "dictionary", "shabdkosh", "शब्दकोश", "definitions"],
    command: "open glossary",
  },
  {
    id: "downloads",
    section: "Settings",
    title: "Downloads",
    href: "/settings#downloads",
    icon: "download",
    detail: "Books and audio saved for offline",
    keywords: ["downloads", "download", "offline", "saved", "storage"],
    command: "open downloads",
  },
  {
    id: "settings",
    section: "Settings",
    title: "Settings",
    href: "/settings",
    icon: "settings",
    detail: "Theme, text size, notifications",
    keywords: ["settings", "setting", "सेटिंग", "theme", "dark", "light", "sepia", "font", "text", "size", "notifications", "language"],
    command: "open settings",
  },
  {
    id: "feedback",
    section: "Settings",
    title: "Feedback",
    href: "/me/feedback",
    icon: "feedback",
    keywords: ["feedback", "report", "problem", "bug", "sujhav", "सुझाव"],
    command: "open feedback",
  },
  {
    id: "conversations",
    section: "Assistant",
    title: "Conversations",
    href: "/assistant/conversations",
    icon: "history",
    detail: "What you asked before",
    keywords: ["conversations", "history", "chats", "asked", "previous"],
    command: "open conversations",
  },
];

/**
 * Words that say "take me somewhere" without naming where. Dropped before
 * matching so they neither score nor count as a leftover term.
 */
const FILLER = new Set([
  "open", "go", "goto", "to", "take", "me", "show", "my", "the", "a", "an",
  "where", "are", "is", "find", "please", "page", "screen", "tab", "i", "can",
  "kholo", "kholiye", "khol", "dikhao", "dikhaiye", "mere", "mera", "meri",
  "खोलो", "खोलें", "खोलिए", "दिखाओ", "दिखाइए", "मेरे", "मेरा", "मेरी", "कहाँ", "कहां",
  "hai", "hain", "है", "हैं", "par", "पर", "jao", "जाओ",
]);

/** A sentence that opens with one of these is asking to go, not to know. */
const COMMAND_VERBS =
  /^(open|go( to)?|goto|take me|show( me)?|resume|continue|kholo|khol|dikhao|खोलो|खोलें|दिखाओ|जाओ)\b/i;

export function isCommand(query: string): boolean {
  return COMMAND_VERBS.test(query.trim());
}

/** Lowercased tokens, punctuation off, Devanagari kept whole. */
export function tokens(text: string): string[] {
  return (
    text
      .normalize("NFC")
      .toLowerCase()
      .match(/[\p{L}\p{M}\p{N}]+/gu) ?? []
  );
}

export interface DestinationMatch {
  destination: Destination;
  score: number;
}

export interface NavigationAnswer {
  matches: DestinationMatch[];
  /**
   * Words that named no place — "avlokan" in "where are my Avlokan notes".
   * They are the reader's subject rather than the destination, and are what
   * the "Also possible" rows go looking for in the library.
   */
  leftover: string[];
}

function scoreFor(d: Destination, words: string[]): number {
  let score = 0;
  for (const w of words) {
    for (const k of d.keywords) {
      if (k === w) {
        score += 3;
        break;
      }
      // prefix either way round, so "note" finds notes and "highlighted"
      // finds highlight — but only for words long enough to mean something
      if (w.length >= 4 && k.length >= 4 && (k.startsWith(w) || w.startsWith(k))) {
        score += 2;
        break;
      }
    }
  }
  if (tokens(d.title).join(" ") === words.join(" ")) score += 2;
  return score;
}

export function matchDestinations(
  query: string,
  extra: Destination[] = []
): NavigationAnswer {
  const words = tokens(query).filter((w) => !FILLER.has(w));
  const all = [...PLACES, ...extra];
  const matches: DestinationMatch[] = [];
  for (const d of all) {
    const score = scoreFor(d, words);
    if (score > 0) matches.push({ destination: d, score });
  }
  matches.sort((a, b) => b.score - a.score);

  const leftover = words.filter(
    (w) => !all.some((d) => d.keywords.some((k) => k === w || (w.length >= 4 && k.startsWith(w))))
  );
  return { matches, leftover };
}

/** The reader's last chapter, as a place to go back to. Null on a new device. */
export function resumeDestination(): Destination | null {
  const last = getRecentlyRead()[0];
  if (!last) return null;
  return {
    id: "resume",
    section: "Continue reading",
    title: last.book_title || last.book_code,
    href: `/books/${encodeURIComponent(last.book_code)}/${last.chapter_number}`,
    icon: "resume",
    detail: `Chapter ${last.chapter_number}`,
    keywords: ["resume", "continue", "last", "reading", "padhna", "पढ़ना"],
    command: "resume last read",
  };
}

/** Each book on the shelf, reachable by its title or its code. */
export function bookDestinations(books: BookSummary[]): Destination[] {
  return books.map((b) => ({
    id: `book:${b.code}`,
    section: "Book",
    title: b.title_hi,
    href: `/books/${encodeURIComponent(b.code)}`,
    icon: "book" as const,
    detail: b.subtitle_hi || undefined,
    keywords: [b.code.toLowerCase(), ...tokens(b.title_hi)],
  }));
}

/**
 * The command list under the box as someone types "open my jour…".
 *
 * Offered only once the text reads as a command — a verb first, or the start
 * of one — so typing a word to look up never pops a menu over the keyboard.
 */
export function commandSuggestions(typed: string, limit = 3): Destination[] {
  const t = typed.trim().toLowerCase();
  if (t.length < 2) return [];
  const resume = resumeDestination();
  const pool = [...(resume ? [resume] : []), ...PLACES].filter((d) => d.command);
  const verbish = "open".startsWith(t) || "resume".startsWith(t) || isCommand(t);
  if (!verbish) return [];
  const prefix = pool.filter((d) => d.command!.startsWith(t));
  if (prefix.length > 0) return prefix.slice(0, limit);
  // "open not" — the verb is typed, match on the rest
  const rest = t.replace(COMMAND_VERBS, "").trim();
  if (!rest) return pool.slice(0, limit);
  return matchDestinations(rest, resume ? [resume] : [])
    .matches.map((m) => m.destination)
    .filter((d) => d.command)
    .slice(0, limit);
}
