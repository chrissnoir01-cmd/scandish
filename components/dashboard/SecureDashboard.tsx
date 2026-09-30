"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Lock, LockOpen, ShieldCheck, X } from "lucide-react";
import { getIdToken } from "@/lib/firebase";
import { lockDashboard, unlockDashboard } from "@/app/actions/security";
import type { SecurityState } from "@/lib/types";

const NO_SECURITY: SecurityState = { premium: false, pinSet: false, unlockedUntil: 0, sessionId: "", device: "" };

/**
 * Secure Dashboard on the client: knows whether this device is locked, asks for the PIN when a
 * protected action is tried, and re-runs the action after unlocking. The server enforces the
 * same rules; this only keeps the screen honest and the flow smooth.
 */
export function useSecureDashboard() {
  const [security, setSecurity] = useState<SecurityState>(NO_SECURITY);
  const [now, setNow] = useState(() => Date.now());
  const [prompt, setPrompt] = useState<{ reason: string } | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  // Re-check the unlock time every 20 seconds so the screen locks itself when it runs out.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(t);
  }, []);

  const locked = security.premium && security.pinSet && security.unlockedUntil <= now;

  /** Opens the PIN prompt; resolves true once unlocked. */
  const requestUnlock = useCallback((reason = "This action is protected.") => {
    resolver.current?.(false);
    setPrompt({ reason });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  /** Runs `action` now, or after the PIN when the device is locked. */
  const whenUnlocked = useCallback(
    async (action: () => void | Promise<void>, reason?: string) => {
      if (locked && !(await requestUnlock(reason))) return;
      await action();
    },
    [locked, requestUnlock]
  );

  const lockNow = useCallback(async () => {
    const res = await lockDashboard(await getIdToken());
    if (res.ok) setSecurity(res.data);
  }, []);

  const finish = (ok: boolean, next?: SecurityState) => {
    if (next) setSecurity(next);
    setNow(Date.now());
    setPrompt(null);
    resolver.current?.(ok);
    resolver.current = null;
  };

  const dialog = prompt ? <PinDialog reason={prompt.reason} onCancel={() => finish(false)} onUnlocked={(s) => finish(true, s)} /> : null;

  return { security, setSecurity, locked, requestUnlock, whenUnlocked, lockNow, dialog, now };
}

/** 6 boxes for the digits; typing, pasting and backspace move between them. */
export function PinInput({ value, onChange, autoFocus = false, label }: { value: string; onChange: (v: string) => void; autoFocus?: boolean; label: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");
  const set = (i: number, d: string) => {
    const next = (value.slice(0, i) + d + value.slice(i + 1)).replace(/\s/g, "").slice(0, 6);
    onChange(next);
  };
  return (
    <div className="flex justify-center gap-2" role="group" aria-label={label}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          autoComplete="one-time-code"
          type="password"
          maxLength={1}
          aria-label={`${label} digit ${i + 1}`}
          value={d.trim()}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (!v) return;
            if (v.length > 1) {
              onChange(v.slice(0, 6));
              refs.current[Math.min(v.length, 5)]?.focus();
              return;
            }
            set(i, v);
            refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              if (value[i]) onChange(value.slice(0, i) + value.slice(i + 1));
              else if (i > 0) {
                onChange(value.slice(0, i - 1) + value.slice(i));
                refs.current[i - 1]?.focus();
              }
            }
          }}
          onPaste={(e) => {
            const v = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (v) {
              e.preventDefault();
              onChange(v);
              refs.current[Math.min(v.length, 5)]?.focus();
            }
          }}
          className="h-14 w-11 rounded-2xl border-2 border-gray-200 bg-white text-center text-2xl font-black text-gray-900 outline-none focus:border-[#f08c6c] sm:w-12"
        />
      ))}
    </div>
  );
}

function PinDialog({ reason, onCancel, onUnlocked }: { reason: string; onCancel: () => void; onUnlocked: (s: SecurityState) => void }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (value = pin) => {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await unlockDashboard(await getIdToken(), value);
      if (!res.ok) {
        setError(res.error);
        setPin("");
        return;
      }
      onUnlocked(res.data);
    } catch {
      setError("Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-label="Enter Secure Dashboard PIN" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div className="flex justify-end">
          <button type="button" onClick={onCancel} aria-label="Cancel" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff1ec] text-[#f08c6c]">
          <Lock className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-lg font-black text-gray-900">Secure Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">{reason} Enter the 6-digit PIN.</p>
        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <PinInput
            label="PIN"
            autoFocus
            value={pin}
            onChange={(v) => {
              setPin(v);
              setError("");
              if (v.length === 6) void submit(v);
            }}
          />
          {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={pin.length !== 6 || busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f08c6c] py-3.5 font-black text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LockOpen className="h-5 w-5" />} Unlock
          </button>
        </form>
        <p className="mt-4 text-xs text-gray-400">Forgot it? The owner can reset it in Security with the account password.</p>
      </div>
    </div>
  );
}

/** Header pill: shows the lock state and locks / unlocks this device. */
export function LockPill({ locked, onUnlock, onLock }: { locked: boolean; onUnlock: () => void; onLock: () => void }) {
  return locked ? (
    <button
      type="button"
      onClick={onUnlock}
      className="flex items-center gap-1.5 rounded-2xl bg-gray-900 px-3 py-2.5 text-sm font-bold text-white"
      title="Protected actions need the Secure Dashboard PIN"
    >
      <Lock size={16} /> <span className="hidden sm:inline">Locked</span>
    </button>
  ) : (
    <button
      type="button"
      onClick={onLock}
      className="flex items-center gap-1.5 rounded-2xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm font-bold text-green-700"
      title="Lock protected actions on this device now"
    >
      <ShieldCheck size={16} /> <span className="hidden sm:inline">Unlocked</span>
    </button>
  );
}

/** Banner above protected sections while the device is locked. */
export function LockedBanner({ onUnlock, what }: { onUnlock: () => void; what: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-gray-200 bg-gray-50 px-5 py-4">
      <Lock className="h-5 w-5 shrink-0 text-gray-500" />
      <p className="flex-1 text-sm text-gray-600">
        <strong className="text-gray-900">Protected.</strong> {what}
      </p>
      <button type="button" onClick={onUnlock} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white">
        Unlock with PIN
      </button>
    </div>
  );
}
