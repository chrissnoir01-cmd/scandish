import type { MetadataRoute } from "next";
import { listPublicSlugs } from "@/lib/server/restaurants";

const BASE = "https://scandish.online";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/login`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const slugs = await listPublicSlugs();
    pages.push(...slugs.map((slug) => ({ url: `${BASE}/r/${slug}`, changeFrequency: "daily" as const, priority: 0.8 })));
  } catch (err) {
    // Never fail the sitemap (or the build) because the database is unreachable.
    console.error("sitemap: could not list restaurants", err);
  }

  return pages;
}
