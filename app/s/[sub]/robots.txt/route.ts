import { subdomainUrl } from "@/lib/domains";

/** robots.txt for one business subdomain (served at kiza.scandish.online/robots.txt). */
export async function GET(_req: Request, { params }: { params: Promise<{ sub: string }> }) {
  const { sub } = await params;
  if (!/^[a-z0-9-]{3,32}$/.test(sub)) return new Response("Not found", { status: 404 });
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${subdomainUrl(sub)}/sitemap.xml\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
