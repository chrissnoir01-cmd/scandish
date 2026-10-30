import type { Metadata } from "next";
import { optimizeImage } from "./links";
import { restaurantDescription, restaurantTitle } from "./seo";
import type { PublicRestaurant } from "./types";

/** Title, description, canonical address and share previews for a restaurant page served at `url`. */
export function restaurantMetadata(restaurant: PublicRestaurant, url: string): Metadata {
  // Written for search: name + "menu" + place + categories + a few dishes with prices.
  const description = restaurantDescription(restaurant);
  const image = restaurant.coverImage ? optimizeImage(restaurant.coverImage, 1200) : "/images/hero.png";
  return {
    // Absolute title: a restaurant's own address shouldn't carry the "| ScanDish" suffix first.
    title: { absolute: restaurantTitle(restaurant.name, restaurant.location) },
    description,
    alternates: { canonical: url },
    openGraph: { title: restaurantTitle(restaurant.name, restaurant.location), description, url, siteName: restaurant.name, images: [{ url: image }], type: "website" },
    twitter: { card: "summary_large_image", title: restaurant.name, description, images: [image] },
  };
}
