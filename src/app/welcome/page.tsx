import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileStep } from "@/components/auth/ProfileStep";

export const metadata: Metadata = { title: "A little about you", robots: { index: false } };

export default function WelcomePage() {
  return (
    <Suspense>
      <ProfileStep />
    </Suspense>
  );
}
