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
            <>
              <PageTitle
                shelf
                title="Volunteer"
                description="Help with Jeevan Vidya programme activities."
              />
              {/* Said in Devanagari, then in English, before the form (16 Nov
                  2026, UX audit CN8). The only line in front of the form was
                  "samagra vyavastha mein bhaagidaari", Hindi in Roman letters,
                  and it sat behind the title's ⓘ on a phone. */}
              <p lang="hi" className="hi mt-2 text-base text-ink">
                समग्र व्यवस्था में भागीदारी का अवसर। जीवन विद्या कार्यक्रमों में सहयोग के लिए नीचे का
                फ़ॉर्म भरें — स्वयंसेवक समूह आपसे संपर्क करेगा।
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                A chance to take part. Fill in the form below and the volunteer group will get in
                touch.
              </p>
            </>
          }
        />
      </div>
    </PageContainer>
  );
}
