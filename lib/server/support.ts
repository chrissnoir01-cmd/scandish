import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { DocumentReference } from "firebase-admin/firestore";
import { AuthError, requireUser } from "./auth";
import { adminDb } from "./firebase-admin";
import { inTrial, isPubliclyVisible } from "../subscription";
import type { AgentBusiness, AgentStatus, OnboardingState, SupportAgent } from "../types";

type Doc = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : "");
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export const agentsCol = () => adminDb().collection("supportAgents");

/** A suspension with an end date lifts itself once that date has passed. */
export function effectiveStatus(d: Doc, now = Date.now()): AgentStatus {
  const status = s(d.status) as AgentStatus;
  if (status === "suspended") {
    const until = s(d.suspendedUntil);
    if (until && new Date(until).getTime() <= now) return "active";
  }
  return (["invited", "active", "suspended", "deactivated"] as const).includes(status) ? status : "invited";
}

export function toAgent(id: string, d: Doc, stats = { businesses: 0, liveBusinesses: 0, setupEarnings: 0 }): SupportAgent {
  const status = effectiveStatus(d);
  return {
    id,
    name: s(d.name),
    email: s(d.email),
    phone: s(d.phone),
    notes: s(d.notes),
    status,
    statusReason: status === "active" || status === "invited" ? "" : s(d.statusReason),
    suspendedUntil: status === "suspended" ? s(d.suspendedUntil) : "",
    inviteCode: s(d.inviteCode),
    inviteUsed: d.inviteUsed === true,
    uid: s(d.uid),
    agreementVersion: s(d.agreementVersion),
    agreementAcceptedAt: s(d.agreementAcceptedAt),
    createdAt: s(d.createdAt),
    ...stats,
  };
}

export interface SupportContext {
  user: DecodedIdToken;
  ref: DocumentReference;
  data: Doc;
  status: AgentStatus;
}

/**
 * Verifies the caller is a support member. Status is re-read on every call so a
 * suspension takes effect immediately. Suspended members may still read their
 * portal (to see the notice and agreement) when `allowSuspended` is set.
 */
export async function requireSupport(idToken: unknown, opts: { allowSuspended?: boolean } = {}): Promise<SupportContext> {
  const user = await requireUser(idToken);
  if (user.support !== true) throw new AuthError("This account is not a ScanDish support team account");

  const snap = await agentsCol().where("uid", "==", user.uid).limit(1).get();
  if (snap.empty) throw new AuthError("Support team profile not found. Contact ScanDish.");
  const doc = snap.docs[0];
  const data = doc.data();
  const status = effectiveStatus(data);

  if (status === "deactivated") throw new AuthError("Your support team account has been deactivated.");
  if (status === "suspended" && !opts.allowSuspended) {
    throw new AuthError("Your support team account is suspended. See the notice in your portal.");
  }
  return { user, ref: doc.ref, data, status };
}

/** Businesses created by one member, with live status and whether the manager has taken over. */
export async function businessesForAgent(agentId: string): Promise<AgentBusiness[]> {
  const db = adminDb();
  const companies = await db.collection("companies").where("createdByAgentId", "==", agentId).get();
  const ownerUids = companies.docs.map((c) => s(c.get("ownerUid"))).filter(Boolean);

  const [users, restaurants] = await Promise.all([
    ownerUids.length ? db.getAll(...ownerUids.map((u) => db.collection("users").doc(u))) : [],
    ownerUids.length ? db.getAll(...ownerUids.map((u) => db.collection("restaurants").doc(u))) : [],
  ]);
  const userByUid = new Map(users.map((u) => [u.id, u.data() ?? {}]));
  const slugByUid = new Map(restaurants.map((r) => [r.id, s(r.get("slug"))]));

  return companies.docs
    .map((c): AgentBusiness => {
      const d = c.data();
      const owner = userByUid.get(s(d.ownerUid)) ?? {};
      const vis = { status: d.status, subscriptionEnd: s(d.subscriptionEnd), trialEndsAt: s(d.trialEndsAt) };
      const state: OnboardingState = !vis.subscriptionEnd
        ? d.status === "active" && inTrial(vis) ? "setup_period" : "awaiting_activation"
        : isPubliclyVisible(vis) ? "live" : "offline";
      return {
        id: c.id,
        companyName: s(d.companyName),
        managerName: s(d.managerName),
        email: s(d.email),
        phone: s(d.phone),
        location: s(d.location),
        plan: d.plan === "premium" ? "premium" : "standard",
        slug: slugByUid.get(s(d.ownerUid)) || s(d.slug),
        state,
        managerHasLoggedIn: Boolean(s(owner.firstLoginAt)),
        passwordChanged: owner.mustChangePassword !== true,
        setupFee: n(d.setupFee),
        // Businesses created before revenue sharing recorded only the fee, which the member kept in full.
        agentEarning: typeof d.agentEarning === "number" ? d.agentEarning : n(d.setupFee),
        trialEndsAt: vis.trialEndsAt,
        createdAt: s(d.createdAt),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function statsFor(businesses: AgentBusiness[]) {
  return {
    businesses: businesses.length,
    liveBusinesses: businesses.filter((b) => b.state === "live" || b.state === "setup_period").length,
    setupEarnings: businesses.reduce((sum, b) => sum + b.agentEarning, 0),
  };
}
