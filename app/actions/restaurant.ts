"use server";

import { requireUser } from "@/lib/server/auth";
import { logActivity } from "@/lib/server/activity";
import { getAnalytics } from "@/lib/server/analytics";
import { getDashboardData, saveRestaurantContent, setMenuItemHidden } from "@/lib/server/restaurants";
import { dashboardAccess, securityLog, securityState } from "@/lib/server/dashboard-security";
import { fail } from "@/lib/server/result";
import { parseRestaurantContent, ValidationError } from "@/lib/server/validate";
import { adminAuth, adminDb } from "@/lib/server/firebase-admin";
import { MIN_PASSWORD_LENGTH, TERMS_VERSION } from "@/lib/brand";
import type { ActionResult, Analytics, DashboardData } from "@/lib/types";

export async function loadDashboard(idToken: string): Promise<ActionResult<DashboardData | null>> {
  try {
    const access = await dashboardAccess(idToken);
    const data = await getDashboardData(access.user.uid);
    return { ok: true, data: data && { ...data, security: securityState(access) } };
  } catch (err) {
    return fail(err, "Could not load your restaurant");
  }
}

export async function saveDashboard(idToken: string, input: unknown): Promise<ActionResult> {
  try {
    // Publishing edits (products, prices, photos, business details) needs the Secure Dashboard PIN when one is set.
    const access = await dashboardAccess(idToken, { protect: true });
    const user = access.user;
    // A temporary password is known to the support member who issued it; no edits until the manager replaces it.
    const owner = await adminDb().collection("users").doc(user.uid).get();
    if (owner.get("mustChangePassword") === true) {
      throw new ValidationError("Set your own password before publishing changes.");
    }
    const content = parseRestaurantContent(input);
    const { slug, name, changes, dishChanges, imagesDeleted } = await saveRestaurantContent(user.uid, content);
    for (const line of dishChanges.slice(0, 30)) await securityLog(access, line.split(":")[0], line.slice(line.indexOf(":") + 1).trim());
    if (dishChanges.length > 30) await securityLog(access, "Menu changes", `${dishChanges.length - 30} more product changes`);
    const other = changes.filter((c) => !c.startsWith("menu"));
    if (other.length) await securityLog(access, "Business details changed", other.join(", "));
    await logActivity({
      type: "restaurant.saved",
      message:
        (changes.length ? `${name} published changes: ${changes.join(", ")}` : `${name} published (no changes)`) +
        (imagesDeleted ? ` — ${imagesDeleted} replaced image${imagesDeleted > 1 ? "s" : ""} deleted from storage` : ""),
      actor: { uid: user.uid, email: user.email },
      target: { kind: "restaurant", id: user.uid, name },
      meta: { slug, sections: changes.length, imagesDeleted },
    });
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Save failed. Please try again.");
  }
}

/**
 * First login after a support member created the account: the manager replaces the
 * temporary password and accepts the Terms. Changing the password ends the current
 * session, so the browser signs in again with the new password afterwards.
 */
export async function completeFirstLogin(
  idToken: string,
  newPassword: string,
  acceptedTerms: boolean
): Promise<ActionResult> {
  try {
    const user = await requireUser(idToken);
    if (acceptedTerms !== true) throw new ValidationError("Please accept the Terms of Service and Privacy Policy");
    const password = String(newPassword ?? "");
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const ref = adminDb().collection("users").doc(user.uid);
    const snap = await ref.get();
    if (snap.get("mustChangePassword") !== true) throw new ValidationError("Your password is already set");

    await adminAuth().updateUser(user.uid, { password });
    const now = new Date().toISOString();
    await ref.update({ mustChangePassword: false, passwordSetAt: now, termsAcceptedAt: now, termsVersion: TERMS_VERSION });

    await logActivity({
      type: "restaurant.password_set",
      message: `${user.email} replaced the temporary password and accepted the Terms`,
      actor: { uid: user.uid, email: user.email },
      target: { kind: "account", id: user.uid, name: user.email },
    });
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Could not set your password");
  }
}

export async function loadAnalytics(idToken: string): Promise<ActionResult<Analytics>> {
  try {
    // Read-only, and loaded alongside loadDashboard: a plain sign-in check avoids registering the device twice.
    const user = await requireUser(idToken);
    return { ok: true, data: await getAnalytics(user.uid) };
  } catch (err) {
    return fail(err, "Could not load your views");
  }
}

/** Hide / Unhide one product on the public menu right away. Allowed without the PIN (staff use it for stock). */
export async function setProductHidden(idToken: string, key: string, hidden: boolean): Promise<ActionResult> {
  try {
    const access = await dashboardAccess(idToken);
    const { name } = await setMenuItemHidden(access.user.uid, String(key ?? "").slice(0, 300), hidden === true);
    await securityLog(access, hidden ? "Product hidden" : "Product unhidden", name);
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Could not change the product");
  }
}
