"use client";

import { Mail01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { AuthCard, authInputClass, authLinkClass } from "@/components/auth/AuthCard";
import { EMAIL_PATTERN, describeAuthError } from "@/components/auth/errors";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const emailId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) {
      setError("Enter a valid email address.");
      return;
    }

    setError(null);
    setBusy(true);
    const { error: requestError } = await requestPasswordReset({ email: address, redirectTo: "/reset-password" });
    setBusy(false);
    if (requestError) {
      setError(describeAuthError(requestError, "We couldn't send the email. Please try again in a moment."));
      return;
    }
    setEmail(address);
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard
        title="Check your email"
        description={
          <>
            If an account exists for <span className="font-medium text-foreground">{email}</span>, we sent a link to reset
            the password. It works once and expires in an hour.
          </>
        }
        footer={
          <Link href="/login" className={authLinkClass}>
            Back to sign in
          </Link>
        }
      >
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Icon icon={Mail01Icon} />
        </div>
        <Button type="button" variant="outline" className="mt-6 h-10 w-full bg-pad hover:bg-hover" onClick={() => setSent(false)}>
          Use a different email
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email and we'll send you a link to choose a new one."
      footer={
        <Link href="/login" className={authLinkClass}>
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={emailId} className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id={emailId}
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={authInputClass}
          />
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="h-10 w-full">
          {busy ? "Sending…" : "Email me a reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
