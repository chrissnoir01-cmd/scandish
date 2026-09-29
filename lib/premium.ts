/**
 * Premium pages are designed from scratch by ScanDish for each business. The owner fills in their
 * content meanwhile (shown in the Standard design) until MasterAdmin switches the Premium page on.
 */
export const PREMIUM_BUILD_DAYS = { min: 1, max: 3 } as const;

const KIGALI_OFFSET_MS = 2 * 3_600_000; // UTC+2, no daylight saving

/** Adds working days (Mon–Fri, Kigali time) to a date. */
export function addWorkingDays(fromIso: string, days: number): string {
  const d = new Date(new Date(fromIso).getTime() + KIGALI_OFFSET_MS);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) left--;
  }
  return new Date(d.getTime() - KIGALI_OFFSET_MS).toISOString();
}

/** When a Premium page ordered at `requestedAt` is due at the latest. */
export const premiumDueDate = (requestedAt: string) => addWorkingDays(requestedAt, PREMIUM_BUILD_DAYS.max);

/** A Premium business whose custom page hasn't been switched on yet. */
export const premiumPending = (c: { plan?: unknown; premiumEnabled?: unknown }) =>
  c.plan === "premium" && c.premiumEnabled !== true;
