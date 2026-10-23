import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/shell/icons";
import { PageContainer, SectionHeading, ctaPrimary } from "@/components/ui";
import { PageTitle } from "@/components/ui/PageTitle";
import { VOLUNTEER_AREAS } from "@/lib/volunteer";

export const metadata: Metadata = {
  title: "Volunteer",
  description: "Give time to Jeevan Vidya program activities.",
};

/**
 * Connect → Volunteer (designer's comps, 23 Oct 2026).
 *
 * A phone stacks the sign-up card over the list of areas; a desktop sets them
 * side by side and lets the card drop its box, so the sign-up reads as the
 * page's subject and the list as what sits beside it. The button opens the
 * group's Google Form embedded at `/signup`.
 */
export default function VolunteerPage() {
  return (
    <PageContainer size="shelf">
      <PageTitle title="Volunteer" description="Give time to Jeevan Vidya program activities." />

      <div className="mt-5 grid gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
        <section className="self-start rounded-card border border-rule bg-card p-5 shadow-card lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <span
            className="inline-flex h-11 w-11 items-center justify-center rounded-control lg:h-12 lg:w-12"
            style={{
              background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
              color: "var(--ws-ink)",
            }}
          >
            <Icon name="volunteer" className="h-5 w-5" />
          </span>
          <h2 className="mt-3 text-title font-semibold tracking-[-0.015em] lg:mt-4 lg:font-display lg:text-4xl lg:font-medium">
            Volunteer Sign up
          </h2>
          <p className="mt-2 text-ink-soft lg:mt-4 lg:max-w-md">
            This initiative is being taken up by an independent group of students to assist Jeevan
            Vidya Program Activities.
          </p>
          <Link
            href="/connect/volunteer/signup"
            className={`${ctaPrimary} mt-5 w-full lg:mt-6 lg:w-auto`}
            style={{ background: "var(--ws-color)" }}
          >
            Sign up to volunteer
          </Link>
        </section>

        <section>
          <SectionHeading>Areas you can contribute to</SectionHeading>
          <ul className="divide-y divide-rule overflow-hidden rounded-card border border-rule bg-card">
            {VOLUNTEER_AREAS.map((area) => (
              <li key={area} className="flex gap-3 px-4 py-3 text-sm text-ink">
                <span aria-hidden="true" className="mt-[0.5em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {area}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageContainer>
  );
}
