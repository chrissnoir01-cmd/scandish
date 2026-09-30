"use server";

import {
  createPin,
  endSession,
  listDevices,
  lockDevice,
  removePin,
  resetPin,
  signOutDevice,
  unlockWithPin,
  weeklyLog,
} from "@/lib/server/dashboard-security";
import { fail } from "@/lib/server/result";
import type { ActionResult, DeviceSession, SecurityLogEntry, SecurityState } from "@/lib/types";

/** Security Center (Premium): Secure Dashboard PIN, devices and weekly log. */

export async function createSecurePin(idToken: string, pin: string): Promise<ActionResult<SecurityState>> {
  try {
    return { ok: true, data: await createPin(idToken, pin) };
  } catch (err) {
    return fail(err, "Could not create the PIN");
  }
}

export async function resetSecurePin(idToken: string, pin: string): Promise<ActionResult<SecurityState>> {
  try {
    return { ok: true, data: await resetPin(idToken, pin) };
  } catch (err) {
    return fail(err, "Could not reset the PIN");
  }
}

export async function turnOffSecurePin(idToken: string): Promise<ActionResult<SecurityState>> {
  try {
    return { ok: true, data: await removePin(idToken) };
  } catch (err) {
    return fail(err, "Could not turn off the Secure Dashboard");
  }
}

export async function unlockDashboard(idToken: string, pin: string): Promise<ActionResult<SecurityState>> {
  try {
    return { ok: true, data: await unlockWithPin(idToken, pin) };
  } catch (err) {
    return fail(err, "Could not check the PIN");
  }
}

export async function lockDashboard(idToken: string): Promise<ActionResult<SecurityState>> {
  try {
    return { ok: true, data: await lockDevice(idToken) };
  } catch (err) {
    return fail(err, "Could not lock");
  }
}

export async function loadDevices(idToken: string): Promise<ActionResult<DeviceSession[]>> {
  try {
    return { ok: true, data: await listDevices(idToken) };
  } catch (err) {
    return fail(err, "Could not load devices");
  }
}

export async function signOutOtherDevice(idToken: string, sessionId: string): Promise<ActionResult> {
  try {
    await signOutDevice(idToken, sessionId);
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Could not sign out that device");
  }
}

export async function logoutThisDevice(idToken: string): Promise<ActionResult> {
  try {
    await endSession(idToken);
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Could not record the logout");
  }
}

export async function loadWeeklyLog(idToken: string): Promise<ActionResult<{ weekStart: string; entries: SecurityLogEntry[] }>> {
  try {
    return { ok: true, data: await weeklyLog(idToken) };
  } catch (err) {
    return fail(err, "Could not load the weekly log");
  }
}
