"use server";

import { requireUser } from "@/lib/server/auth";
import { logActivity } from "@/lib/server/activity";
import { getAnalytics } from "@/lib/server/analytics";
import { getDashboardData, saveRestaurantContent } from "@/lib/server/restaurants";
import { fail } from "@/lib/server/result";
import { parseRestaurantContent, ValidationError } from "@/lib/server/validate";
import { adminAuth, adminDb } from "@/lib/server/firebase-admin";
import { MIN_PASSWORD_LENGTH, TERMS_VERSION } from "@/lib/brand";
import type { ActionResult, Analytics, DashboardData } from "@/lib/types";

export async function loadDashboard(idToken: string): Promise<ActionResult<DashboardData | null>> {
  try {
    const user = await requireUser(idToken);
    return { ok: true, data: await getDashboardData(user.uid) };
  } catch (err) {
    return fail(err, "Could not load your restaurant");
  }
}

export async function saveDashboard(idToken: string, input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser(idToken);
    // A temporary password is known to the support member who issued it; no edits until the manager replaces it.
    const owner = await adminDb().collection("users").doc(user.uid).get();
    if (owner.get("mustChangePassword") === true) {
      throw new ValidationError("Set your own password before publishing changes.");
    }
    const content = parseRestaurantContent(input);
    const { slug, name, changes, imagesDeleted } = await saveRestaurantContent(user.uid, content);
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
    const user = await requireUser(idToken);
    return { ok: true, data: await getAnalytics(user.uid) };
  } catch (err) {
    return fail(err, "Could not load your views");
  }
}
