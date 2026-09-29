import { ROOT_URL } from "@/lib/domains";

/** Any path other than the page itself on a business subdomain (e.g. /login) belongs to the main site. */
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const { search } = new URL(req.url);
  const location = `${ROOT_URL}/${path.map(encodeURIComponent).join("/")}${search}`;
  return new Response(null, { status: 308, headers: { Location: location, "Cache-Control": "public, max-age=3600" } });
}
