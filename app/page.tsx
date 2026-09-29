import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";
import { BRAND } from "@/lib/brand";
import { SUMMARY, faqs, type FactsInput } from "@/lib/scandish-facts";
import { getCompanyLeader, getContact, getPricing } from "@/lib/server/settings";
import { getShowcase } from "@/lib/server/showcase";

export const metadata: Metadata = {
  title: { absolute: "ScanDish — QR menus for restaurants in Rwanda" },
  description: SUMMARY,
  alternates: { canonical: "/" },
};

// Prices (MasterAdmin → Settings) and the customer row refresh when they change; hourly otherwise.
export const revalidate = 3600;

export default async function HomePage() {
  const [pricing, leader, showcase, contact] = await Promise.all([getPricing(), getCompanyLeader(), getShowcase(), getContact()]);
  const facts: FactsInput = { pricing, leader, liveCount: showcase.liveCount, contact };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ScanDish",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: BRAND.url,
    creator: { "@type": "Organization", name: BRAND.company, url: BRAND.companyUrl },
    logo: `${BRAND.url}/images/logo.jpg`,
    description: SUMMARY,
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
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs(facts).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />
      <LandingPage facts={facts} restaurants={showcase.restaurants} exampleUrl={showcase.exampleUrl} />
    </>
  );
}
