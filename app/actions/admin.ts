"use server";

import { requireAdmin } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { generateInviteCode, uniqueSlug } from "@/lib/server/ids";
import { fail } from "@/lib/server/result";
import { revalidateRestaurant } from "@/lib/server/restaurants";
import { ValidationError, validateString as str } from "@/lib/server/validate";
import type { ActionResult, Company, CompanyStatus, Plan, PremiumTemplate } from "@/lib/types";

const PLANS: Plan[] = ["standard", "premium"];
const TEMPLATES: PremiumTemplate[] = ["default", "camellia", "sample", "freshy"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const companies = () => adminDb().collection("companies");
const now = () => new Date().toISOString();

function toCompany(id: string, d: Record<string, unknown>): Company {
  const s = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  return {
    id,
    companyName: s("companyName"),
    managerName: s("managerName"),
    phone: s("phone"),
    email: s("email"),
    location: s("location"),
    certificateNumber: s("certificateNumber"),
    certificateUrl: s("certificateUrl"),
    businessType: s("businessType"),
    subscriptionStart: s("subscriptionStart"),
    subscriptionEnd: s("subscriptionEnd"),
    notes: s("notes"),
    status: d.status === "active" ? "active" : "inactive",
    ownerUid: s("ownerUid"),
    inviteCode: s("inviteCode"),
    inviteUsed: d.inviteUsed === true,
    slug: s("slug"),
    plan: d.plan === "premium" ? "premium" : "standard",
    premiumEnabled: d.premiumEnabled === true,
    premiumTemplate: TEMPLATES.includes(d.premiumTemplate as PremiumTemplate)
      ? (d.premiumTemplate as PremiumTemplate)
      : "default",
    createdAt: s("createdAt"),
    updatedAt: s("updatedAt"),
  };
}

/** Applies a change to a company and mirrors the given fields onto its restaurant. */
async function updateCompany(id: string, fields: Record<string, unknown>, mirror: Record<string, unknown> = {}) {
  const ref = companies().doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new ValidationError("Company not found");

  const batch = adminDb().batch();
  batch.update(ref, { ...fields, updatedAt: now() });

  const ownerUid = snap.get("ownerUid");
  const restaurantRef = ownerUid ? adminDb().collection("restaurants").doc(ownerUid) : null;
  const restaurant = restaurantRef ? await restaurantRef.get() : null;
  if (restaurantRef && restaurant?.exists && Object.keys(mirror).length) {
    batch.update(restaurantRef, { ...mirror, updatedAt: now() });
  }
  await batch.commit();

  revalidateRestaurant(snap.get("slug"));
  revalidateRestaurant(restaurant?.get("slug"));
}

export async function listCompanies(idToken: string): Promise<ActionResult<Company[]>> {
  try {
    await requireAdmin(idToken);
    // Sorted in memory: orderBy() would drop any record missing createdAt.
    const [snap, restaurants] = await Promise.all([
      companies().get(),
      adminDb().collection("restaurants").select("slug").get(),
    ]);
    // The live page uses the restaurant's slug, which can differ from (or be missing on) the company.
    const liveSlug = new Map(restaurants.docs.map((r) => [r.id, r.get("slug") as string]));
    const list = snap.docs.map((d) => {
      const company = toCompany(d.id, d.data());
      return { ...company, slug: liveSlug.get(company.ownerUid) || company.slug };
    });
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { ok: true, data: list };
  } catch (err) {
    return fail(err, "Could not load companies");
  }
}

export interface NewCompanyInput {
  companyName: string;
  managerName: string;
  phone: string;
  email: string;
  location: string;
  certificateNumber: string;
  certificateUrl: string;
  businessType: string;
  subscriptionStart: string;
  subscriptionEnd: string;
  notes: string;
}

export async function createCompany(
  idToken: string,
  input: NewCompanyInput
): Promise<ActionResult<{ inviteCode: string; slug: string }>> {
  try {
    await requireAdmin(idToken);

    const companyName = str(input.companyName, 120, "Company name");
    const managerName = str(input.managerName, 120, "Manager name");
    const phone = str(input.phone, 40, "Phone");
    const email = str(input.email, 200, "Email").toLowerCase();
    if (!companyName || !managerName || !phone) {
      throw new ValidationError("Company name, manager name and phone are required");
    }
    if (!EMAIL.test(email)) throw new ValidationError("A valid email is required — the owner must sign up with it");

    const duplicate = await companies().where("email", "==", email).limit(1).get();
    if (!duplicate.empty) throw new ValidationError("A company with this email already exists");

    const slug = await uniqueSlug(companyName);
    const inviteCode = generateInviteCode();

    await companies().add({
      companyName,
      managerName,
      phone,
      email,
      location: str(input.location, 500, "Location"),
      certificateNumber: str(input.certificateNumber, 120, "Certificate number"),
      certificateUrl: str(input.certificateUrl, 1000, "Certificate"),
      businessType: str(input.businessType, 80, "Business type") || "Restaurant",
      subscriptionStart: str(input.subscriptionStart, 40, "Subscription start"),
      subscriptionEnd: str(input.subscriptionEnd, 40, "Subscription end"),
      notes: str(input.notes, 3000, "Notes"),
      status: "inactive",
      ownerUid: "",
      inviteCode,
      inviteUsed: false,
      slug,
      plan: "standard",
      premiumEnabled: false,
      premiumTemplate: "default",
      createdAt: now(),
      updatedAt: now(),
    });

    return { ok: true, data: { inviteCode, slug } };
  } catch (err) {
    return fail(err, "Failed to create company");
  }
}

export async function setCompanyStatus(idToken: string, id: string, status: CompanyStatus): Promise<ActionResult> {
  try {
    await requireAdmin(idToken);
    if (status !== "active" && status !== "inactive") throw new ValidationError("Invalid status");
    await updateCompany(id, { status }, { status });
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Status update failed");
  }
}

export async function renewSubscription(idToken: string, id: string, days: number): Promise<ActionResult<string>> {
  try {
    await requireAdmin(idToken);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      throw new ValidationError("Days must be between 1 and 3650");
    }
    const snap = await companies().doc(id).get();
    if (!snap.exists) throw new ValidationError("Company not found");

    const today = new Date();
    const currentEnd = new Date(snap.get("subscriptionEnd") || today);
    const base = currentEnd > today ? currentEnd : today;
    base.setDate(base.getDate() + days);
    const subscriptionEnd = base.toISOString();

    await updateCompany(id, { subscriptionEnd, status: "active" }, { status: "active" });
    return { ok: true, data: subscriptionEnd };
  } catch (err) {
    return fail(err, "Renewal failed");
  }
}

export async function updatePremium(
  idToken: string,
  id: string,
  change: { plan?: Plan; premiumEnabled?: boolean; premiumTemplate?: PremiumTemplate }
): Promise<ActionResult> {
  try {
    await requireAdmin(idToken);
    const fields: Record<string, unknown> = {};
    if (change.plan !== undefined) {
      if (!PLANS.includes(change.plan)) throw new ValidationError("Invalid plan");
      fields.plan = change.plan;
    }
    if (change.premiumEnabled !== undefined) fields.premiumEnabled = change.premiumEnabled === true;
    if (change.premiumTemplate !== undefined) {
      if (!TEMPLATES.includes(change.premiumTemplate)) throw new ValidationError("Invalid template");
      fields.premiumTemplate = change.premiumTemplate;
    }
    await updateCompany(id, fields, fields);
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Premium update failed");
  }
}

/** Removes the company record only. The owner's restaurant data is kept (and goes offline). */
export async function deleteCompany(idToken: string, id: string): Promise<ActionResult> {
  try {
    await requireAdmin(idToken);
    const ref = companies().doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new ValidationError("Company not found");
    const ownerUid = snap.get("ownerUid");
    const restaurant = ownerUid ? await adminDb().collection("restaurants").doc(ownerUid).get() : null;
    await ref.delete();
    revalidateRestaurant(snap.get("slug"));
    revalidateRestaurant(restaurant?.get("slug"));
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Delete failed");
  }
}
