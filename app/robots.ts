import type { MetadataRoute } from "next";

const PRIVATE = ["/dashboard", "/master-admin", "/api/", "/auth/", "/forgot-password", "/support", "/s/"];

/** AI assistants and their crawlers, welcomed by name so ScanDish's public facts (/about, /llms.txt) reach them. */
const AI_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: ["/", "/about", "/llms.txt"], disallow: PRIVATE },
    ],
    sitemap: "https://scandish.online/sitemap.xml",
    host: "https://scandish.online",
  };
}
