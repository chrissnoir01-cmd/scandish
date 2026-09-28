"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import AuthCard, { buttonClass, inputClass, Notice } from "@/components/auth/AuthCard";
import { auth } from "@/lib/firebase";
import { MIN_PASSWORD_LENGTH } from "@/lib/brand";

type State =
  | { step: "checking" }
  | { step: "reset-form"; email: string }
  | { step: "reset-done"; email: string }
  | { step: "email-verified" }
  | { step: "email-recovered"; email: string }
  | { step: "invalid"; reason: string };

const code = (err: unknown) => (err as { code?: string })?.code ?? "";

function linkError(err: unknown): string {
  switch (code(err)) {
    case "auth/expired-action-code":
      return "This link has expired. Links are valid for 1 hour — request a new one.";
    case "auth/invalid-action-code":
      return "This link is invalid or has already been used. Request a new one.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/user-not-found":
      return "This account no longer exists. Please contact support.";
    case "auth/network-request-failed":
      return "No connection. Check your internet and reload this page.";
    default:
      return "Something went wrong with this link. Request a new one or contact support.";
  }
}

export default function ActionHandler({ mode, oobCode }: { mode: string; oobCode: string }) {
  const [state, setState] = useState<State>({ step: "checking" });
  // Codes for verify/recover are single-use; don't apply twice (e.g. React dev double effects).
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const run = async (): Promise<State> => {
      if (!oobCode) return { step: "invalid", reason: "This link is incomplete. Open it directly from the email." };
      try {
        switch (mode) {
          case "resetPassword":
            return { step: "reset-form", email: await verifyPasswordResetCode(auth, oobCode) };
          case "verifyEmail":
            await applyActionCode(auth, oobCode);
            await auth.currentUser?.reload();
            return { step: "email-verified" };
          case "recoverEmail": {
            const info = await checkActionCode(auth, oobCode);
            await applyActionCode(auth, oobCode);
            return { step: "email-recovered", email: info.data.email ?? "" };
          }
          default:
            return { step: "invalid", reason: "This link is not supported. Open it directly from the email." };
        }
      } catch (err) {
        return { step: "invalid", reason: linkError(err) };
      }
    };

    run().then(setState);
  }, [mode, oobCode]);

  switch (state.step) {
    case "checking":
      return (
        <AuthCard title="One moment…" subtitle="Checking your link.">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#f3d8cf] border-t-[#f08c6c]" />
        </AuthCard>
      );

    case "reset-form":
      return (
        <ResetForm
          email={state.email}
          oobCode={oobCode}
          onDone={() => setState({ step: "reset-done", email: state.email })}
          onInvalid={(reason) => setState({ step: "invalid", reason })}
        />
      );

    case "reset-done":
      return (
        <AuthCard title="Password changed" subtitle="You can now log in with your new password.">
          <Link href={`/login?email=${encodeURIComponent(state.email)}`} className={`${buttonClass} block text-center`}>
            Go to login
          </Link>
        </AuthCard>
      );

    case "email-verified":
      return (
        <AuthCard title="Email verified" subtitle="Thanks — your email address is confirmed.">
          <Link href="/dashboard" className={`${buttonClass} block text-center`}>
            Go to dashboard
          </Link>
        </AuthCard>
      );

    case "email-recovered":
      return (
        <AuthCard title="Email restored" subtitle={`Your login email is back to ${state.email}.`}>
          <div className="space-y-4">
            <Notice tone="info">
              If you didn&apos;t request the email change, reset your password now to secure your account.
            </Notice>
            <Link href={`/forgot-password?email=${encodeURIComponent(state.email)}`} className={`${buttonClass} block text-center`}>
              Reset password
            </Link>
          </div>
        </AuthCard>
      );

    case "invalid":
      return (
        <AuthCard title="This link can't be used">
          <div className="space-y-4">
            <Notice tone="error">{state.reason}</Notice>
            {mode === "resetPassword" && (
              <Link href="/forgot-password" className={`${buttonClass} block text-center`}>
                Request a new link
              </Link>
            )}
            <p className="text-center text-sm">
              <Link href="/login" className="font-semibold text-[#f08c6c]">
                Back to login
              </Link>
            </p>
          </div>
        </AuthCard>
      );
  }
}

function ResetForm({
  email,
  oobCode,
  onDone,
  onInvalid,
}: {
  email: string;
  oobCode: string;
  onDone: () => void;
  onInvalid: (reason: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (password !== confirm) return setError("Passwords do not match.");

    setError("");
    setSaving(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      onDone();
    } catch (err) {
      const c = code(err);
      if (c === "auth/weak-password") setError("That password is too weak. Try a longer one.");
      else if (c === "auth/network-request-failed") setError("No connection. Check your internet and try again.");
      else onInvalid(linkError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthCard title="Choose a new password" subtitle={<>For <strong>{email}</strong></>}>
      <form onSubmit={submit} className="space-y-4">
        {/* Lets password managers save the new password against the right account. */}
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <div>
          <label htmlFor="new-password" className="mb-2 block text-sm font-medium">
            New password
          </label>
          <input
            id="new-password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            autoFocus
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            className={inputClass}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="accent-[#f08c6c]" />
          Show passwords
        </label>

        {error && <Notice tone="error">{error}</Notice>}

        <button type="submit" disabled={saving} className={buttonClass}>
          {saving ? "Saving..." : "Save new password"}
        </button>
      </form>
    </AuthCard>
  );
}
