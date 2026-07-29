import { SegmentedNav } from "@/components/ui";

/**
 * The shared head of the Listen destination (design 5A): one "Listen" title
 * over a प्रवचन | Videos segmented control. Videos live inside the same
 * destination rather than a fifth tab — /audio and /videos are the two
 * segments of one place, so both pages open with this.
 */
export function ListenHeader({ active }: { active: "audio" | "videos" }) {
  return (
    <>
      <h1 className="font-display text-2xl font-medium">Listen</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Discourses and talks — audio keeps playing while you browse and read.
      </p>
      <div className="mt-3">
        <SegmentedNav
          label="Listen sections"
          items={[
            {
              label: (
                <span lang="hi" className="hi">
                  प्रवचन
                </span>
              ),
              href: "/audio",
              active: active === "audio",
            },
            { label: "Videos", href: "/videos", active: active === "videos" },
          ]}
        />
      </div>
    </>
  );
}
