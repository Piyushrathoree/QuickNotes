import Link from "next/link";
import type { ReactNode } from "react";
import { AppMark } from "@/components/auth/AppMark";
import { authLinkClass } from "@/components/auth/AuthCard";

/** Page chrome for the account screens: wordmark, a quiet guest link, faint notepad rules, one centred column. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <div aria-hidden="true" className="auth-ruled pointer-events-none absolute inset-x-0 top-0 h-[min(640px,100%)]" />

      <header className="relative z-10 flex items-center justify-between gap-4 pt-[max(1.25rem,env(safe-area-inset-top))] pr-[max(1.25rem,env(safe-area-inset-right))] pb-4 pl-[max(1.25rem,env(safe-area-inset-left))] sm:px-8 sm:pt-6">
        <Link href="/" className={`${authLinkClass} flex items-center gap-2.5 text-[15px] font-semibold text-foreground no-underline hover:no-underline`}>
          <AppMark size={28} />
          <span>Quick Notes</span>
        </Link>
        <Link href="/" className={`${authLinkClass} min-h-11 inline-flex items-center text-sm text-secondary-foreground`}>
          Continue as guest
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 flex-col px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-[clamp(2rem,8vh,5rem)] sm:pb-12">
        <div className="mx-auto w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
