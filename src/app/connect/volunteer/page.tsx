import type { Metadata } from "next";
import { VolunteerScreen } from "@/components/connect/VolunteerScreen";
import { PageContainer } from "@/components/ui";
import { PageTitle } from "@/components/ui/PageTitle";

export const metadata: Metadata = {
  title: "Volunteer",
  description: "Sign up to volunteer for Jeevan Vidya program activities.",
};

/**
 * Connect → Volunteer. The tab opens straight onto the volunteer group's
 * Google Form (designer's call, 23 Oct 2026 — the landing page in front of it
 * repeated what the form already says). After a submit, this device shows a
 * "You've signed up" note instead; see `VolunteerScreen`.
 */
export default function VolunteerPage() {
  return (
    <PageContainer size="shelf">
      <div className="mx-auto max-w-3xl lg:max-w-none">
        <VolunteerScreen
          intro={
            <PageTitle
              shelf
              title="Volunteer"
              description="A chance for samagra vyavastha mein bhaagidaari!"
            />
          }
        />
      </div>
    </PageContainer>
  );
}
