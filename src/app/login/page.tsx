import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/LoginForm";
import { getServerSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

async function LoginContent({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const [session, { reset }] = await Promise.all([getServerSession(), searchParams]);
  if (session) redirect("/dashboard");
  return <LoginForm notice={reset ? "Password updated. Sign in with your new password." : undefined} />;
}

// Reads the session and URL on every request, so that part streams inside Suspense (Cache Components).
export default function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <Suspense fallback={null}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
