// The first-run deck's words. Editorial content, so it lives here beside
// `journey.ts` and `centreNotes.ts` rather than inside the component that
// draws it — six cards whose copy the designer owns and will rewrite without
// touching a line of JSX.
//
// **No screenshots.** Each card carries a working fragment of the real
// interface above the line, built from the app's own components and its own
// data. That is a maintenance decision as much as a design one: a picture of
// the switcher goes stale the day a workspace is renamed, and nobody notices
// until a reader does. See `components/onboarding/Fragments.tsx`.

export type OnboardingCardId =
  | "workspaces"
  | "originals"
  | "resources"
  | "translations"
  | "highlights"
  | "journey";

export interface OnboardingCard {
  id: OnboardingCardId;
  /** the headline, in the app's display face */
  title: string;
  /** one plain sentence — what the feature is, not how to operate it */
  body: string;
  /** what a screen reader is told the fragment above the line is */
  fragmentLabel: string;
}

export const ONBOARDING_CARDS: OnboardingCard[] = [
  {
    id: "workspaces",
    title: "Five workspaces, one for each intent",
    body:
      "The app is divided by what you came to do. Switch workspaces any time from the switcher at the top — each one keeps its own place, so you never lose where you were.",
    fragmentLabel: "The workspace switcher, listing the five workspaces",
  },
  {
    id: "originals",
    title: "Originals holds the source works",
    body:
      "Every book, audio recording, video and other work of Shri A. Nagraj, in one place. Nothing here is edited or interpreted — it is the material as it was given.",
    fragmentLabel: "The Originals shelf, showing book covers and the media tabs",
  },
  {
    id: "resources",
    title: "Resources is what students have built",
    body:
      "Research papers, study guides and yojana material contributed by students sit apart from the originals, so the two are never confused.",
    fragmentLabel: "The Resources shelf, showing student material",
  },
  {
    id: "translations",
    title: "Read in English or Kannada",
    body:
      "Translations are available alongside the original. In read mode you can switch between Hindi and your chosen language at any point, without losing your place.",
    fragmentLabel: "The reader's language toggle, over a passage and its translation",
  },
  {
    id: "highlights",
    title: "Highlight a line, keep a note",
    body:
      "Select any passage to highlight it or write against it. Everything you mark is collected in My Journey, with a link back to the page it came from.",
    fragmentLabel: "A highlighted passage with a note written against it",
  },
  {
    id: "journey",
    title: "My Journey knows where you are",
    body:
      "It lays out the whole path — nine stages across four levels — marks where you stand, and tells you the one thing to do next.",
    fragmentLabel: "The journey's stage card, showing the current stage and the next step",
  },
];

/** The label on the button that advances — "Start reading" on the last card. */
export function advanceLabel(index: number): string {
  return index === ONBOARDING_CARDS.length - 1 ? "Start reading" : "Next";
}
