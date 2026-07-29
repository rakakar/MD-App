I checked two things before answering: how this repo's styling is actually structured, and whether the Claude Design pipeline is already live for your account.

**Finding:** the pipeline exists — I have a `DesignSync` tool that can read Claude Design *design-system projects* directly. But `list_projects` returns **empty** for your account right now. So nothing of Rakesh's is reachable by me yet. That's the single thing blocking the good workflow, and it's a 2-minute fix on his side.

## The right pipeline

Rakesh should not hand you screenshots, and he should not touch the repo. He publishes a **design system project** on claude.ai/design and shares it with your account. Then I read it as files and translate it into this codebase's own idioms. Design lives in his project; code lives in the repo; I'm the translator. Neither of you edits the other's surface.

Concretely:

1. Rakesh creates his work as a **Design System project** (not a normal project, not a chat artifact — the type is fixed at creation and can't be converted later, so this matters).
2. He shares it with `welfarenitu@gmail.com` with edit access — the tool only sees projects you can write to.
3. He sends you the **project name**. I run `list_projects`, find it, and pull the components.
4. I port them component-by-component onto a branch, you review the diff, we merge.

## What to ask him for

Send him this list:

- **A design-system project, shared with my account, with edit access.** Name it something stable like `MD App Design System`.
- **Tokens as their own components** — colour ramp, type scale, spacing. Not just screens. Our [globals.css](src/app/globals.css) is a token file already (`--color-ws-*`, `--reader-*`, five workspace identity colours); his palette needs to map onto it or explicitly replace it.
- **Mobile first, at 390px.** ~90% of your traffic is phones. A desktop-only mockup means I'm guessing at the case that actually matters. Desktop can come second.
- **The reader screens with all three themes** — light, sepia, dark. The reader has its own theme system and its own colour tokens; a single light mockup leaves two-thirds of it undesigned.
- **States, not just the happy path**: empty, loading, offline, long Hindi titles that wrap. These are where a mockup-to-code port usually falls apart.
- **His contrast intent.** Our current palette was deliberately darkened ~10% to clear 4.5:1 AA — the reasoning is written into the CSS comments. If his palette is lighter, I need to know whether AA is a hard floor (I'd assume yes) so I can adjust his hues rather than silently ship failing contrast.

## How I'd implement it here

- **Tokens first, in one commit.** His palette/type/spacing replace the `@theme` block. Every screen shifts at once, for free.
- **Then primitives.** [ui.tsx](src/components/ui.tsx) is only 103 lines and is where `BookCard`, `SectionHeading`, `PageContainer` live. His component set lands here and propagates across all 51 screens.
- **Then screens**, in his priority order — reader, then home, then the rest.
- **On a `design/` branch**, one PR per layer, so you can veto a layer without unwinding the whole thing.
- **Never a wholesale replace.** His mockups are HTML; this is a Next 16 / React 19 / Tailwind v4 app with real routing, offline storage, and a reader that owns its viewport. I port the *design*, not the markup.

One thing to set expectations on with him: where his design collides with something load-bearing here — AA contrast, the reader rendering outside the app shell, the workspace colour system — I'll flag it to you both rather than pick a side silently.

Once he shares the project, say the word and I'll pull it and give you a gap report before writing any code.