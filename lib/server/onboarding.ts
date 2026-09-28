import "server-only";

type Doc = Record<string, unknown>;

/** Initial restaurant record for a company's owner account (used by invite signup and support onboarding). */
export function restaurantForCompany(companyId: string, company: Doc, ownerUid: string, ownerEmail: string, now: string) {
  return {
    ownerUid,
    ownerEmail,
    companyId,
    name: company.companyName ?? "",
    slug: company.slug ?? "",
    phone: company.phone ?? "",
    location: company.location ?? "",
    plan: company.plan ?? "standard",
    premiumEnabled: company.premiumEnabled === true,
    premiumTemplate: company.premiumTemplate ?? "default",
    status: company.status ?? "inactive",
    createdAt: now,
    updatedAt: now,
  };
}
