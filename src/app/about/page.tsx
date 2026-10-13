import type { Metadata } from "next";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import { PageContainer } from "@/components/ui";
import { BackButton } from "@/components/ui/BackButton";
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
            <p className="tabular-nums text-ink-soft">v{pkg.version}</p>
          </Section>

          <Section title="Purpose of the app">
            <p className="text-ink-soft">
              This Madhyasth Darshan App is being provided free of charge with the purpose of
              furthering the Study &amp; Practice of Madhyasth Darshan, by Shri A. Nagraj. The
              contents herein may be used for personal study.
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-rule bg-card p-4">
      <h2 className="mb-1.5 text-base font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}
