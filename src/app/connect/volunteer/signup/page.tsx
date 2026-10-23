import type { Metadata } from "next";
import Link from "next/link";
import { BackIcon, ExternalLinkIcon } from "@/components/shell/icons";
import { PageContainer } from "@/components/ui";
import { VOLUNTEER_FORM_EMBED, VOLUNTEER_FORM_URL } from "@/lib/volunteer";

export const metadata: Metadata = {
  title: "Volunteer Sign up",
  description: "Sign up to volunteer for Jeevan Vidya program activities.",
};

/**
 * The volunteer group's Google Form, embedded.
 *
 * The form needs no Google sign-in, so it embeds as-is; answers go straight
 * to the group's sheet and this app keeps nothing. The frame fills what the
 * screen has left under the back pill and above the tab bar, and scrolls on
 * its own — Google does not tell a parent page how tall the form is. The
 * "Open in Google Forms" link is there for a browser that blocks the frame.
 */
export default function VolunteerSignupPage() {
  return (
    <PageContainer>
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/connect/volunteer"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-rule bg-card pe-3.5 ps-2.5 text-sm font-semibold text-ink transition-colors active:bg-ink/[.04]"
        >
          <BackIcon className="h-4 w-4 shrink-0" />
          Volunteer
        </Link>
        <a
          href={VOLUNTEER_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold"
          style={{ color: "var(--ws-ink)" }}
        >
          Open in Google Forms
          <ExternalLinkIcon className="h-4 w-4 shrink-0" />
        </a>
      </div>

      <iframe
        src={VOLUNTEER_FORM_EMBED}
        title="Volunteer Sign up form"
        className="mt-4 block w-full rounded-card border border-rule bg-white"
        style={{ height: "calc(100dvh - var(--bottom-nav-h, 0px) - 11rem)", minHeight: "28rem" }}
      />
    </PageContainer>
  );
}
