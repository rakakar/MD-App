import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPassword } from "@/components/auth/ForgotPassword";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPassword />
    </Suspense>
  );
}
