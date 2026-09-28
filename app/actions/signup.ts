"use server";

import { logActivity } from "@/lib/server/activity";
import { adminAuth, adminDb } from "@/lib/server/firebase-admin";
import { TERMS_VERSION } from "@/lib/brand";
import { fail } from "@/lib/server/result";
import { ValidationError } from "@/lib/server/validate";
import type { ActionResult } from "@/lib/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID = "Invalid invite code or email";

/**
 * Creates the owner account for a company invite. The invite is claimed in a
 * transaction first so two people can never use the same code.
 */
export async function claimInvite(input: {
  email: string;
  inviteCode: string;
  password: string;
  acceptedTerms: boolean;
}): Promise<ActionResult> {
  const email = String(input.email ?? "").trim().toLowerCase();
  const inviteCode = String(input.inviteCode ?? "").trim().toUpperCase();
  const password = String(input.password ?? "");

  try {
    if (input.acceptedTerms !== true) {
      throw new ValidationError("Please accept the Terms of Service and Privacy Policy");
    }
    if (!EMAIL.test(email)) throw new ValidationError("Enter a valid email");
    if (!inviteCode) throw new ValidationError("Enter your invite code");
    if (password.length < 8) throw new ValidationError("Password must be at least 8 characters");

    const db = adminDb();
    const query = db.collection("companies").where("inviteCode", "==", inviteCode).limit(1);

    const company = await db.runTransaction(async (tx) => {
      const snap = await tx.get(query);
      if (snap.empty) throw new ValidationError(INVALID);
      const doc = snap.docs[0];
      if (doc.get("inviteUsed") === true) throw new ValidationError("This invite has already been used");
      const companyEmail = String(doc.get("email") ?? "").trim().toLowerCase();
      // Same message as a wrong code so the form can't be used to probe emails.
      if (companyEmail && companyEmail !== email) throw new ValidationError(INVALID);
      tx.update(doc.ref, { inviteUsed: true, inviteClaimedAt: new Date().toISOString() });
      return doc;
    });

    let uid: string;
    try {
      uid = (await adminAuth().createUser({ email, password })).uid;
    } catch (err) {
      await company.ref.update({ inviteUsed: false, inviteClaimedAt: null });
      if ((err as { code?: string }).code === "auth/email-already-exists") {
        throw new ValidationError("An account with this email already exists. Try logging in.");
      }
      throw err;
    }

    const now = new Date().toISOString();
    const batch = db.batch();
    batch.set(db.collection("users").doc(uid), {
      email,
      role: "restaurant",
      createdAt: now,
      termsAcceptedAt: now,
      termsVersion: TERMS_VERSION,
    });
    batch.set(db.collection("restaurants").doc(uid), {
      ownerUid: uid,
      ownerEmail: email,
      companyId: company.id,
      name: company.get("companyName") ?? "",
      slug: company.get("slug") ?? "",
      phone: company.get("phone") ?? "",
      location: company.get("location") ?? "",
      plan: company.get("plan") ?? "standard",
      premiumEnabled: company.get("premiumEnabled") === true,
      premiumTemplate: company.get("premiumTemplate") ?? "default",
      status: company.get("status") ?? "inactive",
      createdAt: now,
      updatedAt: now,
    });
    batch.update(company.ref, { ownerUid: uid });
    await batch.commit();

    await logActivity({
      type: "auth.signup",
      message: `${email} created the owner account for ${company.get("companyName") ?? "a company"}`,
      actor: { uid, email },
      target: { kind: "company", id: company.id, name: company.get("companyName") ?? "" },
      meta: { termsVersion: TERMS_VERSION },
    });
    return { ok: true, data: undefined };
  } catch (err) {
    if (err instanceof ValidationError) {
      await logActivity({
        type: "auth.signup_failed",
        message: `Signup refused for ${email || "unknown email"}: ${err.message}`,
        actor: { email },
        meta: { code: inviteCode.slice(0, 20) },
      });
    }
    return fail(err, "Signup failed. Please try again.");
  }
}
