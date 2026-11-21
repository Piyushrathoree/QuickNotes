import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Centered card shell shared by the login, forgot-password and reset-password screens. */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <section className="w-full max-w-sm rounded-2xl border border-border bg-pad p-7 shadow-sm">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description && <p className="mt-2 text-sm leading-6 text-secondary-foreground">{description}</p>}
      <div className="mt-6">{children}</div>
      {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
    </section>
  );
}

export const authInputClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none transition-colors duration-150 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

export const authLinkClass =
  "rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring";
