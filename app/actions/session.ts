"use server";

import { logActivity } from "@/lib/server/activity";
import { requireUser } from "@/lib/server/auth";

/** Called by the browser right after a successful sign-in, so the admin can see logins. */
export async function recordSignIn(idToken: string, area: "portal" | "admin"): Promise<void> {
  try {
    const user = await requireUser(idToken);
    // A non-admin at the admin login is logged by recordFailedSignIn instead.
    if (area === "admin" && user.admin !== true) return;
    await logActivity({
      type: area === "admin" ? "auth.admin_login" : "auth.login",
      message: `${user.email} signed in to the ${area === "admin" ? "MasterAdmin" : "restaurant portal"}`,
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
export async function recordFailedSignIn(email: string, area: "portal" | "admin", reason: string): Promise<void> {
  const clean = String(email ?? "").trim().toLowerCase().slice(0, 120);
  if (!clean) return;
  await logActivity({
    type: "auth.login_failed",
    message: `Failed ${area === "admin" ? "MasterAdmin" : "portal"} sign-in for ${clean}`,
    actor: { email: clean },
    meta: { reason: String(reason ?? "").slice(0, 60) },
  });
}
