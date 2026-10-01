"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { History, KeyRound, Laptop, Loader2, LogOut, RefreshCw, ShieldCheck, Smartphone, Tablet, X } from "lucide-react";
import { auth, getIdToken } from "@/lib/firebase";
import {
  createSecurePin,
  loadDevices,
  loadWeeklyLog,
  resetSecurePin,
  signOutOtherDevice,
  turnOffSecurePin,
} from "@/app/actions/security";
import { PinInput } from "./SecureDashboard";
import type { DeviceSession, SecurityLogEntry, SecurityState } from "@/lib/types";

const when = (iso: string) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kigali", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso))
    : "—";

function ago(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (!iso || Number.isNaN(min)) return "—";
  if (min < 2) return "Active now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h} h ago` : when(iso);
}

/** Confirms the account password so the server sees a fresh sign-in (needed to create, reset or remove the PIN). */
async function confirmPassword(password: string): Promise<string> {
  const user = auth.currentUser;
  if (!user?.email) throw new Error("Sign in again first.");
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  } catch {
    throw new Error("That password is not correct.");
  }
  return user.getIdToken(true);
}

/**
 * Security Center (Premium): Secure Dashboard PIN, signed-in devices with remote sign-out,
 * and this week's activity log. Devices and the log need the PIN when one is set.
 */
export default function SecurityCenter({
  security,
  locked,
  onSecurity,
  requestUnlock,
  notify,
}: {
  security: SecurityState;
  locked: boolean;
  onSecurity: (s: SecurityState) => void;
  requestUnlock: (reason?: string) => Promise<boolean>;
  notify: (msg: string, type?: "success" | "error") => void;
}) {
  const [pinFlow, setPinFlow] = useState<"create" | "reset" | "off" | null>(null);
  const [devices, setDevices] = useState<DeviceSession[] | null>(null);
  const [log, setLog] = useState<{ weekStart: string; entries: SecurityLogEntry[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState<string | null>(null);

  // The dashboard's notify changes on every render; read it through a ref so loading runs once.
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });

  /** Devices always; the weekly log (the larger read) only when asked for. */
  const load = useCallback(async (withLog = true) => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const [d, l] = await Promise.all([loadDevices(token), withLog ? loadWeeklyLog(token) : Promise.resolve(null)]);
      if (d.ok) setDevices(d.data);
      if (l?.ok) setLog(l.data);
      const failed = !d.ok ? d : l && !l.ok ? l : null;
      if (failed && failed.code !== "locked") notifyRef.current(failed.error, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (locked) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads when the device may see them
    void load();
    // The device list refreshes by itself while this screen is open; the log on Refresh.
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load(false);
    }, 120_000);
    return () => clearInterval(timer);
  }, [locked, load]);

  const signOut = async (d: DeviceSession) => {
    if (locked && !(await requestUnlock("Signing out a device is protected."))) return;
    setSigningOut(d.id);
    try {
      const res = await signOutOtherDevice(await getIdToken(), d.id);
      if (!res.ok) return notify(res.error, "error");
      setDevices((list) => list?.filter((x) => x.id !== d.id) ?? null);
      notify(`${d.device} was signed out`);
      void load();
    } finally {
      setSigningOut(null);
    }
  };

  const DeviceIcon = ({ type }: { type: DeviceSession["deviceType"] }) =>
    type === "mobile" ? <Smartphone className="h-5 w-5" /> : type === "tablet" ? <Tablet className="h-5 w-5" /> : <Laptop className="h-5 w-5" />;

  return (
    <div className="space-y-6">
      {/* Secure Dashboard */}
      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black text-gray-900">
              <ShieldCheck className="h-5 w-5 text-[#f08c6c]" /> Secure Dashboard
            </h3>
            <p className="mt-1 max-w-lg text-sm text-gray-500">
              A 6-digit PIN protects adding and editing products, prices, photos and business settings. Without it, staff can still view
              the dashboard, hide or unhide products, manage orders and print receipts.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-black ${security.pinSet ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {security.pinSet ? (locked ? "On · locked" : "On · unlocked") : "Off"}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {security.pinSet ? (
            <>
              <button type="button" onClick={() => setPinFlow("reset")} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
                <KeyRound className="h-4 w-4" /> Reset PIN
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (locked && !(await requestUnlock("Turning off the Secure Dashboard is protected."))) return;
                  setPinFlow("off");
                }}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                Turn off
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setPinFlow("create")} className="flex items-center gap-2 rounded-xl bg-[#f08c6c] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#f08c6c]/20">
              <KeyRound className="h-4 w-4" /> Create Secure Dashboard Password
            </button>
          )}
        </div>
      </section>

      {/* Devices */}
      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-black text-gray-900">
            <Laptop className="h-5 w-5 text-[#f08c6c]" /> Signed-in devices
          </h3>
          {!locked && (
            <button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700" aria-label="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
        {locked ? (
          <LockedHint what="the list of devices" onUnlock={() => void requestUnlock("The device list is protected.")} />
        ) : devices === null ? (
          <p className="flex items-center gap-2 py-6 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100">
            {devices.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-4 py-4">
                <span className={`rounded-xl p-2.5 ${d.current ? "bg-[#fff1ec] text-[#f08c6c]" : "bg-gray-100 text-gray-500"}`}>
                  <DeviceIcon type={d.deviceType} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-bold text-gray-900">
                    {d.device}
                    {d.current && <span className="rounded-full bg-[#f08c6c] px-2 py-0.5 text-[10px] font-black uppercase text-white">This device</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="capitalize">{d.deviceType}</span> · signed in {when(d.createdAt)} · last activity {ago(d.lastActiveAt)}
                  </p>
                </div>
                {!d.current && (
                  <button
                    type="button"
                    onClick={() => void signOut(d)}
                    disabled={signingOut === d.id}
                    className="flex items-center gap-1.5 rounded-xl border border-red-100 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {signingOut === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />} Sign out
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Weekly log */}
      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-black text-gray-900">
          <History className="h-5 w-5 text-[#f08c6c]" /> This week&apos;s activity
        </h3>
        <p className="mt-1 text-sm text-gray-500">Important actions since Monday. Each new week replaces the previous one.</p>
        {locked ? (
          <LockedHint what="the activity log" onUnlock={() => void requestUnlock("The activity log is protected.")} />
        ) : log === null ? (
          <p className="flex items-center gap-2 py-6 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : log.entries.length === 0 ? (
          <p className="py-6 text-sm text-gray-400">Nothing recorded yet this week.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-black uppercase tracking-widest text-gray-400">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {log.entries.map((e) => (
                  <tr key={e.id} className="align-top">
                    <td className="whitespace-nowrap py-2.5 pr-4 text-gray-500">{when(e.createdAt)}</td>
                    <td className="py-2.5 pr-4">
                      <span className="font-bold text-gray-900">{e.action}</span>
                      {e.detail && <span className="block text-xs text-gray-500">{e.detail}</span>}
                    </td>
                    <td className="py-2.5 text-xs text-gray-500">{e.device || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {pinFlow && (
        <PinFlowDialog
          mode={pinFlow}
          onClose={() => setPinFlow(null)}
          onDone={(s, msg) => {
            onSecurity(s);
            setPinFlow(null);
            notify(msg);
            void load();
          }}
        />
      )}
    </div>
  );
}

function LockedHint({ what, onUnlock }: { what: string; onUnlock: () => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
      <span className="flex-1">Enter the PIN to see {what}.</span>
      <button type="button" onClick={onUnlock} className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white">
        Unlock
      </button>
    </div>
  );
}

/** Create / reset (password + new PIN twice) or turn off (password) the Secure Dashboard. */
function PinFlowDialog({ mode, onClose, onDone }: { mode: "create" | "reset" | "off"; onClose: () => void; onDone: (s: SecurityState, msg: string) => void }) {
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const title = mode === "create" ? "Create Secure Dashboard Password" : mode === "reset" ? "Reset Secure Dashboard PIN" : "Turn off Secure Dashboard";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode !== "off") {
      if (pin.length !== 6) return setError("Enter a 6-digit PIN.");
      if (pin !== again) return setError("The two PINs don't match.");
    }
    if (!password) return setError("Enter your account password.");
    setBusy(true);
    try {
      const token = await confirmPassword(password);
      const res = mode === "create" ? await createSecurePin(token, pin) : mode === "reset" ? await resetSecurePin(token, pin) : await turnOffSecurePin(token);
      if (!res.ok) return setError(res.error);
      onDone(res.data, mode === "create" ? "Secure Dashboard is on" : mode === "reset" ? "PIN changed" : "Secure Dashboard turned off");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/50 sm:items-center sm:p-6" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-label={title} onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-black text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {mode === "off" ? (
          <p className="mt-2 text-sm text-gray-500">Anyone signed in will be able to edit products, prices, photos and settings without a PIN.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-gray-500">Choose 6 digits that staff don&apos;t know. You&apos;ll enter them to edit products, prices, photos and settings.</p>
            <div className="mt-5 space-y-4">
              <div>
                <p className="mb-2 text-center text-xs font-black uppercase tracking-widest text-gray-400">New PIN</p>
                <PinInput label="New PIN" value={pin} onChange={setPin} autoFocus />
              </div>
              <div>
                <p className="mb-2 text-center text-xs font-black uppercase tracking-widest text-gray-400">Repeat PIN</p>
                <PinInput label="Repeat PIN" value={again} onChange={setAgain} />
              </div>
            </div>
          </>
        )}
        <label className="mt-5 block">
          <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-gray-400">Account password (to confirm it&apos;s the owner)</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-[#f08c6c]"
          />
        </label>
        {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-black text-white disabled:opacity-50 ${mode === "off" ? "bg-red-600" : "bg-[#f08c6c]"}`}
        >
          {busy && <Loader2 className="h-5 w-5 animate-spin" />}
          {mode === "create" ? "Create PIN" : mode === "reset" ? "Save new PIN" : "Turn off"}
        </button>
      </form>
    </div>
  );
}
