import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import { PageContainer } from "@/components/ui";
import { BackButton } from "@/components/ui/BackButton";

export const metadata: Metadata = {
  title: "What we keep",
  description: "What MD Study keeps about you, where, who sees it, and how to turn each part off.",
};

/**
 * **What we keep** (16 Nov 2026, UX audit TR7).
 *
 * The app's only privacy words were a cookie banner and one switch called
 * "Anonymous (Google Analytics)". Nothing said that a signed-in reader's
 * phone, city and notes sit on the server, that their name shows in shivir
 * groups, or what a feedback report carries — and "cookies" and "analytics"
 * are not words most readers here use. This page says it plainly, in four
 * parts: on this phone, on your account, who sees what, and how to change
 * your mind.
 *
 * **Keep it true.** Every line describes something the code does today. A
 * new thing stored, sent or shown is a line here in the same change — this
 * page is a promise, and it is only worth as much as its least true line.
 */
export default function PrivacyPage() {
  return (
    <AppAccent>
      <PageContainer>
        <div className="flex items-center gap-2">
          <BackButton fallback="/settings" />
          <h1 className="font-display text-2xl font-medium">What we keep</h1>
        </div>
        <p lang="hi" className="hi-note mt-2 text-ink-soft">
          आपके बारे में ऐप क्या रखता है, कहाँ रखता है, कौन देख सकता है, और इसे कैसे बंद करें — सरल शब्दों में।
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <Section title="On this phone">
            <p>Without signing in, everything you do stays in this browser on this phone:</p>
            <List
              items={[
                "Your highlights, notes and bookmarks",
                "Where you are in each book and recording",
                "Your Assistant conversations and saved research",
                "Your study stage, reading settings and recent searches",
                "Books and recordings you downloaded",
              ]}
            />
            <p className="mt-2">
              Nobody else can see these. Clearing the browser&apos;s data for this site removes them.
              Assistant conversations stay on this phone even when you sign in, and signing out
              removes them.
            </p>
          </Section>

          <Section title="On your account, if you sign in">
            <p>Signing in keeps these on our server, so they reach your other devices:</p>
            <List
              items={[
                "Your name, mobile number or email, state and city",
                "Your highlights, notes, bookmarks and reading place",
                "Whether you want shivir and centre updates on WhatsApp — off until you turn it on",
                "Feedback you send, and our replies",
              ]}
            />
            <p className="mt-2">
              Questions you ask the Assistant are sent to our server to be answered, signed in or not.
            </p>
          </Section>

          <Section title="Who sees what">
            <List
              items={[
                "Your name is shown on your notes and in shivir groups.",
                "Shivir and centre updates use your city to pick what is near you.",
                "When you send feedback, we also see the screen you were on, the app version and your device. Never your notes, bookmarks or reading history.",
              ]}
            />
          </Section>

          <Section title="Usage counts (Google Analytics)">
            <p>
              Only if you agreed when the app first asked. It counts which screens are opened, without your
              name or number, so we can see what is used and what is hard to find. Nothing is counted until
              you agree.
            </p>
          </Section>

          <Section title="Changing your mind">
            <List
              items={[
                <>
                  Usage counts: switch off under{" "}
                  <InlineLink href="/settings#privacy">Settings → Privacy</InlineLink>.
                </>,
                <>
                  WhatsApp updates, name, city: change them on your{" "}
                  <InlineLink href="/profile">Profile</InlineLink>.
                </>,
                "Notifications: switch them off in Settings, or in your phone's settings for this app.",
                <>
                  To have your account and everything on it removed, write to{" "}
                  <InlineLink href="mailto:app@madhyasth.org">app@madhyasth.org</InlineLink> and give the
                  number or email you sign in with.
                </>,
              ]}
            />
          </Section>
        </div>
      </PageContainer>
    </AppAccent>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-rule bg-card p-4 text-ink-soft">
      <h2 className="mb-1.5 text-base font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 marker:text-ink-soft/60">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  const style = { color: "var(--ws-ink)" };
  const className = "font-medium underline underline-offset-2";
  return href.startsWith("mailto:") ? (
    <a href={href} className={className} style={style}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}
