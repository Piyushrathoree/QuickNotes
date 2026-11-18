"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Full-width 48px primary action with an in-button spinner while a request is in flight. */
export function SubmitButton({
  busy,
  busyLabel,
  children,
  disabled,
  onClick,
}: {
  busy: boolean;
  busyLabel: string;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type="submit"
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      onClick={onClick}
      className="h-12 w-full rounded-[12px] text-base font-medium disabled:opacity-80"
    >
      {busy && (
        <span
          aria-hidden="true"
          className="size-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
        />
      )}
      {busy ? busyLabel : children}
    </Button>
  );
}
