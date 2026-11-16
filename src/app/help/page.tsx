import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { InstallCard } from "@/components/settings/InstallCard";
import { ShowWelcomeButton } from "@/components/help/ShowWelcomeButton";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import { PageContainer } from "@/components/ui";
import { BackButton } from "@/components/ui/BackButton";

export const metadata: Metadata = {
  title: "How to use MD Study",
  description: "Short answers: find a book, highlight and share a line, listen, download, change text size, install.",
};

/**
 * **How to use MD Study** (16 Nov 2026, UX audit IN7).
 *
 * The only "how do I...?" answers in the app were hints inside empty states a
 * reader meets once they are already stuck, and the welcome cards played once
 * with no way back. This is the one place to look: six short answers in the
 * order people ask them, and the welcome again at the foot. Opened from the
 * account menu and from Settings.
 *
 * Plain text for now. Each answer could carry a small picture (a screenshot of
 * the press-and-hold menu, the Aa button) — see the report note on IN7.
 *
 * **Keep it true.** Each line names a control that exists; rename the control
 * and the line in the same change.
 */
export default function HelpPage() {
  return (
    <AppAccent>
      <PageContainer>
        <div className="flex items-center gap-2">
          <BackButton fallback="/settings" />
          <h1 className="font-display text-2xl font-medium">How to use MD Study</h1>
        </div>
        <p className="mt-2 text-ink-soft">Six short answers. Still stuck? Use Send feedback in the account menu.</p>

        <div className="mt-5 flex flex-col gap-3">
          <Answer id="find" title="Find a book">
            <p>
              Tap <strong className="font-semibold">Books</strong> at the bottom of the screen and
              pick a book. To look something up, ask the{" "}
              <Link href="/assistant" className="font-medium underline underline-offset-2" style={{ color: "var(--ws-ink)" }}>
                Assistant
              </Link>
              : it searches the books and the Paribhasha for you.
            </p>
          </Answer>

          <Answer id="highlight" title="Highlight and share a line">
            <p>
              While reading, press and hold a line. A small menu opens: pick a colour to highlight it,
              choose Note to write beside it, or share it to send the line to someone, for example on
              WhatsApp. Everything you highlight is under My Journey.
            </p>
          </Answer>

          <Answer id="listen" title="Listen">
            <p>
              In a chapter, tap the headphones button at the bottom right. If there is no recording of
              that chapter, your phone reads it aloud. Talks and recordings are under{" "}
              <strong className="font-semibold">Media</strong>.
            </p>
          </Answer>

          <Answer id="download" title="Download to read without internet">
            <p>
              On a book&apos;s page, tap the download button to keep the whole book on this phone. What
              you have saved is listed under Settings, then{" "}
              <Link href="/downloads" className="font-medium underline underline-offset-2" style={{ color: "var(--ws-ink)" }}>
                Downloads
              </Link>
              , where you can remove it to free space.
            </p>
          </Answer>

          <Answer id="text-size" title="Change the text size">
            <p>
              While reading, tap <strong className="font-semibold">Aa</strong> at the top: Text size is
              the first control. To make the whole app larger, open the account menu and choose Display.
            </p>
          </Answer>

          <Answer id="install" title="Put it on your home screen">
            <p>Open MD Study like any other app, full screen. If it is already on your home screen, there is nothing to do.</p>
            <InstallCard className="mt-3" />
          </Answer>
        </div>

        <section className="mt-5 rounded-card border border-rule bg-card p-4">
          <h2 className="text-base font-semibold text-ink">Show the welcome again</h2>
          <p className="mt-1 text-sm text-ink-soft">
            The cards you saw when you first opened the app, from the start.
          </p>
          <div className="mt-3">
            <ShowWelcomeButton />
          </div>
        </section>
      </PageContainer>
    </AppAccent>
  );
}

function Answer({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-card border border-rule bg-card p-4">
      <h2 className="mb-1.5 text-base font-semibold text-ink">{title}</h2>
      <div className="text-ink-soft">{children}</div>
    </section>
  );
}
