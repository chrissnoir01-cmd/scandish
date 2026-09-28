"use server";

import { requireUser } from "@/lib/server/auth";
import { getDashboardData, saveRestaurantContent } from "@/lib/server/restaurants";
import { fail } from "@/lib/server/result";
import { parseRestaurantContent } from "@/lib/server/validate";
import type { ActionResult, DashboardData } from "@/lib/types";

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
    await saveRestaurantContent(user.uid, content);
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Save failed. Please try again.");
  }
}
