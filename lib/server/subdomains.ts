import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { adminDb } from "./firebase-admin";

/**
 * subdomains/{name} reserves a name for one company:
 *   { companyId, ownerUid }            — the business's current subdomain
 *   { companyId, redirectTo: "new" }   — a former name that permanently redirects to the new one
 * Names are never released, so an old link can't start pointing to a different business.
 */
export const subdomainsCol = () => adminDb().collection("subdomains");

export const subdomainTag = (name: string) => `subdomain:${name}`;

export function revalidateSubdomain(name: string | undefined) {
  if (name) revalidateTag(subdomainTag(name), { expire: 0 });
}

export type SubdomainTarget = { slug: string } | { redirectTo: string };

async function resolve(name: string): Promise<SubdomainTarget | null> {
  const doc = await subdomainsCol().doc(name).get();
  if (!doc.exists) return null;
  const redirectTo = doc.get("redirectTo");
  if (typeof redirectTo === "string" && redirectTo) return { redirectTo };

  const ownerUid = doc.get("ownerUid");
  if (typeof ownerUid !== "string" || !ownerUid) return null;
  const restaurant = await adminDb().collection("restaurants").doc(ownerUid).get();
  const slug = restaurant.get("slug");
  return typeof slug === "string" && slug ? { slug } : null;
}

/** Which page a subdomain shows. Cached; changing a subdomain expires its tag. */
export function resolveSubdomain(name: string) {
  return unstable_cache(() => resolve(name), ["subdomain", name], { tags: [subdomainTag(name)], revalidate: 3600 })();
}
