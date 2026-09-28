import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";
import { getPricing } from "@/lib/server/settings";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Prices come from MasterAdmin → Settings; saving there refreshes this page immediately.
export const revalidate = 3600;

export default async function HomePage() {
  const pricing = await getPricing();

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ScanDish",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://scandish.online",
    creator: { "@type": "Organization", name: "Ironic Lab Inc.", url: "https://ironiclab.site" },
    logo: "https://scandish.online/images/logo.jpg",
    description:
      "ScanDish helps restaurants create smart QR-powered digital menu pages with menu management, gallery, offers, contact links, and map directions.",
    offers: (["standard", "premium"] as const).flatMap((plan) => {
      const label = plan === "standard" ? "Standard" : "Premium";
      const p = pricing[plan];
      return [
        { "@type": "Offer", name: `${label} – One-time Setup`, price: String(p.setupFee), priceCurrency: "RWF" },
        { "@type": "Offer", name: `${label} – 6 Months`, price: String(p.sixMonths), priceCurrency: "RWF" },
        { "@type": "Offer", name: `${label} – 1 Year`, price: String(p.year), priceCurrency: "RWF" },
      ];
    }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <LandingPage pricing={pricing} />
    </>
  );
}
