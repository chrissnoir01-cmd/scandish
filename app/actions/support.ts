"use server";

import { AGREEMENT_VERSION, MIN_PASSWORD_LENGTH, SETUP_FEES } from "@/lib/brand";
import { logActivity } from "@/lib/server/activity";
import { adminAuth, adminDb } from "@/lib/server/firebase-admin";
import { generateTempPassword, uniqueSlug } from "@/lib/server/ids";
import { restaurantForCompany } from "@/lib/server/onboarding";
import { fail } from "@/lib/server/result";
import { agentsCol, businessesForAgent, requireSupport, statsFor, toAgent } from "@/lib/server/support";
import { ValidationError, validateString as str } from "@/lib/server/validate";
import type { ActionResult, Plan, SupportPortal } from "@/lib/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID = "Invalid invite code or email";

/** Support member creates their own password from the invite MasterAdmin gave them. */
export async function claimSupportInvite(input: {
  email: string;
  inviteCode: string;
  password: string;
  acceptedAgreement: boolean;
}): Promise<ActionResult> {
  const email = String(input.email ?? "").trim().toLowerCase();
  const inviteCode = String(input.inviteCode ?? "").trim().toUpperCase();
  const password = String(input.password ?? "");

  try {
    if (input.acceptedAgreement !== true) throw new ValidationError("You must accept the Support Team Agreement");
    if (!EMAIL.test(email)) throw new ValidationError("Enter a valid email");
    if (!inviteCode) throw new ValidationError("Enter your invite code");
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const db = adminDb();
    const query = agentsCol().where("inviteCode", "==", inviteCode).limit(1);
    const agent = await db.runTransaction(async (tx) => {
      const snap = await tx.get(query);
      if (snap.empty) throw new ValidationError(INVALID);
      const doc = snap.docs[0];
      if (doc.get("inviteUsed") === true) throw new ValidationError("This invite has already been used");
      if (doc.get("status") === "deactivated") throw new ValidationError(INVALID);
      if (String(doc.get("email") ?? "").toLowerCase() !== email) throw new ValidationError(INVALID);
      tx.update(doc.ref, { inviteUsed: true });
      return doc;
    });

    let uid: string;
    try {
      uid = (await adminAuth().createUser({ email, password, displayName: agent.get("name") ?? undefined })).uid;
    } catch (err) {
      await agent.ref.update({ inviteUsed: false });
      if ((err as { code?: string }).code === "auth/email-already-exists") {
        throw new ValidationError("An account with this email already exists. Contact ScanDish.");
      }
      throw err;
    }

    await adminAuth().setCustomUserClaims(uid, { support: true });
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.update(agent.ref, {
      uid,
      status: "active",
      agreementVersion: AGREEMENT_VERSION,
      agreementAcceptedAt: now,
      updatedAt: now,
    });
    batch.set(db.collection("users").doc(uid), { email, role: "support", createdAt: now });
    await batch.commit();

    await logActivity({
      type: "support.signup",
      message: `${agent.get("name")} (${email}) joined the support team and accepted the agreement`,
      actor: { uid, email },
      target: { kind: "account", id: uid, name: agent.get("name") ?? email },
      meta: { agreementVersion: AGREEMENT_VERSION },
    });
    return { ok: true, data: undefined };
  } catch (err) {
    if (err instanceof ValidationError) {
      await logActivity({
        type: "auth.signup_failed",
        message: `Support team signup refused for ${email || "unknown email"}: ${err.message}`,
        actor: { email },
      });
    }
    return fail(err, "Signup failed. Please try again.");
  }
}

export async function loadSupportPortal(idToken: string): Promise<ActionResult<SupportPortal>> {
  try {
    const { ref, data } = await requireSupport(idToken, { allowSuspended: true });
    const businesses = await businessesForAgent(ref.id);
    return { ok: true, data: { agent: toAgent(ref.id, data, statsFor(businesses)), businesses } };
  } catch (err) {
    return fail(err, "Could not load your portal");
  }
}

export interface NewBusinessInput {
  companyName: string;
  managerName: string;
  phone: string;
  email: string;
  location: string;
  businessType: string;
  plan: Plan;
  notes: string;
}

/**
 * Creates the company, its manager's login with a temporary password, and the restaurant record.
 * The page stays offline until MasterAdmin activates the subscription.
 */
export async function createBusiness(
  idToken: string,
  input: NewBusinessInput
): Promise<ActionResult<{ tempPassword: string; email: string; slug: string }>> {
  try {
    const { user, ref, data: agent } = await requireSupport(idToken);

    const companyName = str(input.companyName, 120, "Business name");
    const managerName = str(input.managerName, 120, "Manager name");
    const phone = str(input.phone, 40, "Phone");
    const email = str(input.email, 200, "Manager email").toLowerCase();
    if (!companyName || !managerName || !phone) throw new ValidationError("Business name, manager name and phone are required");
    if (!EMAIL.test(email)) throw new ValidationError("A valid manager email is required — it is their login");
    const plan: Plan = input.plan === "premium" ? "premium" : "standard";

    const db = adminDb();
    const duplicate = await db.collection("companies").where("email", "==", email).limit(1).get();
    if (!duplicate.empty) throw new ValidationError("A business with this email already exists");

    const slug = await uniqueSlug(companyName);
    const tempPassword = generateTempPassword();
    const now = new Date().toISOString();
    const companyRef = db.collection("companies").doc();
    const company = {
      companyName,
      managerName,
      phone,
      email,
      location: str(input.location, 500, "Location"),
      businessType: str(input.businessType, 80, "Business type") || "Restaurant",
      notes: str(input.notes, 2000, "Notes"),
      certificateNumber: "",
      certificateUrl: "",
      subscriptionStart: "",
      subscriptionEnd: "",
      status: "inactive",
      inviteCode: "",
      inviteUsed: true,
      slug,
      plan,
      premiumEnabled: false,
      premiumTemplate: "default",
      setupFee: SETUP_FEES[plan],
      createdByAgentId: ref.id,
      createdByAgentName: agent.name ?? "",
      createdAt: now,
      updatedAt: now,
    };

    let ownerUid: string;
    try {
      ownerUid = (await adminAuth().createUser({ email, password: tempPassword, displayName: managerName })).uid;
    } catch (err) {
      if ((err as { code?: string }).code === "auth/email-already-exists") {
        throw new ValidationError("This email already has a ScanDish login. Use a different email.");
      }
      throw err;
    }

    const batch = db.batch();
    batch.set(companyRef, { ...company, ownerUid });
    batch.set(db.collection("users").doc(ownerUid), {
      email,
      role: "restaurant",
      mustChangePassword: true,
      createdByAgentId: ref.id,
      createdAt: now,
    });
    batch.set(db.collection("restaurants").doc(ownerUid), restaurantForCompany(companyRef.id, company, ownerUid, email, now));
    try {
      await batch.commit();
    } catch (err) {
      await adminAuth().deleteUser(ownerUid).catch(() => {});
      throw err;
    }

    await logActivity({
      type: "support.business_created",
      message: `${agent.name} created ${companyName} (${plan}) for ${managerName} <${email}> — awaiting activation`,
      actor: { uid: user.uid, email: user.email },
      target: { kind: "company", id: companyRef.id, name: companyName },
      meta: { plan, setupFee: SETUP_FEES[plan], slug },
    });
    return { ok: true, data: { tempPassword, email, slug } };
  } catch (err) {
    return fail(err, "Could not create the business");
  }
}

/** New temporary password — only while the manager hasn't set their own yet. */
export async function reissueTempPassword(idToken: string, companyId: string): Promise<ActionResult<{ tempPassword: string; email: string }>> {
  try {
    const { user, ref, data: agent } = await requireSupport(idToken);
    const db = adminDb();
    const company = await db.collection("companies").doc(String(companyId)).get();
    if (!company.exists || company.get("createdByAgentId") !== ref.id) throw new ValidationError("Business not found");

    const ownerUid = company.get("ownerUid");
    const owner = ownerUid ? await db.collection("users").doc(ownerUid).get() : null;
    if (!owner?.exists) throw new ValidationError("This business has no login yet");
    if (owner.get("mustChangePassword") !== true) {
      throw new ValidationError("The manager has already set their own password. They can use “Forgot password?” on the login page.");
    }

    const tempPassword = generateTempPassword();
    await adminAuth().updateUser(ownerUid, { password: tempPassword });
    await adminAuth().revokeRefreshTokens(ownerUid);

    await logActivity({
      type: "support.password_reissued",
      message: `${agent.name} issued a new temporary password for ${company.get("companyName")}`,
      actor: { uid: user.uid, email: user.email },
      target: { kind: "company", id: company.id, name: company.get("companyName") ?? "" },
    });
    return { ok: true, data: { tempPassword, email: company.get("email") ?? "" } };
  } catch (err) {
    return fail(err, "Could not issue a new password");
  }
}
