import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { LogoMark } from "@/components/brand/LogoMark";
import { ConnectManager } from "@/components/connect/ConnectManager";
import { getServerSession } from "@/lib/session";
import { site } from "@/lib/site";
import "@/components/connect/connect.css";

export const metadata: Metadata = {
  title: { absolute: "Connect AI" },
  robots: { index: false, follow: false },
};

async function ConnectPageContent() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <ConnectManager serverUrl={new URL("/api/mcp", site.url).toString()} />;
}

export default function ConnectPage() {
  return (
    <div className="ca-shell">
      <header className="ca-topbar">
        <div className="ca-width ca-topbar-inner">
          <Link href="/" className="ca-brand">
            <LogoMark size={26} tile="var(--logo-tile)" />
            Quick Notes
          </Link>
          <Link href="/dashboard" prefetch={false} className="ca-back">
            <ArrowLeft size={15} aria-hidden="true" /> Your notes
          </Link>
        </div>
      </header>
      <Suspense fallback={<main className="ca-width ca-page" aria-busy="true"><h1>Connect AI</h1></main>}>
        <ConnectPageContent />
      </Suspense>
    </div>
  );
}
