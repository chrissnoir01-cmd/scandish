"use server";

import { BUILTIN_PRESETS, cssProblem, normalizeDesign, type DesignConfig } from "@/lib/design";
import { premiumPending } from "@/lib/premium";
import { logActivity } from "@/lib/server/activity";
import { requireAdmin } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { fail } from "@/lib/server/result";
import { revalidateRestaurant, toContent } from "@/lib/server/restaurants";
import { ValidationError, validateString as str } from "@/lib/server/validate";
import type { ActionResult, Plan, PremiumTemplate, RestaurantContent } from "@/lib/types";

/**
 * Design Studio (MasterAdmin). A business has a draft design (only MasterAdmin sees it) and a
 * published design (what the public page shows when its template is "studio").
 */

export interface StudioBusiness {
  id: string;
  companyName: string;
  slug: string;
  plan: Plan;
  premiumEnabled: boolean;
  premiumTemplate: PremiumTemplate;
  premiumPending: boolean;
  premiumDueAt: string;
  subdomain: string;
  hasDraft: boolean;
  hasPublished: boolean;
  designPublishedAt: string;
}

export interface StudioPreset {
  id: string;
  name: string;
  description: string;
  builtIn: boolean;
  design: DesignConfig;
}

export interface StudioBusinessData {
  content: RestaurantContent;
  slug: string;
  draft: DesignConfig | null;
  published: DesignConfig | null;
}

const s = (v: unknown) => (typeof v === "string" ? v : "");
const now = () => new Date().toISOString();
const companies = () => adminDb().collection("companies");
const presets = () => adminDb().collection("designPresets");

/** Rejects unusable custom CSS with its reason instead of silently dropping it. */
function checkedDesign(raw: unknown): DesignConfig {
  const css = typeof (raw as { customCss?: unknown })?.customCss === "string" ? (raw as { customCss: string }).customCss : "";
  const problem = css ? cssProblem(css) : null;
  if (problem) throw new ValidationError(problem);
  return normalizeDesign(raw);
}

export async function loadStudio(idToken: string): Promise<ActionResult<{ businesses: StudioBusiness[]; presets: StudioPreset[] }>> {
  try {
    await requireAdmin(idToken);
    const [snap, restaurants, saved] = await Promise.all([
      companies().get(),
      adminDb().collection("restaurants").select("slug").get(),
      presets().orderBy("createdAt", "desc").get(),
    ]);
    const liveSlug = new Map(restaurants.docs.map((r) => [r.id, s(r.get("slug"))]));

    const businesses = snap.docs
      .filter((d) => s(d.get("ownerUid")))
      .map((d): StudioBusiness => {
        const c = d.data();
        return {
          id: d.id,
          companyName: s(c.companyName),
          slug: liveSlug.get(s(c.ownerUid)) || s(c.slug),
          plan: c.plan === "premium" ? "premium" : "standard",
          premiumEnabled: c.premiumEnabled === true,
          premiumTemplate: (s(c.premiumTemplate) || "default") as PremiumTemplate,
          premiumPending: premiumPending(c),
          premiumDueAt: premiumPending(c) ? s(c.premiumDueAt) : "",
          subdomain: s(c.subdomain),
          hasDraft: Boolean(c.designDraft),
          hasPublished: Boolean(c.design),
          designPublishedAt: s(c.designPublishedAt),
        };
      })
      // Waiting Premium pages first (earliest due), then other Premium, then the rest.
      .sort(
        (a, b) =>
          Number(b.premiumPending) - Number(a.premiumPending) ||
          (a.premiumDueAt || "9").localeCompare(b.premiumDueAt || "9") ||
          Number(b.plan === "premium") - Number(a.plan === "premium") ||
          a.companyName.localeCompare(b.companyName)
      );

    const custom = saved.docs.map(
      (p): StudioPreset => ({ id: p.id, name: s(p.get("name")), description: s(p.get("description")), builtIn: false, design: normalizeDesign(p.get("design")) })
    );
    const builtIn = BUILTIN_PRESETS.map((p): StudioPreset => ({ ...p, builtIn: true }));
    return { ok: true, data: { businesses, presets: [...custom, ...builtIn] } };
  } catch (err) {
    return fail(err, "Could not load the Design Studio");
  }
}

export async function loadStudioBusiness(idToken: string, companyId: string): Promise<ActionResult<StudioBusinessData>> {
  try {
    await requireAdmin(idToken);
    const company = await companies().doc(String(companyId)).get();
    if (!company.exists) throw new ValidationError("Business not found");
    const ownerUid = s(company.get("ownerUid"));
    const restaurant = ownerUid ? await adminDb().collection("restaurants").doc(ownerUid).get() : null;
    if (!restaurant?.exists) throw new ValidationError("This business has no restaurant page yet");

    const draft = company.get("designDraft");
    const published = company.get("design");
    return {
      ok: true,
      data: {
        content: toContent(restaurant.data() ?? {}),
        slug: s(restaurant.get("slug")) || s(company.get("slug")),
        draft: draft ? normalizeDesign(draft) : null,
        published: published ? normalizeDesign(published) : null,
      },
    };
  } catch (err) {
    return fail(err, "Could not load this business");
  }
}

/** Saves the draft only — the public page does not change. */
export async function saveDesignDraft(idToken: string, companyId: string, raw: unknown): Promise<ActionResult<{ savedAt: string }>> {
  try {
    const admin = await requireAdmin(idToken);
    const design = checkedDesign(raw);
    const ref = companies().doc(String(companyId));
    const snap = await ref.get();
    if (!snap.exists) throw new ValidationError("Business not found");
    const savedAt = now();
    await ref.update({ designDraft: design, designDraftAt: savedAt });
    await logActivity({
      type: "admin.design_changed",
      message: `Saved a Design Studio draft for ${snap.get("companyName")}`,
      actor: { uid: admin.uid, email: admin.email },
      target: { kind: "company", id: snap.id, name: snap.get("companyName") ?? "" },
    });
    return { ok: true, data: { savedAt } };
  } catch (err) {
    return fail(err, "Could not save the draft");
  }
}

/**
 * Publishes the design: saves it as draft and live, and switches the business to its
 * Premium Design Studio page. Marks a waiting Premium page as delivered.
 */
export async function publishDesign(idToken: string, companyId: string, raw: unknown): Promise<ActionResult<{ publishedAt: string; slug: string }>> {
  try {
    const admin = await requireAdmin(idToken);
    const design = checkedDesign(raw);
    const db = adminDb();
    const ref = companies().doc(String(companyId));
    const snap = await ref.get();
    if (!snap.exists) throw new ValidationError("Business not found");
    const ownerUid = s(snap.get("ownerUid"));
    const restaurantRef = ownerUid ? db.collection("restaurants").doc(ownerUid) : null;
    const restaurant = restaurantRef ? await restaurantRef.get() : null;
    if (!restaurantRef || !restaurant?.exists) throw new ValidationError("This business has no restaurant page yet");

    const publishedAt = now();
    const wasPending = premiumPending(snap.data() ?? {});
    const live = { plan: "premium", premiumEnabled: true, premiumTemplate: "studio", design };
    const batch = db.batch();
    batch.update(ref, {
      ...live,
      designDraft: design,
      designDraftAt: publishedAt,
      designPublishedAt: publishedAt,
      ...(wasPending || snap.get("premiumEnabled") !== true ? { premiumDeliveredAt: publishedAt } : {}),
      updatedAt: publishedAt,
    });
    batch.update(restaurantRef, { ...live, updatedAt: publishedAt });
    await batch.commit();

    const slug = s(restaurant.get("slug")) || s(snap.get("slug"));
    revalidateRestaurant(slug);
    revalidateRestaurant(s(snap.get("slug")));
    await logActivity({
      type: "admin.design_changed",
      message: `Published the Design Studio page for ${snap.get("companyName")} (/r/${slug})${wasPending ? " — Premium page delivered" : ""}`,
      actor: { uid: admin.uid, email: admin.email },
      target: { kind: "company", id: snap.id, name: snap.get("companyName") ?? "" },
      meta: { slug, delivered: wasPending },
    });
    return { ok: true, data: { publishedAt, slug } };
  } catch (err) {
    return fail(err, "Could not publish the page");
  }
}

export async function saveDesignPreset(idToken: string, name: string, description: string, raw: unknown): Promise<ActionResult<StudioPreset>> {
  try {
    const admin = await requireAdmin(idToken);
    const presetName = str(name, 40, "Preset name");
    if (!presetName) throw new ValidationError("Give the preset a name");
    const design = checkedDesign(raw);
    const doc = await presets().add({ name: presetName, description: str(description, 120, "Description"), design, createdAt: now(), createdBy: admin.email ?? "" });
    await logActivity({
      type: "admin.design_changed",
      message: `Saved design preset “${presetName}”`,
      actor: { uid: admin.uid, email: admin.email },
    });
    return { ok: true, data: { id: doc.id, name: presetName, description: str(description, 120, "Description"), builtIn: false, design } };
  } catch (err) {
    return fail(err, "Could not save the preset");
  }
}

export async function deleteDesignPreset(idToken: string, presetId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin(idToken);
    const ref = presets().doc(String(presetId));
    const snap = await ref.get();
    if (!snap.exists) throw new ValidationError("Preset not found");
    await ref.delete();
    await logActivity({
      type: "admin.design_changed",
      message: `Deleted design preset “${snap.get("name")}”`,
      actor: { uid: admin.uid, email: admin.email },
    });
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Could not delete the preset");
  }
}
