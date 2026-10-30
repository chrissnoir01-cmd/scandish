import type { MetadataRoute } from "next";
import { getDirectory } from "@/lib/server/showcase";

const BASE = "https://scandish.online";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/restaurants`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/login`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    // Each live menu at its own address (subdomain, or /r/<slug>), with when it last changed.
    const list = await getDirectory();
    pages.push(
      ...list.map((r) => ({
        url: r.url,
        ...(r.updatedAt ? { lastModified: new Date(r.updatedAt) } : {}),
        changeFrequency: "daily" as const,
        priority: 0.8,
      }))
    );
  } catch (err) {
    // Never fail the sitemap (or the build) because the database is unreachable.
    console.error("sitemap: could not list restaurants", err);
  }

  return pages;
}
