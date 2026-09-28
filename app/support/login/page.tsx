"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import AuthCard, { buttonClass, inputClass, Notice } from "@/components/auth/AuthCard";
import { auth } from "@/lib/firebase";
import { BRAND } from "@/lib/brand";
import { recordFailedSignIn, recordSignIn } from "@/app/actions/session";

export default function SupportLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError("Enter your email and password.");
    setError("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const token = await cred.user.getIdTokenResult(true);
      if (token.claims.support !== true) {
        void recordFailedSignIn(email, "support", "not-support");
        await signOut(auth);
        return setError("This is not a support team account. Restaurant owners log in at the partner portal.");
      }
      void recordSignIn(token.token, "support");
      router.push("/support");
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "unknown";
      void recordFailedSignIn(email, "support", code);
      setError(
        code === "auth/user-disabled"
          ? "This support account has been deactivated. Contact ScanDish."
          : code === "auth/too-many-requests"
            ? "Too many attempts. Wait a few minutes or reset your password."
            : "Incorrect email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Support Team Portal" subtitle="Sign in to onboard and help new ScanDish businesses.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">Email</label>
          <input id="email" type="email" autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <Link href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"} className="text-sm font-semibold" style={{ color: BRAND.color }}>
              Forgot password?
            </Link>
          </div>
          <input id="password" type="password" autoComplete="current-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        New member?{" "}
        <Link href="/support/signup" className="font-semibold" style={{ color: BRAND.color }}>
          Create your password with your invite code
        </Link>
      </p>
    </AuthCard>
  );
}
