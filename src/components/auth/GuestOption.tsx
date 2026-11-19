import Link from "next/link";

/** "or" divider and the secondary way in: use the app without an account. */
export function GuestOption() {
  return (
    <>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span>or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <Link
        href="/"
        className="inline-flex h-12 w-full items-center justify-center rounded-[12px] border border-border bg-background text-base font-medium text-foreground outline-none transition-colors duration-150 hover:bg-hover focus-visible:ring-[3px] focus-visible:ring-ring/35"
      >
        Continue as guest
      </Link>
    </>
  );
}
