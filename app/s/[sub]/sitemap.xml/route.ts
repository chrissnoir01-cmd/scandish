import { subdomainUrl } from "@/lib/domains";
import { getPublicRestaurant } from "@/lib/server/restaurants";
import { resolveSubdomain } from "@/lib/server/subdomains";

/** sitemap.xml for one business subdomain (served at kiza.scandish.online/sitemap.xml). */
export async function GET(_req: Request, { params }: { params: Promise<{ sub: string }> }) {
  const { sub } = await params;
  const target = /^[a-z0-9-]{3,32}$/.test(sub) ? await resolveSubdomain(sub) : null;
  const restaurant = target && "slug" in target ? await getPublicRestaurant(target.slug) : null;
  const urls = restaurant && restaurant.subdomain === sub ? [`${subdomainUrl(sub)}/`] : [];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n`).join("") +
    `</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
