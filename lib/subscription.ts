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

/** Single source of truth for whether a restaurant's public page is online. */
export function isPubliclyVisible(
  company: { status?: CompanyStatus; subscriptionEnd?: string } | null | undefined,
  now = Date.now()
): boolean {
  if (!company || company.status !== "active") return false;
  const days = daysRemaining(company.subscriptionEnd, now);
  if (days === null) return false;
  return days >= -GRACE_DAYS;
}
