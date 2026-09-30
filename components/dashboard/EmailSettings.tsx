"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  verifyBeforeUpdateEmail,
  type User,
} from "firebase/auth";
import { CircleCheck, Loader2, Mail, Pencil, X } from "lucide-react";

/** Clear messages for Firebase errors on this screen. */
function emailError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/too-many-requests":
      return "Too many emails were sent. Wait a few minutes, then try again.";
    case "auth/network-request-failed":
      return "No internet connection. Check it and try again.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "That password is not correct.";
    case "auth/email-already-in-use":
      return "Another ScanDish account already uses that email.";
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/requires-recent-login":
      return "For your security, sign out and sign in again, then retry.";
    case "auth/operation-not-allowed":
      return "Changing the email isn't enabled for this account. Contact ScanDish support.";
    default:
      return "The email could not be sent. Try again in a few minutes.";
  }
}

/**
 * Login email: send (and resend) the verification email — the badge turns to Verified by itself
 * once the link is clicked — and change the login email with confirmation from the new inbox.
 */
export default function EmailSettings({ user, notify }: { user: User; notify: (msg: string, type?: "success" | "error") => void }) {
  const [verified, setVerified] = useState(user.emailVerified);
  const [sending, setSending] = useState(false);
  const [sentAt, setSentAt] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [changing, setChanging] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });

  /** Asks Firebase for the latest account state (verified yet?). */
  const refresh = useCallback(async () => {
    try {
      await user.reload();
      if (user.emailVerified) {
        await user.getIdToken(true);
        setVerified(true);
        return true;
      }
    } catch {
      // Offline for a moment: the next check will do.
    }
    return false;
  }, [user]);

  // After sending, check every few seconds (and when the owner comes back to this tab) until verified.
  useEffect(() => {
    if (verified || !sentAt) return;
    let stopped = false;
    const tick = async () => {
      if (!stopped && (await refresh())) notifyRef.current("Email verified");
    };
    const timer = setInterval(tick, 5000);
    const onFocus = () => void tick();
    window.addEventListener("focus", onFocus);
    const stopAfter = setTimeout(() => clearInterval(timer), 15 * 60_000);
    return () => {
      stopped = true;
      clearInterval(timer);
      clearTimeout(stopAfter);
      window.removeEventListener("focus", onFocus);
    };
  }, [verified, sentAt, refresh]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendVerification = async () => {
    if (sending || cooldown > 0) return;
    setSending(true);
    try {
      if (await refresh()) {
        notify("This email is already verified");
        return;
      }
      await sendEmailVerification(user, { url: `${window.location.origin}/dashboard` });
      setSentAt(Date.now());
      setCooldown(60);
      notify(`Verification email sent to ${user.email}. Check the inbox and the spam folder.`);
    } catch (err) {
      notify(emailError(err), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Mail className="shrink-0 text-[#f08c6c]" size={20} />
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Login Email</p>
            <p className="truncate font-bold">{user.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {verified ? (
            <span className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-[10px] font-black uppercase text-green-600">
              <CircleCheck size={12} /> Email verified
            </span>
          ) : (
            <button
              type="button"
              onClick={sendVerification}
              disabled={sending || cooldown > 0}
              className="flex items-center gap-1.5 rounded-full bg-[#f08c6c] px-3 py-1.5 text-[11px] font-black uppercase text-white active:scale-95 disabled:opacity-60"
            >
              {sending && <Loader2 size={12} className="animate-spin" />}
              {cooldown > 0 ? `Resend in ${cooldown}s` : sentAt ? "Resend email" : "Verify email"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setChanging(true)}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase text-gray-600 hover:bg-gray-100"
          >
            <Pencil size={12} /> Change email
          </button>
        </div>
      </div>
      {!verified && sentAt > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          Waiting for you to click the link in the email… This updates by itself. The link expires after a while — if it says it expired,
          press Resend.
        </p>
      )}
      {pendingEmail && (
        <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-xs text-blue-800">
          A confirmation link was sent to <strong>{pendingEmail}</strong>. Your login email changes when you click it — then sign in with
          the new address. Your menu, orders, settings and subscription stay exactly the same.
        </p>
      )}
      {changing && (
        <ChangeEmailDialog
          user={user}
          onClose={() => setChanging(false)}
          onSent={(email) => {
            setChanging(false);
            setPendingEmail(email);
            notify(`Confirmation link sent to ${email}`);
          }}
        />
      )}
    </div>
  );
}

function ChangeEmailDialog({ user, onClose, onSent }: { user: User; onClose: () => void; onSent: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = email.trim().toLowerCase();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(next)) return setError("Enter a valid email address.");
    if (next === (user.email ?? "").toLowerCase()) return setError("That is already your login email.");
    if (!password) return setError("Enter your current password.");
    setBusy(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? "", password));
      // Firebase emails the new address; the login changes only after that link is clicked.
      await verifyBeforeUpdateEmail(user, next, { url: `${window.location.origin}/login` });
      onSent(next);
    } catch (err) {
      setError(emailError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/50 sm:items-center sm:p-6" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-label="Change login email" onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-black text-gray-900">Change login email</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          We&apos;ll send a confirmation link to the new address. Only the email changes — your menu, orders, staff devices, statistics,
          subscription and settings stay linked to your account.
        </p>
        <label className="mt-5 block">
          <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-gray-400">New email</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-[#f08c6c]" />
        </label>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-gray-400">Current password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-[#f08c6c]" />
        </label>
        {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f08c6c] py-3.5 font-black text-white disabled:opacity-50">
          {busy && <Loader2 className="h-5 w-5 animate-spin" />} Send confirmation link
        </button>
      </form>
    </div>
  );
}
