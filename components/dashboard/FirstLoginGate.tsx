"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ShieldCheck } from "lucide-react";
import { completeFirstLogin } from "@/app/actions/restaurant";
import { auth, getIdToken } from "@/lib/firebase";
import { MIN_PASSWORD_LENGTH } from "@/lib/brand";

/**
 * Shown when a support team member created the account with a temporary password.
 * The manager must choose their own password and accept the Terms before continuing.
 */
export default function FirstLoginGate({ email, onDone }: { email: string; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) return setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (password !== confirm) return setError("Passwords do not match.");
    if (!accepted) return setError("Please accept the Terms of Service and Privacy Policy.");

    setError("");
    setSaving(true);
    try {
      const res = await completeFirstLogin(await getIdToken(), password, accepted);
      if (!res.ok) return setError(res.error);
      // Changing the password ends the old session; sign in again with the new one.
      await signInWithEmailAndPassword(auth, email, password);
      onDone();
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const field =
    "w-full rounded-2xl border border-[#edd4cb] px-4 py-3 outline-none focus:border-[#f08c6c] focus:ring-2 focus:ring-[#f08c6c]/20";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
        <ShieldCheck className="text-[#f08c6c]" size={32} />
        <h2 className="mt-3 text-2xl font-black">Welcome to ScanDish</h2>
        <p className="mt-2 text-sm text-gray-500">
          You signed in with a temporary password. Choose your own password to secure <strong>{email}</strong>. After this,
          only you can access your account.
        </p>

        <div className="mt-6 space-y-3">
          <input type="email" autoComplete="username" value={email} readOnly hidden />
          <input type="password" autoComplete="new-password" autoFocus placeholder={`New password (min. ${MIN_PASSWORD_LENGTH} characters)`} className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
          <input type="password" autoComplete="new-password" placeholder="Confirm new password" className={field} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <label className="flex items-start gap-3 rounded-2xl bg-[#fff8f5] p-3 text-sm text-gray-600">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#f08c6c]" />
            <span>
              I accept the{" "}
              <a href="/terms" target="_blank" className="font-semibold text-[#d9694a]">Terms of Service</a> and{" "}
              <a href="/privacy" target="_blank" className="font-semibold text-[#d9694a]">Privacy Policy</a> of ScanDish, a service of Ironic Lab Inc.
            </span>
          </label>
        </div>

        {error && <p role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button type="submit" disabled={saving} className="mt-6 w-full rounded-2xl bg-[#f08c6c] py-4 font-bold text-white disabled:opacity-50">
          {saving ? "Saving..." : "Save my password"}
        </button>
      </form>
    </div>
  );
}
