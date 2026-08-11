"use client";

import { useState } from "react";
import { useDisplay } from "@/components/shell/DisplayProvider";
import {
  ChevronRight,
  DownloadIcon,
  ExternalLinkIcon,
  PlayIcon,
  ShareIcon,
  TagIcon,
  VideoIcon,
  WaveformIcon,
} from "@/components/shell/icons";
import {
  ActiveFilters,
  CheckRow,
  Chip,
  ChipRow,
  CollectionCard,
  CollectionHero,
  CountTabs,
  CountedSegmented,
  FilterButton,
  FilterSection,
  FindRow,
  HeroAction,
  HeroIconButton,
  KindTile,
  ListRow,
  PromoBand,
  RadioList,
  RowAction,
  RowCard,
  RowGroup,
  RowNumber,
  Sheet,
  SheetAction,
  SheetTextAction,
  StatTile,
} from "@/components/ui";
import { READER_SURFACES, type ReaderSurface, type Theme } from "@/lib/storage";
import type { TileKind } from "@/components/ui/KindTile";

const APP_THEMES: Theme[] = ["system", "light", "sepia", "dark"];
const KINDS: TileKind[] = ["pdf", "audio", "video", "image", "link", "folder"];

/** A token, its value, and — where it matters — what it measures against. */
function Swatch({ name, css, note }: { name: string; css: string; note?: string }) {
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden
        className="h-11 w-11 shrink-0 rounded-tile border border-rule"
        style={{ background: `var(${css})` }}
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block truncate text-xs text-ink-soft">{css}</span>
        {note && <span className="block truncate text-xs text-muted">{note}</span>}
      </span>
    </li>
  );
}

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-[1.0625rem] font-semibold tracking-[-0.01em]">{title}</h2>
      {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Kitchen() {
  const { theme, setTheme, readerTheme, setReaderTheme } = useDisplay();
  const [sheet, setSheet] = useState<"none" | "filters" | "chapters">("none");
  const [sort, setSort] = useState("new");
  const [topics, setTopics] = useState<string[]>(["अस्तित्व"]);
  const [chapters, setChapters] = useState<string[]>(["4"]);

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  return (
    <div className="mx-auto w-full max-w-[1088px] px-4 py-6 sm:px-6">
      <h1 className="font-display text-[1.625rem] font-medium tracking-[-0.015em]">
        Design system
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Every token and every shared component, in every state. Flip the two controls below
        and everything on this page follows — that is the check.
      </p>

      {/* ---- the two axes ---- */}
      <div className="mt-5 rounded-card border border-rule bg-card p-4 shadow-card">
        <p className="text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">App theme</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {APP_THEMES.map((t) => (
            <Chip key={t} label={t} selected={theme === t} onClick={() => setTheme(t)} />
          ))}
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
          Reading surface
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          Only the book follows this. Nothing on this page except the reader block below
          should move when it changes — if something does, it is reading the wrong token.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {READER_SURFACES.map((s: ReaderSurface) => (
            <Chip
              key={s}
              label={s}
              variant="tint"
              selected={readerTheme === s}
              onClick={() => setReaderTheme(s)}
            />
          ))}
        </div>
      </div>

      <Block
        title="Surfaces & ink"
        hint="Seven neutrals. Every screen goes through these, so a theme is this block and nothing else."
      >
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Swatch name="surface" css="--color-surface" note="the page" />
          <Swatch name="card" css="--color-card" note="raised off it" />
          <Swatch name="canvas" css="--color-canvas" note="under the page" />
          <Swatch name="inset" css="--color-inset" note="sunk into a card" />
          <Swatch name="ink" css="--color-ink" />
          <Swatch name="ink-soft" css="--color-ink-soft" note="≥4.5:1 everywhere" />
          <Swatch name="muted" css="--color-muted" note="never text" />
          <Swatch name="rule" css="--color-rule" />
        </ul>
      </Block>

      <Block
        title="Kind accents"
        hint="Five families for seven kinds. The tile is the designer's; the glyph is one step deeper so it clears 4.5:1 on its own tile."
      >
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Swatch name="doc" css="--color-kind-doc" note="pdf · link · other" />
          <Swatch name="video" css="--color-kind-video" />
          <Swatch name="audio" css="--color-kind-audio" />
          <Swatch name="image" css="--color-kind-image" note="the comps never draw one" />
          <Swatch name="folder" css="--color-kind-folder" />
        </ul>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          {KINDS.map((k) => (
            <div key={k} className="flex flex-col items-center gap-1.5">
              <KindTile kind={k} size="lg" />
              <span className="text-xs text-ink-soft">{k}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-end gap-3">
          <KindTile kind="pdf" size="sm" />
          <KindTile kind="pdf" size="md" />
          <KindTile kind="pdf" size="lg" />
          <span className="pb-1 text-xs text-ink-soft">sm · md · lg</span>
        </div>
      </Block>

      <Block
        title="Highlight colours"
        hint="Book ink lands 13.9–14.5:1 on all three here, and 8.3–9.5:1 on their deepened forms inside Quiet."
      >
        <div className="flex flex-wrap gap-3">
          {(["amber", "sage", "sky"] as const).map((c) => (
            <span
              key={c}
              lang="hi"
              className="hi rounded-md px-3 py-2 text-base"
              style={{ background: `var(--color-hl-${c})` }}
            >
              व्यवस्था में जीना ही मानव का सहज स्वभाव है।
            </span>
          ))}
        </div>
      </Block>

      <Block title="Radius & elevation" hint="Four radii and three lifts. Nothing else.">
        <div className="flex flex-wrap gap-3">
          {(
            [
              ["tile", "rounded-tile"],
              ["card", "rounded-card"],
              ["hero", "rounded-hero"],
              ["sheet", "rounded-sheet"],
            ] as const
          ).map(([n, cls]) => (
            <span
              key={n}
              className={`flex h-20 w-24 items-center justify-center border border-rule bg-card text-xs ${cls}`}
            >
              {n}
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {(
            [
              ["card", "shadow-card"],
              ["raised", "shadow-raised"],
              ["sheet", "shadow-sheet"],
            ] as const
          ).map(([n, cls]) => (
            <span
              key={n}
              className={`flex h-20 w-24 items-center justify-center rounded-card bg-card text-xs ${cls}`}
            >
              {n}
            </span>
          ))}
        </div>
      </Block>

      <Block
        title="Type"
        hint="13px is a floor, not a preference — nothing in the app is allowed below it."
      >
        <div className="space-y-2 rounded-card border border-rule bg-card p-4">
          <p className="font-display text-[1.625rem] font-medium tracking-[-0.015em]">
            Display 26 — page titles
          </p>
          <p className="text-[1.3125rem] font-semibold leading-tight">Title 21 — hero</p>
          <p className="text-[1.0625rem] font-semibold">Subtitle 17 — card and row titles</p>
          <p className="text-sm">Body 15 — the default UI and body size</p>
          <p className="text-xs text-ink-soft">Meta 13 — the floor</p>
          <p className="text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
            Eyebrow 13 — section labels
          </p>
          <p lang="hi" className="hi text-base">
            देवनागरी — जीवन विद्या एक परिचय
          </p>
        </div>
      </Block>

      <Block title="Hero" hint="Six screens draw this. Two variants and a pile of optional parts.">
        <div className="space-y-6">
          <CollectionHero
            tone="var(--ws-color)"
            back={{ href: "#", label: "Books" }}
            topRight={
              <HeroIconButton aria-label="Share">
                <ShareIcon className="h-4.5 w-4.5" />
              </HeroIconButton>
            }
            thumb={
              <span
                aria-hidden
                className="h-[7.5rem] w-[5.25rem] shrink-0 rounded-tile border border-white/25 bg-white/20"
              />
            }
            title="जीवन विद्या एक परिचय"
            meta="A. Nagraj · 16 Chapters · 110 pages"
            chips={["Originals", "Parichay"]}
            progress={{ percent: 34, label: "34% complete" }}
            actions={
              <div className="flex items-center gap-3">
                <HeroAction href="#" tone="var(--ws-color)">
                  <PlayIcon className="h-4.5 w-4.5" />
                  Resume · पृष्ठ 4
                </HeroAction>
                <HeroIconButton aria-label="Download">
                  <DownloadIcon className="h-4.5 w-4.5" />
                </HeroIconButton>
              </div>
            }
          />
          <CollectionHero
            tone="var(--ws-color)"
            back={{ href: "#", label: "Collections" }}
            title="ग्रंथ — पूर्व संस्करण"
            description="Earlier editions of the published works"
          />
          <CollectionHero
            tone="var(--ws-color)"
            back={{ href: "#", label: "Back" }}
            variant="compact"
            title="जीवन विद्या एक परिचय"
          />
        </div>
      </Block>

      <Block title="Cards">
        <div className="grid grid-cols-2 gap-3">
          <CollectionCard
            href="#"
            kind="pdf"
            title="संवाद व शिविर"
            description="Samvaad — conversations with Nagraj ji, transcribed"
            meta="15 PDFs · 2 folders"
          />
          <CollectionCard
            href="#"
            kind="video"
            eyebrow="मूल ग्रंथ / वीडियो"
            title="सम्मेलन — मसूरी 2005"
            meta="3 hours · 5 videos"
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <StatTile href="#" kind="pdf" label="PDFs" count={64} />
          <StatTile href="#" kind="folder" label="Samvaad" count={138} />
          <StatTile href="#" kind="audio" label="Shivir" count={46} />
        </div>
        <div className="mt-3">
          <PromoBand
            href="#"
            title="Audio & Video"
            subtitle="Samvaad, talks & shivir — listen or watch"
          />
        </div>
      </Block>

      <Block title="Rows">
        <div className="rounded-card border border-rule bg-card px-4 shadow-card">
          <RowGroup>
            {[
              ["0", "Front-matter", "8 pages"],
              ["1", "जीवन विद्या : एक परिचय", "16 pages"],
              ["2", "जीवन विद्या", "19 pages"],
            ].map(([n, t, m]) => (
              <li key={n}>
                <ListRow href="#" leading={<RowNumber>{n}</RowNumber>} title={t} meta={m} />
              </li>
            ))}
          </RowGroup>
        </div>

        <div className="mt-3 space-y-3">
          <RowCard
            footer={
              <>
                <RowAction href="#" icon={<ExternalLinkIcon className="h-4 w-4" />}>
                  Open in a new tab
                </RowAction>
                <RowAction href="#" download icon={<DownloadIcon className="h-4 w-4" />}>
                  Download
                </RowAction>
              </>
            }
          >
            <ListRow
              href="#"
              leading={<KindTile kind="pdf" size="lg" />}
              title="प्रकाशित_संवाद भाग 1_2018"
              meta="PDF · 220 pages · 441 KB"
            />
          </RowCard>
          <RowCard>
            <ListRow
              leading={<KindTile kind="audio" />}
              title="मानव का लक्ष्य और कार्यक्रम"
              meta="This is a sample description"
              trailing={<span className="text-sm font-semibold tabular-nums text-ink">1:12:05</span>}
            />
          </RowCard>
        </div>
      </Block>

      <Block title="Segmented, tabs & chips">
        <div className="space-y-4">
          <CountedSegmented
            label="Kind"
            value="all"
            onChange={() => undefined}
            segments={[
              { value: "all", label: "All", count: 73 },
              { value: "audio", label: "Audios", count: 35, icon: <WaveformIcon className="h-4 w-4" /> },
              { value: "video", label: "Videos", count: 38, icon: <VideoIcon className="h-4 w-4" /> },
            ]}
          />
          <CountTabs
            label="Book"
            value="chapters"
            tabs={[
              { value: "chapters", label: "Chapters", count: 4, href: "#" },
              { value: "highlights", label: "Highlights & Notes", count: 2, href: "#" },
            ]}
          />
          <ChipRow label="Genres">
            <Chip label="All 2" selected variant="tint" onClick={() => undefined} />
            <Chip label="With Notes 1" onClick={() => undefined} />
            <Chip label="Sort by Chapters" onClick={() => undefined} />
          </ChipRow>
          <ChipRow label="Topics">
            <Chip label="अस्तित्व" selected onClick={() => undefined} />
            <Chip label="मानव" selected onClick={() => undefined} />
            <Chip label="व्यवस्था" onClick={() => undefined} />
          </ChipRow>
        </div>
      </Block>

      <Block title="Finding & filtering">
        <FindRow
          search={
            <div className="flex min-h-12 items-center rounded-2xl border border-rule bg-card px-4 text-sm text-ink-soft">
              Search by name, topic, year…
            </div>
          }
          filters={<FilterButton count={topics.length} onClick={() => setSheet("filters")} />}
        />
        <div className="mt-3">
          <ActiveFilters
            items={topics.map((t) => ({
              key: t,
              label: t,
              onRemove: () => setTopics((v) => v.filter((x) => x !== t)),
            }))}
            onClear={() => setTopics([])}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <SheetTextAction onClick={() => setSheet("chapters")}>
            Open the chapter picker
          </SheetTextAction>
        </div>
      </Block>

      <Block
        title="The book"
        hint="This is the only block that follows the reading surface. Flip it at the top and watch."
      >
        <div className="reader-surface overflow-hidden rounded-card border border-(--reader-rule)">
          <div
            data-reader-chrome
            className="flex items-center gap-2 border-b border-(--reader-rule) px-4 py-2 text-(--reader-ink)"
          >
            <span className="text-xs font-semibold">जीवन विद्या : एक परिचय</span>
            <span className="ms-auto text-xs text-(--reader-ink-soft)">Chapter 3 · Page 19</span>
          </div>
          <div className="reader-content py-4">
            <p lang="hi" className="hi">
              जीवन को मैं समझा हूँ, आपको समझाने का प्रयास यहाँ से शुरू होता है। इस{" "}
              <span className="paribhasha-word">प्रक्रिया</span> का नाम “जीवन विद्या” है।{" "}
              <span className="rounded-md" style={{ background: "var(--color-hl-amber)" }}>
                पहले आपको स्पष्ट करना चाहते हैं
              </span>{" "}
              जीवन में समानता नित्य विद्यमान है।
            </p>
          </div>
        </div>
      </Block>

      <div className="h-16" />

      <Sheet
        open={sheet === "filters"}
        onClose={() => setSheet("none")}
        title="Filters"
        actions={<SheetTextAction onClick={() => setTopics([])}>Clear all</SheetTextAction>}
        footer={<SheetAction onClick={() => setSheet("none")}>Show 18 recordings</SheetAction>}
      >
        <FilterSection
          icon={<TagIcon className="h-4 w-4" />}
          label="By topic"
          status={topics.length > 0 ? `${topics.length} selected` : undefined}
        >
          <div className="flex flex-wrap gap-2">
            {["अस्तित्व", "मानव", "व्यवस्था", "शिक्षा", "परिवार", "स्वास्थ्य"].map((t) => (
              <Chip
                key={t}
                label={t}
                selected={topics.includes(t)}
                onClick={() => setTopics((v) => toggle(v, t))}
              />
            ))}
          </div>
        </FilterSection>
        <FilterSection icon={<ChevronRight className="h-4 w-4" />} label="Sort by">
          <RadioList
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={[
              { value: "new", label: "Newest first" },
              { value: "old", label: "Oldest first" },
              { value: "long", label: "Longest first" },
            ]}
          />
        </FilterSection>
      </Sheet>

      <Sheet
        open={sheet === "chapters"}
        onClose={() => setSheet("none")}
        title="Chapters"
        actions={<SheetTextAction onClick={() => setChapters([])}>Clear</SheetTextAction>}
        footer={<SheetAction onClick={() => setSheet("none")}>Apply</SheetAction>}
      >
        <div className="px-2 py-2">
          <CheckRow
            label="4 · जीवन का स्वरूप"
            meta="1 हाइलाइट · 1 नोट"
            checked={chapters.includes("4")}
            onChange={() => setChapters((v) => toggle(v, "4"))}
          />
          <CheckRow
            label="2 · जीवन विद्या"
            meta="1 हाइलाइट · 1 नोट"
            checked={chapters.includes("2")}
            onChange={() => setChapters((v) => toggle(v, "2"))}
          />
          <CheckRow label="3 · प्रश्न-उत्तर" meta="कोई हाइलाइट नहीं" checked={false} disabled onChange={() => undefined} />
        </div>
      </Sheet>
    </div>
  );
}
