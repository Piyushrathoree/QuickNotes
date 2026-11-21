"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { AuthCard, authLinkClass } from "@/components/auth/AuthCard";
import { MIN_PASSWORD_LENGTH, describeAuthError } from "@/components/auth/errors";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/lib/auth-client";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const errorId = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setError(null);
    setBusy(true);
    const { error: requestError } = await resetPassword({ newPassword: password, token });
    if (requestError) {
      setBusy(false);
      setError(describeAuthError(requestError, "We couldn't update your password. Please try again."));
      return;
    }
    router.replace("/login?reset=1");
  }

  return (
    <AuthCard
      title="Choose a new password"
      description="Pick something you haven't used here before."
      footer={
        <Link href="/login" className={authLinkClass}>
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <PasswordInput
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          autoFocus
          placeholder="At least 8 characters"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          invalid={Boolean(error)}
          describedBy={error ? errorId : undefined}
        />
        <PasswordInput
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          placeholder="Repeat the new password"
          invalid={Boolean(error)}
          describedBy={error ? errorId : undefined}
        />
        {error && (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="h-10 w-full">
          {busy ? "Saving…" : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}
