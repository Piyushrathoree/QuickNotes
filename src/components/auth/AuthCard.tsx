import type { ReactNode, Ref } from "react";

interface AuthCardProps {
  title: string;
  titleRef?: Ref<HTMLHeadingElement>;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * One account screen: serif headline and a calm sentence above a card that holds the form.
 * On phones the card has no border, background or shadow, so the form sits on the page with a 20px gutter.
 */
export function AuthCard({ title, titleRef, description, children, footer }: AuthCardProps) {
  return (
    <section className="auth-enter w-full">
      <div className="mb-7 sm:mb-8">
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="auth-serif text-[30px] leading-9 font-semibold tracking-[-0.02em] text-balance text-foreground outline-none sm:text-[34px] sm:leading-10"
        >
          {title}
        </h1>
        {description && <p className="mt-3 text-[15px] leading-6 text-secondary-foreground">{description}</p>}
      </div>
      <div className="sm:rounded-2xl sm:border sm:border-border sm:bg-pad sm:p-7 sm:shadow-pad">{children}</div>
      {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
    </section>
  );
}

/** Text inputs: 16px text (no iOS zoom), hairline border, 3px ring in the ring colour on focus. */
export const authInputClass =
  "w-full rounded-[12px] border border-border bg-background px-3.5 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground focus:border-ring focus:ring-[3px] focus:ring-ring/35 aria-invalid:border-destructive aria-invalid:focus:ring-destructive/25 disabled:opacity-60";

export const authLinkClass =
  "rounded-sm underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/35";
