import { facebookUrl, instagramUrl, optimizeImage, tiktokUrl, websiteUrl } from "@/lib/links";
import type { PublicRestaurant } from "@/lib/types";

/** "6,000 RWF" → "6000"; anything that isn't a clear amount is left out. */
function amount(price: string): string | null {
  const digits = price.replace(/[\s,]/g, "").match(/^\D*(\d+(?:\.\d+)?)\D*$/);
  return digits ? digits[1] : null;
}

/** Absolute URL for Google (relative paths from the bundled sample images are dropped). */
const absolute = (url: string, width: number) => (/^https:\/\//.test(url) ? optimizeImage(url, width) : undefined);

/** schema.org Restaurant data so search engines understand the page (name, address, phone, menu). */
export default function RestaurantJsonLd({ restaurant: r, url }: { restaurant: PublicRestaurant; url: string }) {
  const sameAs = [websiteUrl(r.website), instagramUrl(r.social.instagram), facebookUrl(r.social.facebook), tiktokUrl(r.social.tiktok)].filter(Boolean);
  const images = [r.coverImage, ...r.gallery].map((i) => absolute(i, 1200)).filter(Boolean).slice(0, 6);

  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: r.name,
    url,
    ...(r.description || r.about ? { description: r.description || r.about.slice(0, 300) } : {}),
    ...(images.length ? { image: images } : {}),
    ...(absolute(r.logo, 400) ? { logo: absolute(r.logo, 400) } : {}),
    ...(r.phone ? { telephone: r.phone } : {}),
    ...(r.location ? { address: { "@type": "PostalAddress", streetAddress: r.location, addressCountry: "RW" } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(r.menu.some((c) => c.items.length)
      ? {
          hasMenu: {
            "@type": "Menu",
            hasMenuSection: r.menu
              .filter((c) => c.items.length)
              .map((c) => ({
                "@type": "MenuSection",
                name: c.category,
                hasMenuItem: c.items.map((i) => {
                  const price = amount(i.price);
                  return {
                    "@type": "MenuItem",
                    name: i.name,
                    ...(i.description ? { description: i.description } : {}),
                    ...(absolute(i.image, 800) ? { image: absolute(i.image, 800) } : {}),
                    ...(price ? { offers: { "@type": "Offer", price, priceCurrency: "RWF" } } : {}),
                  };
                }),
              })),
          },
        }
      : {}),
  };

  // "<" is escaped so menu text can never close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
