import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailStep } from "@/components/auth/VerifyEmailStep";

export const metadata: Metadata = { title: "Verify your email", robots: { index: false } };

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailStep />
    </Suspense>
  );
}
