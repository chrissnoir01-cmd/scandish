"use server";

import { logActivity } from "@/lib/server/activity";
import { requireUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";

export type SignInArea = "portal" | "admin" | "support";

const AREA_LABEL: Record<SignInArea, string> = {
  portal: "restaurant portal",
  admin: "MasterAdmin",
  support: "support team portal",
};

/** Called by the browser right after a successful sign-in, so the admin can see logins. */
export async function recordSignIn(idToken: string, area: SignInArea): Promise<void> {
  try {
    const user = await requireUser(idToken);
    // Wrong-area sign-ins are logged by recordFailedSignIn instead.
    if (area === "admin" && user.admin !== true) return;
    if (area === "support" && user.support !== true) return;

    const now = new Date().toISOString();
    const ref = adminDb().collection("users").doc(user.uid);
    const snap = await ref.get();
    await ref.set({ lastLoginAt: now, ...(snap.get("firstLoginAt") ? {} : { firstLoginAt: now }) }, { merge: true });

    await logActivity({
      type: area === "admin" ? "auth.admin_login" : area === "support" ? "support.login" : "auth.login",
      message: `${user.email} signed in to the ${AREA_LABEL[area]}`,
      actor: { uid: user.uid, email: user.email },
      target: { kind: "account", id: user.uid, name: user.email },
    });
  } catch {
    // Best effort: never block a login on logging.
  }
}

/**
 * Failed sign-ins are recorded for security monitoring. Unauthenticated by nature,
 * so input is truncated and nothing else is trusted.
 */
export async function recordFailedSignIn(email: string, area: SignInArea, reason: string): Promise<void> {
  const clean = String(email ?? "").trim().toLowerCase().slice(0, 120);
  if (!clean || !(area in AREA_LABEL)) return;
  await logActivity({
    type: "auth.login_failed",
    message: `Failed ${AREA_LABEL[area]} sign-in for ${clean}`,
    actor: { email: clean },
    meta: { reason: String(reason ?? "").slice(0, 60) },
  });
}
