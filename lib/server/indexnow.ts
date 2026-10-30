import "server-only";
import { INDEXNOW_KEY } from "../seo";

/**
 * Tells Bing and the other IndexNow search engines (Yandex, Seznam, Naver…; Bing also feeds ChatGPT
 * search) that pages changed, so they re-read them within minutes instead of days. Google doesn't
 * use IndexNow — it reads the sitemap (submit it once in Search Console). Never throws.
 */
export async function notifySearchEngines(urls: string[]): Promise<void> {
  if (process.env.VERCEL_ENV !== "production") return; // only the live site, never tests or previews
  const byHost = new Map<string, string[]>();
  for (const u of urls) {
    try {
      const { host } = new URL(u);
      byHost.set(host, [...(byHost.get(host) ?? []), u]);
    } catch {
      // Not a full URL: skip.
    }
  }
  await Promise.all(
    [...byHost].map(async ([host, urlList]) => {
      try {
        await fetch("https://api.indexnow.org/indexnow", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `https://${host}/${INDEXNOW_KEY}.txt`, urlList }),
          signal: AbortSignal.timeout(8_000),
        });
      } catch (err) {
        console.error("IndexNow ping failed", host, err);
      }
    })
  );
}
