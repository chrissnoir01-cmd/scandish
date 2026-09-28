"use server";

import { requireUser } from "@/lib/server/auth";
import { logActivity } from "@/lib/server/activity";
import { getAnalytics } from "@/lib/server/analytics";
import { getDashboardData, saveRestaurantContent } from "@/lib/server/restaurants";
import { fail } from "@/lib/server/result";
import { parseRestaurantContent } from "@/lib/server/validate";
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
    const content = parseRestaurantContent(input);
    const { slug, name, changes } = await saveRestaurantContent(user.uid, content);
    await logActivity({
      type: "restaurant.saved",
      message: changes.length ? `${name} published changes: ${changes.join(", ")}` : `${name} published (no changes)`,
      actor: { uid: user.uid, email: user.email },
      target: { kind: "restaurant", id: user.uid, name },
      meta: { slug, sections: changes.length },
    });
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Save failed. Please try again.");
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
