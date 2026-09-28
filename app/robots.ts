import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/master-admin", "/api/", "/auth/", "/forgot-password"],
    },
    sitemap: "https://scandish.online/sitemap.xml",
    host: "https://scandish.online",
  };
}
