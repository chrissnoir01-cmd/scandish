"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import AuthCard, { buttonClass, inputClass, Notice } from "@/components/auth/AuthCard";
import { auth } from "@/lib/firebase";
import { BRAND, MIN_PASSWORD_LENGTH } from "@/lib/brand";
import { claimSupportInvite } from "@/app/actions/support";
import { recordSignIn } from "@/app/actions/session";

export default function SupportSignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !inviteCode || !password) return setError("Please fill in all fields.");
    if (password.length < MIN_PASSWORD_LENGTH) return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (password !== confirm) return setError("Passwords do not match.");
    if (!accepted) return setError("You must read and accept the Support Team Agreement.");

    setError("");
    setLoading(true);
    try {
      const res = await claimSupportInvite({ email, inviteCode, password, acceptedAgreement: accepted });
      if (!res.ok) return setError(res.error);
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      // Pick up the new support claim before entering the portal.
      const token = await cred.user.getIdToken(true);
      void recordSignIn(token, "support");
      router.push("/support");
    } catch {
      setError("Signup failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Join the Support Team" subtitle="Use the email and invite code you received from ScanDish MasterAdmin.">
      <form onSubmit={submit} className="space-y-4">
        <input type="email" autoComplete="email" placeholder="Your email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Invite code (ST-…)" className={`${inputClass} uppercase`} value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} />
        <input type="password" autoComplete="new-password" placeholder={`New password (min. ${MIN_PASSWORD_LENGTH} characters)`} className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
        <input type="password" autoComplete="new-password" placeholder="Confirm password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} />

        <label className="flex items-start gap-3 rounded-2xl bg-[#fff8f5] p-3 text-sm text-gray-600">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#f08c6c]" />
          <span>
            I have read and accept the{" "}
            <Link href="/support/agreement" target="_blank" className="font-semibold" style={{ color: BRAND.color }}>
              Support Team Agreement
            </Link>
            . I understand my only earnings are the setup fees I collect, and that Ironic Lab Inc. may suspend or deactivate
            my account if I break it.
          </span>
        </label>

        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Creating account..." : "Create my account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        Already a member?{" "}
        <Link href="/support/login" className="font-semibold" style={{ color: BRAND.color }}>
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
