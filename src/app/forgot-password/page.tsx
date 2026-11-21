import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password · Quick Notes",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <ForgotPasswordForm />
    </main>
  );
}
