"use client";

import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { useId, useState, type ReactNode } from "react";
import { authInputClass } from "@/components/auth/AuthCard";
import { Icon } from "@/components/Icon";

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  autoFocus?: boolean;
  hint?: ReactNode;
  invalid?: boolean;
  describedBy?: string;
  /** Rendered on the right of the label, e.g. a "Forgot password?" link. */
  labelAside?: ReactNode;
}

export function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
  autoFocus,
  hint,
  invalid,
  describedBy,
  labelAside,
}: PasswordInputProps) {
  const id = useId();
  const hintId = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          name={autoComplete === "new-password" ? "new-password" : "password"}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={[hint ? hintId : null, describedBy ?? null].filter(Boolean).join(" ") || undefined}
          className={`${authInputClass} pr-10`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon icon={visible ? ViewOffIcon : ViewIcon} />
        </button>
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
