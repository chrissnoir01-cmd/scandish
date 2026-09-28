"use server";

import { logActivity, listActivity as readActivity } from "@/lib/server/activity";
import { requireAdmin } from "@/lib/server/auth";
import { adminAuth, adminDb } from "@/lib/server/firebase-admin";
import { generateInviteCode, uniqueSlug } from "@/lib/server/ids";
import { fail } from "@/lib/server/result";
import { revalidateRestaurant } from "@/lib/server/restaurants";
import { ValidationError, validateString as str } from "@/lib/server/validate";
import { agentsCol, businessesForAgent, statsFor, toAgent } from "@/lib/server/support";
import type {
  AccountSummary,
  ActionResult,
  ActivityEvent,
  Company,
  CompanyStatus,
  Plan,
  PremiumTemplate,
  SupportAgent,
} from "@/lib/types";

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
    createdByAgentName: s("createdByAgentName"),
    setupFee: typeof d.setupFee === "number" ? d.setupFee : 0,
    createdAt: s("createdAt"),
    updatedAt: s("updatedAt"),
  };
}

/** Applies a change to a company and mirrors the given fields onto its restaurant. Returns the company name. */
async function updateCompany(
  id: string,
  fields: Record<string, unknown>,
  mirror: Record<string, unknown> = {}
): Promise<string> {
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
  return snap.get("companyName") ?? "";
}

const adminActor = (a: { uid: string; email?: string }) => ({ uid: a.uid, email: a.email });

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
    const admin = await requireAdmin(idToken);

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

    const ref = await companies().add({
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

    await logActivity({
      type: "admin.company_created",
      message: `Created company ${companyName} (${email}) — page /r/${slug}`,
      actor: adminActor(admin),
      target: { kind: "company", id: ref.id, name: companyName },
    });
    return { ok: true, data: { inviteCode, slug } };
  } catch (err) {
    return fail(err, "Failed to create company");
  }
}

export async function setCompanyStatus(idToken: string, id: string, status: CompanyStatus): Promise<ActionResult> {
  try {
    const admin = await requireAdmin(idToken);
    if (status !== "active" && status !== "inactive") throw new ValidationError("Invalid status");
    const name = await updateCompany(id, { status }, { status });
    await logActivity({
      type: "admin.status_changed",
      message: `${status === "active" ? "Activated" : "Deactivated"} ${name}`,
      actor: adminActor(admin),
      target: { kind: "company", id, name },
      meta: { status },
    });
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Status update failed");
  }
}

export async function renewSubscription(idToken: string, id: string, days: number): Promise<ActionResult<string>> {
  try {
    const admin = await requireAdmin(idToken);
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

    const name = await updateCompany(id, { subscriptionEnd, status: "active" }, { status: "active" });
    await logActivity({
      type: "admin.renewed",
      message: `Renewed ${name} for ${days} days — now ends ${subscriptionEnd.slice(0, 10)}`,
      actor: adminActor(admin),
      target: { kind: "company", id, name },
      meta: { days, subscriptionEnd },
    });
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
    const admin = await requireAdmin(idToken);
    const fields: Record<string, string | boolean> = {};
    if (change.plan !== undefined) {
      if (!PLANS.includes(change.plan)) throw new ValidationError("Invalid plan");
      fields.plan = change.plan;
    }
    if (change.premiumEnabled !== undefined) fields.premiumEnabled = change.premiumEnabled === true;
    if (change.premiumTemplate !== undefined) {
      if (!TEMPLATES.includes(change.premiumTemplate)) throw new ValidationError("Invalid template");
      fields.premiumTemplate = change.premiumTemplate;
    }
    const name = await updateCompany(id, fields, fields);
    await logActivity({
      type: "admin.premium_changed",
      message: `Changed ${name}: ${Object.entries(fields).map(([k, v]) => `${k} → ${v}`).join(", ")}`,
      actor: adminActor(admin),
      target: { kind: "company", id, name },
      meta: fields,
    });
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Premium update failed");
  }
}

/** Removes the company record only. The owner's restaurant data is kept (and goes offline). */
export async function deleteCompany(idToken: string, id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin(idToken);
    const ref = companies().doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new ValidationError("Company not found");
    const ownerUid = snap.get("ownerUid");
    const restaurant = ownerUid ? await adminDb().collection("restaurants").doc(ownerUid).get() : null;
    await ref.delete();
    revalidateRestaurant(snap.get("slug"));
    revalidateRestaurant(restaurant?.get("slug"));
    const name = snap.get("companyName") ?? "";
    await logActivity({
      type: "admin.company_deleted",
      message: `Deleted company ${name} (${snap.get("email") ?? "no email"})`,
      actor: adminActor(admin),
      target: { kind: "company", id, name },
    });
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Delete failed");
  }
}

export async function listActivity(
  idToken: string,
  before?: string
): Promise<ActionResult<ActivityEvent[]>> {
  try {
    await requireAdmin(idToken);
    return { ok: true, data: await readActivity({ before, limit: 100 }) };
  } catch (err) {
    return fail(err, "Could not load activity");
  }
}

/** Every login account, straight from Firebase Auth, joined with its role and restaurant. */
export async function listAccounts(idToken: string): Promise<ActionResult<AccountSummary[]>> {
  try {
    await requireAdmin(idToken);
    const db = adminDb();
    const [users, restaurants] = await Promise.all([
      db.collection("users").select("role").get(),
      db.collection("restaurants").select("name", "slug").get(),
    ]);
    const roles = new Map(users.docs.map((d) => [d.id, d.get("role")]));
    const places = new Map(restaurants.docs.map((d) => [d.id, { name: d.get("name") ?? "", slug: d.get("slug") ?? "" }]));

    const accounts: AccountSummary[] = [];
    let pageToken: string | undefined;
    do {
      const page = await adminAuth().listUsers(1000, pageToken);
      for (const u of page.users) {
        const place = places.get(u.uid);
        const role =
          u.customClaims?.admin === true
            ? "admin"
            : u.customClaims?.support === true
              ? "support"
              : roles.get(u.uid) === "restaurant" || place
                ? "restaurant"
                : "unknown";
        const iso = (t?: string | null) => (t ? new Date(t).toISOString() : "");
        accounts.push({
          uid: u.uid,
          email: u.email ?? "",
          role,
          restaurantName: place?.name ?? "",
          slug: place?.slug ?? "",
          emailVerified: u.emailVerified,
          disabled: u.disabled,
          createdAt: iso(u.metadata.creationTime),
          lastSignInAt: iso(u.metadata.lastSignInTime),
          lastActiveAt: iso(u.metadata.lastRefreshTime),
        });
      }
      pageToken = page.pageToken;
    } while (pageToken);

    const last = (a: AccountSummary) => a.lastActiveAt || a.lastSignInAt || a.createdAt;
    accounts.sort((a, b) => last(b).localeCompare(last(a)));
    return { ok: true, data: accounts };
  } catch (err) {
    return fail(err, "Could not load accounts");
  }
}

/* ---------- Support team ---------- */

export async function createSupportAgent(
  idToken: string,
  input: { name: string; email: string; phone: string; notes: string }
): Promise<ActionResult<{ inviteCode: string }>> {
  try {
    const admin = await requireAdmin(idToken);
    const name = str(input.name, 120, "Name");
    const email = str(input.email, 200, "Email").toLowerCase();
    const phone = str(input.phone, 40, "Phone");
    if (!name || !phone) throw new ValidationError("Name and phone are required");
    if (!EMAIL.test(email)) throw new ValidationError("A valid email is required — the member signs up with it");

    const existing = await agentsCol().where("email", "==", email).limit(1).get();
    if (!existing.empty) throw new ValidationError("A support member with this email already exists");

    const inviteCode = generateInviteCode("ST");
    const ref = await agentsCol().add({
      name,
      email,
      phone,
      notes: str(input.notes, 2000, "Notes"),
      status: "invited",
      statusReason: "",
      suspendedUntil: "",
      inviteCode,
      inviteUsed: false,
      uid: "",
      agreementVersion: "",
      agreementAcceptedAt: "",
      createdAt: now(),
      updatedAt: now(),
    });

    await logActivity({
      type: "admin.support_created",
      message: `Invited ${name} (${email}) to the support team`,
      actor: adminActor(admin),
      target: { kind: "account", id: ref.id, name },
    });
    return { ok: true, data: { inviteCode } };
  } catch (err) {
    return fail(err, "Could not create the support member");
  }
}

export async function listSupportAgents(idToken: string): Promise<ActionResult<SupportAgent[]>> {
  try {
    await requireAdmin(idToken);
    const snap = await agentsCol().get();
    const list = await Promise.all(
      snap.docs.map(async (d) => toAgent(d.id, d.data(), statsFor(await businessesForAgent(d.id))))
    );
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { ok: true, data: list };
  } catch (err) {
    return fail(err, "Could not load the support team");
  }
}

/**
 * suspend: temporary; the member can still open their portal to read the notice and agreement.
 * deactivate: sign-in is blocked entirely. reactivate: undoes either.
 */
export async function setSupportAgentStatus(
  idToken: string,
  id: string,
  change: { action: "suspend" | "deactivate" | "reactivate"; reason?: string; until?: string }
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin(idToken);
    const ref = agentsCol().doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) throw new ValidationError("Support member not found");
    const name = snap.get("name") ?? "";
    const uid: string = snap.get("uid") ?? "";

    const reason = str(change.reason, 1000, "Reason");
    if (change.action !== "reactivate" && !reason) {
      throw new ValidationError("Give a reason — the member will see it in their portal");
    }
    let until = "";
    if (change.action === "suspend" && change.until) {
      const d = new Date(change.until);
      if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) throw new ValidationError("The end date must be in the future");
      until = d.toISOString();
    }

    const status = change.action === "suspend" ? "suspended" : change.action === "deactivate" ? "deactivated" : (uid ? "active" : "invited");
    await ref.update({
      status,
      statusReason: change.action === "reactivate" ? "" : reason,
      suspendedUntil: until,
      statusChangedAt: now(),
      updatedAt: now(),
    });

    if (uid) {
      await adminAuth().updateUser(uid, { disabled: change.action === "deactivate" });
      if (change.action === "deactivate") await adminAuth().revokeRefreshTokens(uid);
    }

    const type = change.action === "suspend" ? "admin.support_suspended" : change.action === "deactivate" ? "admin.support_deactivated" : "admin.support_reactivated";
    const detail = change.action === "suspend" ? `until ${until ? until.slice(0, 10) : "further notice"}` : "";
    await logActivity({
      type,
      message: `${change.action === "suspend" ? "Suspended" : change.action === "deactivate" ? "Deactivated" : "Reactivated"} support member ${name}${detail ? ` ${detail}` : ""}${reason ? ` — ${reason}` : ""}`,
      actor: adminActor(admin),
      target: { kind: "account", id: ref.id, name },
    });
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Could not update the support member");
  }
}
