import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import RestaurantView from "@/components/public/RestaurantView";
import { subdomainUrl } from "@/lib/domains";
import { restaurantMetadata } from "@/lib/restaurant-metadata";
import { getPublicRestaurant, listPublicPages } from "@/lib/server/restaurants";
import { resolveSubdomain } from "@/lib/server/subdomains";

/**
 * A Premium business on its own subdomain. proxy.ts rewrites kiza.scandish.online → /s/kiza,
 * so visitors only ever see the subdomain. The canonical URL is always the subdomain, and /s/
 * is disallowed in the main robots.txt, so search engines never index the internal path.
 * Prebuilt and served from the CDN; changes refresh it through the restaurant and subdomain tags.
 */
export const revalidate = 3600;

export async function generateStaticParams(): Promise<{ sub: string }[]> {
  try {
    return (await listPublicPages()).filter((p) => p.subdomain).map((p) => ({ sub: p.subdomain }));
  } catch (err) {
    console.error("could not list subdomains to prebuild", err);
    return [];
  }
}

type Props = { params: Promise<{ sub: string }> };

const NAME = /^[a-z0-9-]{3,32}$/;

async function load(sub: string) {
  if (!NAME.test(sub)) return null;
  const target = await resolveSubdomain(sub);
  if (!target) return null;
  if ("redirectTo" in target) return target;
  const restaurant = await getPublicRestaurant(target.slug);
  // Hidden while the subscription is inactive; the name stays reserved for the business.
  return restaurant && restaurant.subdomain === sub ? { restaurant } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sub } = await params;
  const page = await load(sub);
  if (!page || !("restaurant" in page)) return { title: "Page not found", robots: { index: false } };
  return restaurantMetadata(page.restaurant, `${subdomainUrl(sub)}/`);
}

export default async function SubdomainPage({ params }: Props) {
  const { sub } = await params;
  const page = await load(sub);
  if (!page) notFound();
  // A renamed subdomain forwards to the current one.
  if ("redirectTo" in page) permanentRedirect(`${subdomainUrl(page.redirectTo)}/`);

  return <RestaurantView restaurant={page.restaurant} url={`${subdomainUrl(sub)}/`} />;
}
