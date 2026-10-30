import type { Metadata } from "next";
import { ArrowUpRight, MapPin } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/landing/SiteChrome";
import "@/components/landing/marketing.css";
import { marketingFonts } from "@/lib/fonts";
import { placeOf } from "@/lib/seo";
import { getDirectory, type DirectoryRestaurant } from "@/lib/server/showcase";

export const metadata: Metadata = {
  title: "Restaurant menus in Kigali – prices & photos",
  description:
    "Menus with prices and photos of restaurants, cafés and bars in Kigali on ScanDish: pizza, burgers, grills, drinks and more. Open a menu, see what's on today and order or call.",
  alternates: { canonical: "/restaurants" },
  openGraph: { title: "Restaurant menus in Kigali", url: "/restaurants", type: "website" },
};

// Prebuilt and refreshed hourly, or straight away when a restaurant publishes changes.
export const revalidate = 3600;

/** "PIZZA" / "pizza" → "Pizza"; categories are grouped by this. */
const label = (c: string) => {
  const t = c.trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};

export default async function RestaurantsPage() {
  const list = await getDirectory();

  // "Pizza menus": each category with the restaurants that serve it.
  const byCategory = new Map<string, DirectoryRestaurant[]>();
  for (const r of list) for (const c of r.topics) byCategory.set(c, [...(byCategory.get(c) ?? []), r]);
  const groups = [...byCategory.entries()].filter(([, rs]) => rs.length > 0).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Restaurant menus in Kigali",
    itemListElement: list.map((r, i) => ({ "@type": "ListItem", position: i + 1, url: r.url, name: `${r.name} menu` })),
  };

  return (
    <div className={`mk min-h-screen ${marketingFonts}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-14 md:pt-20">
        <p className="text-sm font-medium text-[var(--coral-ink)]">Menus</p>
        <h1 className="font-display mt-3 text-5xl font-medium leading-[1.05] md:text-6xl">Restaurant menus in Kigali</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--ink-2)]">
          Every restaurant, café and bar on ScanDish, with its full menu, prices in RWF and photos. Open a menu to see what&apos;s
          available today — and, where the restaurant takes orders, order from your table.
        </p>

        {list.length === 0 ? (
          <p className="mt-12 text-[var(--muted)]">Menus will appear here soon.</p>
        ) : (
          <ul className="mt-12 grid gap-4 sm:grid-cols-2">
            {list.map((r) => {
              const place = placeOf(r.location);
              return (
                <li key={r.url} className="rounded-2xl border border-[var(--line)] bg-white p-5">
                  <div className="flex items-start gap-4">
                    {r.logo ? (
                      <img src={r.logo} alt={`${r.name} logo`} width={56} height={56} loading="lazy" className="h-14 w-14 shrink-0 rounded-xl border border-[var(--line)] object-cover" />
                    ) : (
                      <span className="font-display flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--paper-2)] text-2xl">{r.name.charAt(0)}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold leading-snug">
                        <a href={r.url} className="hover:text-[var(--coral-ink)]">
                          {r.name} menu
                        </a>
                      </h2>
                      {(place || r.location) && (
                        <p className="mt-0.5 flex items-center gap-1 text-sm text-[var(--muted)]">
                          <MapPin className="h-3.5 w-3.5 shrink-0" /> {r.location || place}
                        </p>
                      )}
                    </div>
                  </div>
                  {(r.topics.length > 0 || r.categories.length > 0) && (
                    <p className="mt-3 text-sm text-[var(--ink-2)]">
                      {(r.topics.length ? r.topics : r.categories.map(label)).slice(0, 6).join(" · ")}
                      {r.dishes ? ` — ${r.dishes} dishes` : ""}
                    </p>
                  )}
                  <a href={r.url} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--ink)] underline decoration-[var(--line)] underline-offset-4 hover:decoration-[var(--coral)]">
                    See the {r.name} menu and prices <ArrowUpRight className="h-4 w-4" />
                  </a>
                </li>
              );
            })}
          </ul>
        )}

        {groups.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-3xl font-medium">Menus by dish</h2>
            <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2 md:grid-cols-3">
              {groups.map(([category, rs]) => (
                <div key={category}>
                  <h3 className="font-semibold">{category} menus in Kigali</h3>
                  <ul className="mt-2 space-y-1 text-[var(--ink-2)]">
                    {rs.map((r) => (
                      <li key={r.url}>
                        <a href={r.url} className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--ink)]">
                          {r.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
