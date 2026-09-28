"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthCard, { buttonClass, inputClass, Notice } from "@/components/auth/AuthCard";
import { BRAND } from "@/lib/brand";
import { requestPasswordReset, RESET_MESSAGES } from "@/lib/password-reset";

const RESEND_SECONDS = 60;

export default function ForgotPasswordForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || cooldown > 0) return;
    setError("");
    setSending(true);
    const result = await requestPasswordReset(email);
    setSending(false);
    if (result === "sent") {
      setSentTo(email.trim().toLowerCase());
      setCooldown(RESEND_SECONDS);
    } else {
      setError(RESET_MESSAGES[result]);
    }
  };

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter the email you use to log in and we'll send you a link to choose a new password."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            autoFocus={!initialEmail}
            placeholder="you@example.com"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        {sentTo && (
          <Notice tone="success">
            If an account exists for <strong>{sentTo}</strong>, a reset link is on its way. It expires in 1 hour —
            check your spam folder if you don&apos;t see it within a few minutes.
          </Notice>
        )}

        <button type="submit" disabled={sending || cooldown > 0} className={buttonClass}>
          {sending ? "Sending..." : cooldown > 0 ? `Resend link in ${cooldown}s` : sentTo ? "Resend link" : "Send reset link"}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-center text-sm text-gray-500">
        <p>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold" style={{ color: BRAND.color }}>
            Back to login
          </Link>
        </p>
        <p>
          No longer have access to this email?{" "}
          <a href={BRAND.supportWhatsApp} target="_blank" rel="noreferrer" className="font-semibold" style={{ color: BRAND.color }}>
            Contact support
          </a>
        </p>
      </div>
    </AuthCard>
  );
}
