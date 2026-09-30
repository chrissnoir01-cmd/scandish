import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import type { DecodedIdToken } from "firebase-admin/auth";
import { AuthError, requireUser } from "./auth";
import { adminDb } from "./firebase-admin";
import { clientInfo } from "./request";
import { ValidationError } from "./validate";
import type { DeviceSession, SecurityLogEntry, SecurityState } from "../types";

/**
 * Security Center for Premium restaurants (one owner login, possibly used by staff on shared devices):
 *
 * - Device sessions: every browser that opens the dashboard gets a session (id in an httpOnly cookie).
 *   The owner can sign a device out; from then on the server refuses that device's requests.
 * - Secure Dashboard PIN: once set, protected actions (publishing edits, uploading photos, security
 *   settings) need the device to be unlocked with the 6-digit PIN. Unlocking lasts 15 minutes of use.
 * - Weekly log: important actions of the current week (Monday–Sunday, Kigali time).
 *
 * Standard restaurants skip all of this (no sessions, no PIN, no log).
 */

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = "sd_session";
const UNLOCK_MS = 15 * 60_000;
/** Last-activity is written at most this often per device. */
const TOUCH_MS = 2 * 60_000;
const MAX_PIN_TRIES = 5;
const PIN_LOCK_MS = 15 * 60_000;
/** Creating, resetting or turning off the PIN needs the account password typed within this time. */
const RECENT_AUTH_S = 5 * 60;
const SESSION_IDLE_DAYS = 60;

/** The device was signed out remotely: the dashboard must sign out. */
export class SignedOutError extends AuthError {}
/** A protected action on a locked device: the dashboard asks for the PIN and retries. */
export class LockedError extends ValidationError {}

type Doc = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : "");
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

const restaurantRef = (uid: string) => adminDb().collection("restaurants").doc(uid);
const sessionsCol = (uid: string) => restaurantRef(uid).collection("sessions");
const securityDoc = (uid: string) => restaurantRef(uid).collection("private").doc("security");
const logCol = (uid: string) => restaurantRef(uid).collection("securityLog");

/* ---------- Devices ---------- */

export function describeDevice(ua: string): { name: string; type: "mobile" | "tablet" | "desktop" } {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /Firefox|FxiOS/.test(ua)
          ? "Firefox"
          : /CriOS|Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "Browser";
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /CrOS/.test(ua)
            ? "ChromeOS"
            : /Mac OS X|Macintosh/.test(ua)
              ? "Mac"
              : /Linux/.test(ua)
                ? "Linux"
                : "unknown system";
  const type = /iPad|Tablet|(Android(?!.*Mobile))/i.test(ua) ? "tablet" : /Mobi|iPhone|Android/i.test(ua) ? "mobile" : "desktop";
  return { name: `${browser} on ${os}`, type };
}

/* ---------- Weekly log ---------- */

/** Monday 00:00 of the current week in Kigali (UTC+2, no daylight saving), as an ISO string. */
export function weekStart(now = new Date()): string {
  const kigali = new Date(now.getTime() + 2 * 3_600_000);
  const sinceMonday = (kigali.getUTCDay() + 6) % 7;
  const monday = Date.UTC(kigali.getUTCFullYear(), kigali.getUTCMonth(), kigali.getUTCDate() - sinceMonday);
  return new Date(monday - 2 * 3_600_000).toISOString();
}

export interface Access {
  user: DecodedIdToken;
  premium: boolean;
  /** This device's session (Premium only). */
  session: { id: string; device: string } | null;
  pinSet: boolean;
  unlockedUntil: number;
}

/** Writes one line to the restaurant's weekly log (Premium only). Never throws. */
export async function securityLog(access: Access, action: string, detail = ""): Promise<void> {
  if (!access.premium) return;
  try {
    await logCol(access.user.uid).add({
      action: action.slice(0, 120),
      detail: detail.slice(0, 300),
      device: access.session?.device ?? "",
      email: access.user.email ?? "",
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("security log failed", err);
  }
}

/* ---------- Access check for every dashboard action ---------- */

async function sessionCookie(): Promise<string> {
  try {
    return (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  } catch {
    return "";
  }
}

async function setSessionCookie(id: string) {
  (await cookies()).set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 86_400,
  });
}

/**
 * Checks the signed-in owner and, for Premium, this device's session and lock state.
 * `protect: true` for actions that need the Secure Dashboard PIN (when one is set).
 */
export async function dashboardAccess(idToken: unknown, opts: AccessOptions = {}): Promise<Access> {
  return accessFor(await requireUser(idToken), opts);
}

interface AccessOptions {
  /** Needs the Secure Dashboard PIN (when one is set). */
  protect?: boolean;
  /** Using the feature keeps the device unlocked longer (default); viewing lists doesn't. */
  extend?: boolean;
}

export async function accessFor(user: DecodedIdToken, opts: AccessOptions = {}): Promise<Access> {
  const uid = user.uid;
  const sid = (await sessionCookie()).slice(0, 64);
  const [restaurant, security, existing] = await Promise.all([
    restaurantRef(uid).get(),
    securityDoc(uid).get(),
    sid ? sessionsCol(uid).doc(sid).get() : Promise.resolve(null),
  ]);
  const premium = restaurant.get("plan") === "premium";
  if (!premium) return { user, premium, session: null, pinSet: false, unlockedUntil: 0 };

  const now = Date.now();
  const signedInAt = n(user.auth_time) * 1000;
  // A sign-in the owner cancelled stays blocked even if that browser loses its session cookie.
  const revokedSignIns = (security.get("revokedSignIns") as unknown[] | undefined) ?? [];
  if (revokedSignIns.includes(signedInAt)) {
    throw new SignedOutError("This device was signed out by the account owner. Sign in again to continue.");
  }
  let session = existing?.exists ? existing : null;

  if (session?.get("revoked") === true) {
    // A new sign-in after the remote sign-out starts a fresh session; the old login stays blocked.
    if (signedInAt <= n(session.get("revokedAtMs"))) {
      throw new SignedOutError("This device was signed out by the account owner. Sign in again to continue.");
    }
    session = null;
  } else if (session && n(session.get("endedAtMs")) && signedInAt <= n(session.get("endedAtMs"))) {
    throw new SignedOutError("You signed out on this device. Sign in again to continue.");
  } else if (session && n(session.get("endedAtMs"))) {
    session = null;
  }

  let sessionId = session?.id ?? "";
  let device = s(session?.get("device"));
  let unlockedUntil = n(session?.get("unlockedUntil"));

  if (!session) {
    const { userAgent } = await clientInfo();
    const d = describeDevice(userAgent);
    const ref = sessionsCol(uid).doc();
    await ref.set({
      device: d.name,
      deviceType: d.type,
      createdAt: new Date(now).toISOString(),
      lastActiveAt: new Date(now).toISOString(),
      lastActiveMs: now,
      signedInAtMs: signedInAt,
      unlockedUntil: 0,
    });
    await setSessionCookie(ref.id);
    sessionId = ref.id;
    device = d.name;
    unlockedUntil = 0;
    await securityLog({ user, premium, session: { id: sessionId, device }, pinSet: false, unlockedUntil: 0 }, "Signed in", `New device: ${d.name}`);
  }

  const pinSet = Boolean(security.exists && s(security.get("pinHash")));
  const unlocked = !pinSet || unlockedUntil > now;
  if (opts.protect && !unlocked) {
    throw new LockedError("Enter your Secure Dashboard PIN to do this.");
  }

  const updates: Doc = {};
  if (session && now - n(session.get("lastActiveMs")) > TOUCH_MS) {
    updates.lastActiveAt = new Date(now).toISOString();
    updates.lastActiveMs = now;
  }
  // Using a protected feature keeps the device unlocked a while longer.
  if (opts.protect && pinSet && opts.extend !== false) {
    unlockedUntil = now + UNLOCK_MS;
    updates.unlockedUntil = unlockedUntil;
  }
  if (session && Object.keys(updates).length) await sessionsCol(uid).doc(sessionId).update(updates);

  return { user, premium, session: { id: sessionId, device }, pinSet, unlockedUntil: pinSet ? unlockedUntil : 0 };
}

export function securityState(a: Access): SecurityState {
  return {
    premium: a.premium,
    pinSet: a.pinSet,
    unlockedUntil: a.unlockedUntil,
    sessionId: a.session?.id ?? "",
    device: a.session?.device ?? "",
  };
}

/* ---------- Secure Dashboard PIN ---------- */

const PIN = /^\d{6}$/;

function checkNewPin(pin: unknown): string {
  const p = String(pin ?? "");
  if (!PIN.test(p)) throw new ValidationError("The PIN must be exactly 6 digits.");
  if (/^(\d)\1{5}$/.test(p) || ["123456", "654321", "012345", "543210"].includes(p)) {
    throw new ValidationError("That PIN is too easy to guess. Choose another one.");
  }
  return p;
}

async function hashPin(pin: string, salt: Buffer) {
  return (await scrypt(pin, salt, 32)).toString("hex");
}

/** The account password must have been typed just now (the dashboard re-signs in before calling). */
function requireRecentSignIn(user: DecodedIdToken) {
  if (Date.now() / 1000 - n(user.auth_time) > RECENT_AUTH_S) {
    throw new ValidationError("Confirm your account password first.");
  }
}

function requirePremium(a: Access) {
  if (!a.premium) throw new ValidationError("The Security Center is part of the Premium plan.");
}

async function storePin(a: Access, pin: string) {
  const salt = randomBytes(16);
  await securityDoc(a.user.uid).set(
    {
      pinHash: await hashPin(pin, salt),
      pinSalt: salt.toString("hex"),
      pinSetAt: new Date().toISOString(),
      failed: 0,
      lockedUntil: 0,
    },
    { merge: true }
  );
  // The device that sets the PIN is unlocked.
  a.unlockedUntil = Date.now() + UNLOCK_MS;
  if (a.session) await sessionsCol(a.user.uid).doc(a.session.id).update({ unlockedUntil: a.unlockedUntil });
  a.pinSet = true;
}

export async function createPin(idToken: unknown, pin: unknown): Promise<SecurityState> {
  const a = await dashboardAccess(idToken);
  requirePremium(a);
  if (a.pinSet) throw new ValidationError("A Secure Dashboard PIN already exists. Use “Reset PIN” to change it.");
  requireRecentSignIn(a.user);
  await storePin(a, checkNewPin(pin));
  await securityLog(a, "Secure Dashboard PIN created");
  return securityState(a);
}

export async function resetPin(idToken: unknown, pin: unknown): Promise<SecurityState> {
  const a = await dashboardAccess(idToken);
  requirePremium(a);
  requireRecentSignIn(a.user);
  await storePin(a, checkNewPin(pin));
  await securityLog(a, "Secure Dashboard PIN reset", "Confirmed with the account password");
  return securityState(a);
}

export async function removePin(idToken: unknown): Promise<SecurityState> {
  const a = await dashboardAccess(idToken, { protect: true });
  requirePremium(a);
  requireRecentSignIn(a.user);
  await securityDoc(a.user.uid).update({
    pinHash: FieldValue.delete(),
    pinSalt: FieldValue.delete(),
    pinSetAt: FieldValue.delete(),
    failed: 0,
    lockedUntil: 0,
  });
  await securityLog(a, "Secure Dashboard turned off");
  return securityState({ ...a, pinSet: false, unlockedUntil: 0 });
}

export async function unlockWithPin(idToken: unknown, pin: unknown): Promise<SecurityState> {
  const a = await dashboardAccess(idToken);
  requirePremium(a);
  if (!a.pinSet) return securityState(a);
  const ref = securityDoc(a.user.uid);
  const sec = await ref.get();
  const now = Date.now();
  if (n(sec.get("lockedUntil")) > now) {
    const min = Math.ceil((n(sec.get("lockedUntil")) - now) / 60_000);
    throw new ValidationError(`Too many wrong PINs. Try again in ${min} minute${min > 1 ? "s" : ""}, or reset the PIN with your account password.`);
  }
  const p = String(pin ?? "");
  const expected = Buffer.from(s(sec.get("pinHash")), "hex");
  const got = PIN.test(p) ? Buffer.from(await hashPin(p, Buffer.from(s(sec.get("pinSalt")), "hex")), "hex") : Buffer.alloc(expected.length);
  if (!PIN.test(p) || got.length !== expected.length || !timingSafeEqual(got, expected)) {
    const failed = n(sec.get("failed")) + 1;
    if (failed >= MAX_PIN_TRIES) {
      await ref.update({ failed: 0, lockedUntil: now + PIN_LOCK_MS });
      await securityLog(a, "Secure Dashboard locked", `${MAX_PIN_TRIES} wrong PINs in a row — locked for 15 minutes`);
      throw new ValidationError("Too many wrong PINs. The Secure Dashboard is locked for 15 minutes.");
    }
    await ref.update({ failed });
    const left = MAX_PIN_TRIES - failed;
    throw new ValidationError(`Wrong PIN. ${left} attempt${left > 1 ? "s" : ""} left.`);
  }
  await ref.update({ failed: 0 });
  a.unlockedUntil = now + UNLOCK_MS;
  if (a.session) await sessionsCol(a.user.uid).doc(a.session.id).update({ unlockedUntil: a.unlockedUntil });
  await securityLog(a, "Unlocked with PIN");
  return securityState(a);
}

export async function lockDevice(idToken: unknown): Promise<SecurityState> {
  const a = await dashboardAccess(idToken);
  if (a.session) await sessionsCol(a.user.uid).doc(a.session.id).update({ unlockedUntil: 0 });
  return securityState({ ...a, unlockedUntil: 0 });
}

/* ---------- Devices ---------- */

function toSession(d: DocumentSnapshot, current: string): DeviceSession {
  return {
    id: d.id,
    device: s(d.get("device")) || "Unknown device",
    deviceType: (["mobile", "tablet", "desktop"].includes(s(d.get("deviceType"))) ? d.get("deviceType") : "desktop") as DeviceSession["deviceType"],
    createdAt: s(d.get("createdAt")),
    lastActiveAt: s(d.get("lastActiveAt")),
    current: d.id === current,
  };
}

export async function listDevices(idToken: unknown): Promise<DeviceSession[]> {
  const a = await dashboardAccess(idToken, { protect: true, extend: false });
  requirePremium(a);
  const snap = await sessionsCol(a.user.uid).orderBy("lastActiveMs", "desc").limit(100).get();
  const idleCutoff = Date.now() - SESSION_IDLE_DAYS * 86_400_000;
  const stale = snap.docs.filter((d) => d.get("revoked") === true || n(d.get("endedAtMs")) || n(d.get("lastActiveMs")) < idleCutoff);
  // Signed-out and long-idle devices are cleaned up as the list is read.
  const oldStale = stale.filter((d) => n(d.get("lastActiveMs")) < Date.now() - 7 * 86_400_000);
  if (oldStale.length) {
    const batch = adminDb().batch();
    oldStale.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.docs.filter((d) => !stale.includes(d)).map((d) => toSession(d, a.session?.id ?? ""));
}

export async function signOutDevice(idToken: unknown, sessionId: unknown): Promise<void> {
  const a = await dashboardAccess(idToken, { protect: true });
  requirePremium(a);
  const id = String(sessionId ?? "").slice(0, 64);
  if (!id || id === a.session?.id) throw new ValidationError("Use Logout to sign out this device.");
  const ref = sessionsCol(a.user.uid).doc(id);
  const d = await ref.get();
  if (!d.exists) throw new ValidationError("That device is already signed out.");
  const now = Date.now();
  await ref.update({ revoked: true, revokedAtMs: now, revokedAt: new Date(now).toISOString(), revokedBy: a.session?.device ?? "", unlockedUntil: 0 });
  const signIn = n(d.get("signedInAtMs"));
  // Never block the owner's own current sign-in by accident.
  if (signIn && signIn !== n(a.user.auth_time) * 1000) {
    await securityDoc(a.user.uid).set({ revokedSignIns: FieldValue.arrayUnion(signIn) }, { merge: true });
  }
  await securityLog(a, "Device signed out remotely", s(d.get("device")));
}

/** Normal logout from this device. */
export async function endSession(idToken: unknown): Promise<void> {
  const a = await dashboardAccess(idToken);
  if (!a.session) return;
  const now = Date.now();
  await sessionsCol(a.user.uid).doc(a.session.id).update({ endedAtMs: now, endedAt: new Date(now).toISOString(), unlockedUntil: 0 });
  await securityLog(a, "Signed out");
  (await cookies()).delete(SESSION_COOKIE);
}

/* ---------- Weekly log ---------- */

export async function weeklyLog(idToken: unknown): Promise<{ weekStart: string; entries: SecurityLogEntry[] }> {
  const a = await dashboardAccess(idToken, { protect: true, extend: false });
  requirePremium(a);
  const start = weekStart();
  // Last week's records are replaced by this week's.
  const old = await logCol(a.user.uid).where("createdAt", "<", start).limit(400).get();
  if (!old.empty) {
    const batch = adminDb().batch();
    old.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  const snap = await logCol(a.user.uid).where("createdAt", ">=", start).orderBy("createdAt", "desc").limit(500).get();
  return {
    weekStart: start,
    entries: snap.docs.map((d) => ({
      id: d.id,
      action: s(d.get("action")),
      detail: s(d.get("detail")),
      device: s(d.get("device")),
      email: s(d.get("email")),
      createdAt: s(d.get("createdAt")),
    })),
  };
}
