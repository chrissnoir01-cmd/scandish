import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import RestaurantView from "@/components/public/RestaurantView";
import { ROOT_URL, subdomainUrl } from "@/lib/domains";
import { restaurantMetadata } from "@/lib/restaurant-metadata";
import { getPublicRestaurant, listPublicPages } from "@/lib/server/restaurants";

/**
 * /r/<slug> and its QR twin /r/<slug>/qr (proxy.ts routes ?s=qr visits there). Both are prebuilt
 * and served from the CDN; a publish or admin change refreshes them through the restaurant's tag.
 */

/** Prebuild every public page at deploy time; others are built on their first visit. */
export async function slugStaticParams(): Promise<{ slug: string }[]> {
  try {
    return (await listPublicPages()).map((p) => ({ slug: p.slug }));
  } catch (err) {
    console.error("could not list restaurant pages to prebuild", err);
    return [];
  }
}

export async function slugMetadata(slug: string): Promise<Metadata> {
  const restaurant = await getPublicRestaurant(slug);
  if (!restaurant) return { title: "Page not found", robots: { index: false } };
  const url = restaurant.subdomain ? `${subdomainUrl(restaurant.subdomain)}/` : `${ROOT_URL}/r/${slug}`;
  return restaurantMetadata(restaurant, url);
}

export async function SlugPage({ slug, fromQr }: { slug: string; fromQr: boolean }) {
  const restaurant = await getPublicRestaurant(slug);
  if (!restaurant) notFound();

  // Premium pages live on their own subdomain; old links and printed QR codes forward there (308),
  // keeping the QR tag so the scan is still counted as a QR visit.
  if (restaurant.subdomain) permanentRedirect(`${subdomainUrl(restaurant.subdomain)}/${fromQr ? "?s=qr" : ""}`);

  return <RestaurantView restaurant={restaurant} url={`${ROOT_URL}/r/${slug}`} />;
}
