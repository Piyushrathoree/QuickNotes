import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthCard, authLinkClass } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false },
  // Keep the reset token out of the Referer header sent to other sites.
  referrer: "no-referrer",
};

async function ResetContent({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;

  return token && !error ? (
    <ResetPasswordForm token={token} />
  ) : (
    <AuthCard
      title="This link doesn't work"
      description="The reset link is invalid or has expired. Request a new one and try again."
      footer={
        <Link href="/login" className={authLinkClass}>
          Back to sign in
        </Link>
      }
    >
      <Link
        href="/forgot-password"
        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground outline-none transition-colors duration-150 hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        Request a new link
      </Link>
    </AuthCard>
  );
}

// The token comes from the URL, so it is read inside Suspense (Cache Components).
export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <Suspense fallback={null}>
        <ResetContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
