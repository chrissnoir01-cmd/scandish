import { INDEXNOW_KEY } from "@/lib/seo";

/** Served at https://<any scandish host>/<key>.txt (see proxy.ts) so search engines can confirm our IndexNow pings. */
export function GET() {
  return new Response(INDEXNOW_KEY, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
