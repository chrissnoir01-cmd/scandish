import { preconnect, preload } from "react-dom";
import StandardTemplate from "@/components/public/StandardTemplate";
import CamelliaTemplate from "@/components/premium/CamelliaTemplate";
import SampleTemplate from "@/components/premium/SampleTemplate";
import FreshyTemplate from "@/components/premium/FreshyTemplate";
import StudioTemplate from "@/components/studio/StudioTemplate";
import RestaurantJsonLd from "@/components/public/RestaurantJsonLd";
import ViewTracker from "@/components/public/ViewTracker";
import { OrderProvider } from "@/components/order/OrderProvider";
import { SPLIT_COVER_SIZES, contrastRatio } from "@/lib/design";
import { responsiveImage } from "@/lib/links";
import type { PublicRestaurant } from "@/lib/types";

/** A restaurant's public page, whether served at /r/<slug> or on its subdomain. */
export default function RestaurantView({ restaurant, url }: { restaurant: PublicRestaurant; url: string }) {
  // Open the image server connection and start the cover download while the page is still arriving,
  // so the first photo shows immediately. Must match what the template renders (see coverFor).
  preconnect("https://res.cloudinary.com");
  if (premiumTemplate(restaurant) === "studio" && restaurant.design) {
    preconnect("https://fonts.googleapis.com");
    preconnect("https://fonts.gstatic.com", { crossOrigin: "anonymous" });
  }
  const cover = coverFor(restaurant);
  if (cover) preload(cover.src, { as: "image", fetchPriority: "high", imageSrcSet: cover.srcSet, imageSizes: cover.sizes });

  return (
    <>
      <RestaurantJsonLd restaurant={restaurant} url={url} />
      <ViewTracker slug={restaurant.slug} />
      <OrderProvider restaurant={restaurant} {...orderColors(restaurant)}>
        <Template restaurant={restaurant} />
      </OrderProvider>
    </>
  );
}

const premiumTemplate = (r: PublicRestaurant) => (r.plan === "premium" && r.premiumEnabled ? r.premiumTemplate : "default");

/** The cover image the chosen template shows at the top of the page, exactly as it requests it. */
function coverFor(r: PublicRestaurant) {
  switch (premiumTemplate(r)) {
    case "camellia":
    case "sample":
    case "freshy":
      return responsiveImage(r.coverImage || "/images/hero.png");
    case "studio":
      if (r.design) {
        if (r.design.hero.variant === "minimal" || !r.coverImage) return null;
        return responsiveImage(r.coverImage, r.design.hero.variant === "split" ? SPLIT_COVER_SIZES : "100vw");
      }
  }
  return responsiveImage(r.coverImage || "/images/kigali-grill.png");
}

/** Order buttons wear each design's own accent colour. */
function orderColors(r: PublicRestaurant): { accent: string; accentText: string } {
  switch (premiumTemplate(r)) {
    case "camellia":
      return { accent: "#f08c6c", accentText: "#1a0f0b" };
    case "sample":
      return { accent: "#7f1d1d", accentText: "#ffffff" };
    case "freshy":
      return { accent: "#16a34a", accentText: "#ffffff" };
    case "studio":
      if (r.design) return { accent: r.design.colors.accent, accentText: r.design.colors.accentText };
  }
  // Owners pick any colour, so the text on it is white or near-black, whichever reads better.
  const accent = r.theme.primaryColor;
  return { accent, accentText: contrastRatio(accent, "#ffffff") >= 3 ? "#ffffff" : "#111111" };
}

function Template({ restaurant }: { restaurant: PublicRestaurant }) {
  switch (premiumTemplate(restaurant)) {
    case "camellia":
      return <CamelliaTemplate restaurant={restaurant} />;
    case "sample":
      return <SampleTemplate restaurant={restaurant} />;
    case "freshy":
      return <FreshyTemplate restaurant={restaurant} />;
    case "studio":
      // Built in MasterAdmin → Design Studio; Standard until a design is published.
      if (restaurant.design) return <StudioTemplate restaurant={restaurant} design={restaurant.design} />;
  }
  return <StandardTemplate restaurant={restaurant} />;
}
