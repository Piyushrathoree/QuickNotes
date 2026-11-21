"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { AuthCard, authInputClass, authLinkClass } from "@/components/auth/AuthCard";
import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH, describeAuthError } from "@/components/auth/errors";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { signIn, signUp } from "@/lib/auth-client";

type Mode = "signin" | "signup";

export function LoginForm({ notice }: { notice?: string }) {
  const router = useRouter();
  const emailId = useId();
  const nameId = useId();
  const errorId = useId();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === "signup";

  function switchMode() {
    setMode(isSignUp ? "signin" : "signup");
    setError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) {
      setError("Enter a valid email address.");
      return;
    }
    if (isSignUp && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);
      return;
    }

    setError(null);
    setBusy(true);
    const { error: requestError } = isSignUp
      ? await signUp.email({ name: name.trim() || address.split("@")[0], email: address, password })
      : await signIn.email({ email: address, password });

    if (requestError) {
      setBusy(false);
      setError(
        describeAuthError(
          requestError,
          isSignUp ? "We couldn't create your account. Please try again." : "We couldn't sign you in. Please try again.",
        ),
      );
      return;
    }

    // Keep the button disabled while the dashboard loads.
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <AuthCard
      title={isSignUp ? "Create your account" : "Sign in to Quick Notes"}
      description={
        isSignUp
          ? "Sync your notes across devices. Your notes from this browser move into your account."
          : "Welcome back. Your notes sync across devices."
      }
      footer={
        <div className="flex flex-col gap-2">
          <p>
            {isSignUp ? "Already have an account? " : "New here? "}
            <button type="button" onClick={switchMode} className={`${authLinkClass} font-medium text-foreground`}>
              {isSignUp ? "Sign in" : "Create an account"}
            </button>
          </p>
          <Link href="/" className={authLinkClass}>
            Continue as guest
          </Link>
        </div>
      }
    >
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-brand-soft px-3 py-2 text-sm text-secondary-foreground">
          {notice}
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {isSignUp && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={nameId} className="text-sm font-medium text-foreground">
              Name <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id={nameId}
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={authInputClass}
            />
          </div>
        )}
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
        <PasswordInput
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          placeholder={isSignUp ? "At least 8 characters" : "Enter your password"}
          hint={isSignUp ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
          invalid={Boolean(error)}
          describedBy={error ? errorId : undefined}
          labelAside={
            !isSignUp && (
              <Link href="/forgot-password" className={`${authLinkClass} text-sm text-muted-foreground`}>
                Forgot password?
              </Link>
            )
          }
        />
        {error && (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="h-10 w-full">
          {busy ? (isSignUp ? "Creating account…" : "Signing in…") : isSignUp ? "Create account" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
