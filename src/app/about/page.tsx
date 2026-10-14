import type { Metadata } from "next";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import { PageContainer } from "@/components/ui";
import { BackButton } from "@/components/ui/BackButton";
import { VersionTap } from "@/components/shell/VersionTap";
import pkg from "../../../package.json";

export const metadata: Metadata = { title: "About" };

/**
 * **About** — the app's version, what it is for, and who to reach. Opened from
 * the account menu (designer, 13 Oct 2026).
 *
 * The version is `package.json`'s, read here on the server so there is one
 * number to bump at a release, and the rest of package.json never reaches the
 * browser.
 */
export default function AboutPage() {
  return (
    <AppAccent>
      <PageContainer>
        <div className="flex items-center gap-2">
          <BackButton />
          <h1 className="font-display text-2xl font-medium">About</h1>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Section title="App version">
            <VersionTap version={pkg.version} />
          </Section>

          {/* The vision and purpose from the project's founding PRD
              (MD_Study_App_PRD.docx, May 2026), as the designer asked. The
              free-of-charge line stays under it: it is what a reader may do
              with the contents, which the vision does not say. */}
          <Section title="Purpose of the app">
            <p className="text-ink-soft">
              A unified digital ecosystem for studying, understanding, practicing and sharing
              Madhyasth Darshan, by Shri A. Nagraj — through reading, listening, watching, guided
              learning journeys, community engagement and AI-powered assistance.
            </p>
            <ul className="mt-3 flex list-disc flex-col gap-1 ps-5 text-ink-soft marker:text-ink-soft/60">
              {PURPOSE.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-ink-soft">
              Provided free of charge. The contents may be used for personal study.
            </p>
          </Section>

          <Section title="Official website">
            <a
              href="https://madhyasth.org"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline-offset-2 hover:underline"
              style={{ color: "var(--ws-ink)" }}
            >
              madhyasth.org
            </a>
            <p className="mt-2 text-sm text-ink-soft">© Divya Path Sansthan, Amarkantak</p>
          </Section>

          <Section title="Contact">
            <a
              href="mailto:app@madhyasth.org"
              className="font-medium underline-offset-2 hover:underline"
              style={{ color: "var(--ws-ink)" }}
            >
              app@madhyasth.org
            </a>
          </Section>
        </div>
      </PageContainer>
    </AppAccent>
  );
}

const PURPOSE = [
  "Structured access to MD literature and study resources",
  "Self-study and guided learning",
  "Access in many languages",
  "A connected learning community",
  "AI-assisted understanding and research",
  "One place for publishers, learners and contributors",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-rule bg-card p-4">
      <h2 className="mb-1.5 text-base font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}
