import type { CompanyStatus } from "./types";

/** Days a page stays online after the subscription end date. */
export const GRACE_DAYS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysRemaining(subscriptionEnd: string | undefined, now = Date.now()): number | null {
  if (!subscriptionEnd) return null;
  const end = new Date(subscriptionEnd).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - now) / DAY_MS);
}

export interface VisibilityInput {
  status?: CompanyStatus;
  subscriptionEnd?: string;
  /** Setup period for support-created businesses; applies only until a subscription is confirmed. */
  trialEndsAt?: string;
}

/** True while a support-created business is in its setup period (no confirmed subscription yet). */
export function inTrial(c: VisibilityInput, now = Date.now()): boolean {
  if (c.subscriptionEnd || !c.trialEndsAt) return false;
  const end = new Date(c.trialEndsAt).getTime();
  return !Number.isNaN(end) && now < end;
}

/** Single source of truth for whether a restaurant's public page is online. */
export function isPubliclyVisible(c: VisibilityInput | null | undefined, now = Date.now()): boolean {
  if (!c || c.status !== "active") return false;
  // Setup period: live until it ends, no grace days.
  if (!c.subscriptionEnd) return inTrial(c, now);
  const days = daysRemaining(c.subscriptionEnd, now);
  if (days === null) return false;
  return days >= -GRACE_DAYS;
}
