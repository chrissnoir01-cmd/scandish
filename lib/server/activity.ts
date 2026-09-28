import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { clientInfo } from "./request";
import type { ActivityCategory, ActivityEvent, ActivityType } from "../types";

const CATEGORY: Record<ActivityType, ActivityCategory> = {
  "auth.login": "auth",
  "auth.login_failed": "security",
  "auth.admin_login": "auth",
  "auth.signup": "auth",
  "auth.signup_failed": "security",
  "restaurant.saved": "restaurant",
  "restaurant.upload": "restaurant",
  "admin.company_created": "admin",
  "admin.status_changed": "admin",
  "admin.renewed": "admin",
  "admin.premium_changed": "admin",
  "admin.company_deleted": "admin",
  "admin.support_created": "admin",
  "admin.support_suspended": "admin",
  "admin.support_deactivated": "admin",
  "admin.support_reactivated": "admin",
  "support.signup": "support",
  "support.login": "support",
  "support.business_created": "support",
  "support.password_reissued": "support",
  "restaurant.password_set": "restaurant",
  "security.unauthorized": "security",
};

/** Kept for a year; enable a Firestore TTL policy on `expireAt` to purge automatically. */
const RETENTION_DAYS = 365;

export interface LogInput {
  type: ActivityType;
  message: string;
  actor?: { uid?: string; email?: string };
  target?: { kind: "company" | "restaurant" | "account"; id: string; name?: string };
  meta?: Record<string, string | number | boolean>;
}

const activity = () => adminDb().collection("activity");

/** Records an event. Never throws — logging must not break the action being logged. */
export async function logActivity(input: LogInput): Promise<void> {
  try {
    const { ip, userAgent, device } = await clientInfo().catch(() => ({ ip: "", userAgent: "", device: "desktop" as const }));
    const now = Date.now();
    await activity().add({
      type: input.type,
      category: CATEGORY[input.type],
      message: input.message.slice(0, 500),
      actorUid: input.actor?.uid ?? "",
      actorEmail: input.actor?.email ?? "",
      targetKind: input.target?.kind ?? "",
      targetId: input.target?.id ?? "",
      targetName: input.target?.name ?? "",
      meta: input.meta ?? {},
      ip,
      userAgent,
      device,
      createdAt: FieldValue.serverTimestamp(),
      expireAt: Timestamp.fromMillis(now + RETENTION_DAYS * 86_400_000),
    });
  } catch (err) {
    console.error("activity log failed", err);
  }
}

/** Newest first. Paged by `before` (ISO time of the last event already shown). */
export async function listActivity(opts: { before?: string; limit?: number }): Promise<ActivityEvent[]> {
  let q = activity().orderBy("createdAt", "desc");
  if (opts.before) q = q.startAfter(Timestamp.fromDate(new Date(opts.before)));
  const snap = await q.limit(Math.min(opts.limit ?? 100, 200)).get();

  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      type: x.type,
      category: x.category,
      message: x.message ?? "",
      actorEmail: x.actorEmail ?? "",
      targetKind: x.targetKind ?? "",
      targetName: x.targetName ?? "",
      meta: x.meta ?? {},
      ip: x.ip ?? "",
      device: x.device ?? "",
      createdAt: (x.createdAt as Timestamp | undefined)?.toDate().toISOString() ?? new Date().toISOString(),
    };
  });
}
