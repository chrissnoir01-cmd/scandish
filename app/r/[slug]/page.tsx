import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicRestaurant } from "@/lib/server/restaurants";
import StandardTemplate from "@/components/public/StandardTemplate";
import CamelliaTemplate from "@/components/premium/CamelliaTemplate";
import SampleTemplate from "@/components/premium/SampleTemplate";
import FreshyTemplate from "@/components/premium/FreshyTemplate";
import { optimizeImage } from "@/lib/links";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getPublicRestaurant(slug);
  if (!restaurant) return { title: "Page not found", robots: { index: false } };

  const description =
    restaurant.description || `View the menu, photos, offers and location of ${restaurant.name}.`;
  const image = restaurant.coverImage ? optimizeImage(restaurant.coverImage, 1200) : "/images/hero.png";

  return {
    title: `${restaurant.name} – Menu`,
    description,
    alternates: { canonical: `/r/${slug}` },
    openGraph: {
      title: restaurant.name,
      description,
      url: `/r/${slug}`,
      images: [{ url: image }],
      type: "website",
    },
    twitter: { card: "summary_large_image", title: restaurant.name, description, images: [image] },
  };
}

export default async function RestaurantPage({ params }: Props) {
  const { slug } = await params;
  const restaurant = await getPublicRestaurant(slug);
  if (!restaurant) notFound();

  if (restaurant.plan === "premium" && restaurant.premiumEnabled) {
    switch (restaurant.premiumTemplate) {
      case "camellia":
        return <CamelliaTemplate restaurant={restaurant} />;
      case "sample":
        return <SampleTemplate restaurant={restaurant} />;
      case "freshy":
        return <FreshyTemplate restaurant={restaurant} />;
    }
  }

  return <StandardTemplate restaurant={restaurant} />;
}
