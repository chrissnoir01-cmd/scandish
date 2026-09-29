import type { Metadata } from "next";
import { optimizeImage } from "./links";
import type { PublicRestaurant } from "./types";

/** Title, description, canonical address and share previews for a restaurant page served at `url`. */
export function restaurantMetadata(restaurant: PublicRestaurant, url: string): Metadata {
  const description = restaurant.description || `View the menu, photos, offers and location of ${restaurant.name}.`;
  const image = restaurant.coverImage ? optimizeImage(restaurant.coverImage, 1200) : "/images/hero.png";
  return {
    // Absolute title: a restaurant's own address shouldn't carry the "| ScanDish" suffix first.
    title: { absolute: `${restaurant.name} – Menu` },
    description,
    alternates: { canonical: url },
    openGraph: { title: restaurant.name, description, url, siteName: restaurant.name, images: [{ url: image }], type: "website" },
    twitter: { card: "summary_large_image", title: restaurant.name, description, images: [image] },
  };
}
