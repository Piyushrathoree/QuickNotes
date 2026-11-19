"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export type AuthMode = "signin" | "signup";

const OPTIONS: { value: AuthMode; label: string }[] = [
  { value: "signin", label: "Sign in" },
  { value: "signup", label: "Create account" },
];

/** Two-option segmented control with radio semantics. Arrow keys, Home and End move and select. */
export function ModeSwitch({ value, onChange }: { value: AuthMode; onChange: (mode: AuthMode) => void }) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = OPTIONS.findIndex((option) => option.value === value);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (activeIndex + 1) % OPTIONS.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (activeIndex + OPTIONS.length - 1) % OPTIONS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = OPTIONS.length - 1;
    if (next === null) return;

    event.preventDefault();
    onChange(OPTIONS[next].value);
    buttons.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label="Account type" className="relative grid grid-cols-2 rounded-[14px] bg-hover p-1">
      <span
        aria-hidden="true"
        className="auth-thumb pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-[10px] border border-border bg-background shadow-xs"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {OPTIONS.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={onKeyDown}
            className={cn(
              "relative z-10 h-11 rounded-[10px] text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/35",
              checked ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
