"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { claimInvite } from "../actions/signup";
import { recordSignIn } from "../actions/session";
import Link from "next/link";
import { PoweredBy } from "@/components/auth/AuthCard";

const BRAND = "#f08c6c";

export default function CompanySignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !inviteCode || !password || !confirmPassword) {
      return setError("Please fill in all fields.");
    }
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (!acceptedTerms) return setError("Please accept the Terms of Service and Privacy Policy.");

    setError("");
    setLoading(true);
    try {
      const res = await claimInvite({ email, inviteCode, password, acceptedTerms });
      if (!res.ok) return setError(res.error);
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      void cred.user.getIdToken().then((t) => recordSignIn(t, "portal"));
      router.push("/dashboard");
    } catch {
      setError("Signup failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fff8f5] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-[#f2ddd6] rounded-3xl shadow-sm p-6">
        <div className="text-center mb-6">
          <p className="text-sm font-semibold" style={{ color: BRAND }}>
            ScanDish
          </p>
          <h1 className="text-2xl font-bold mt-1">Create Company Password</h1>
          <p className="text-sm text-gray-500 mt-2">
            Use the email and invite code given by ScanDish MasterAdmin.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-3">
          <input
            type="email"
            autoComplete="email"
            placeholder="Company Email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            placeholder="Invite Code"
            className="input uppercase"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          />

          <input
            type="password"
            autoComplete="new-password"
            placeholder="New Password (min. 8 characters)"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm Password"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <label className="flex items-start gap-3 rounded-2xl bg-[#fff8f5] p-3 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#f08c6c]"
            />
            <span>
              I have read and accept the{" "}
              <Link href="/terms" target="_blank" className="font-semibold" style={{ color: BRAND }}>
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="font-semibold" style={{ color: BRAND }}>
                Privacy Policy
              </Link>{" "}
              of ScanDish, a service of Ironic Lab Inc.
            </span>
          </label>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl px-5 py-3 text-white font-semibold disabled:opacity-60"
            style={{ backgroundColor: BRAND }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already created password?{" "}
          <Link href="/login" className="font-semibold" style={{ color: BRAND }}>
            Login
          </Link>
        </p>
        <PoweredBy className="mt-6" />
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #efd6ce;
          border-radius: 16px;
          padding: 12px 14px;
          outline: none;
          background: white;
        }

        .input:focus {
          border-color: ${BRAND};
          box-shadow: 0 0 0 3px ${BRAND}22;
        }
      `}</style>
    </main>
  );
}