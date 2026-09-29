import { NextResponse, type NextRequest } from "next/server";
import { subdomainFromHost } from "@/lib/domains";

/**
 * Restaurant pages are prebuilt (served from the CDN), so request-specific routing lives here.
 *
 * Business subdomains. kiza.scandish.online is served by the internal /s/kiza route through a
 * rewrite, so the address bar keeps the subdomain. Other paths on a subdomain belong to the main
 * site: /s/kiza/go/... answers them with a redirect there.
 */
export function proxy(request: NextRequest) {
  const sub = subdomainFromHost(request.headers.get("host"));
  const { pathname, search, searchParams } = request.nextUrl;

  if (!sub) {
    // QR scans (/r/<slug>?s=qr) use a prebuilt twin page that forwards the QR tag to a Premium subdomain.
    const slug = pathname.match(/^\/r\/([a-z0-9-]+)\/?$/)?.[1];
    if (slug && searchParams.get("s") === "qr") return NextResponse.rewrite(new URL(`/r/${slug}/qr${search}`, request.url));
    return NextResponse.next();
  }

  // The page's anonymous view counter and table orders post here.
  if (pathname === "/api/track" || pathname === "/api/orders") return NextResponse.next();

  const target =
    pathname === "/" ? `/s/${sub}${search}` : pathname === "/sitemap.xml" || pathname === "/robots.txt" ? `/s/${sub}${pathname}` : `/s/${sub}/go${pathname}${search}`;
  return NextResponse.rewrite(new URL(target, request.url));
}

export const config = {
  // Skip Next.js internals and static files (sitemap.xml / robots.txt still go through).
  matcher: ["/((?!_next/|.*\\.(?:ico|png|jpe?g|gif|webp|avif|svg|css|js|map|woff2?|ttf|webmanifest)$).*)"],
};