import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://scandish.online"),
  title: {
    default: "ScanDish | Smart QR Menu Platform for Restaurants",
    template: "%s | ScanDish",
  },
  description:
    "ScanDish helps restaurants create smart QR-powered digital menu pages with menus, gallery, offers, contact links, and map directions.",
   verification: {
    google: "gVcvzc5JfbugE90yOxurJzR-FqzM5cUlYDFrZCmfLeo",
  },  
  keywords: [
    "ScanDish",
    "QR menu",
    "restaurant menu Rwanda",
    "digital menu",
    "restaurant QR system",
    "smart QR menu",
    "restaurant SaaS Rwanda",
  ],
  openGraph: {
    title: "ScanDish | Smart QR Menu Platform",
    description:
      "Smart QR menu pages for modern restaurants. Customers scan and instantly view menus, gallery, offers, and contact info.",
    url: "https://scandish.online",
    siteName: "ScanDish",
    images: [
      {
        url: "/images/hero.png",
        width: 1200,
        height: 630,
        alt: "ScanDish Smart QR Menu Platform",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScanDish | Smart QR Menu Platform",
    description: "Create smart QR menu pages for your restaurant.",
    images: ["/images/hero.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://scandish.online/#organization",
    name: "ScanDish",
    url: "https://scandish.online",
    logo: "https://scandish.online/images/logo.jpg",
    description:
      "ScanDish is a smart QR menu platform for restaurants in Africa.",
    email: "support@scandish.online",
    telephone: "+250781822350",
    foundingLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Kigali",
        addressCountry: "RW",
      },
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+250781822350",
        contactType: "customer support",
        email: "support@scandish.online",
        areaServed: "RW",
        availableLanguage: ["English", "French", "Kinyarwanda"],
      },
    ],
    sameAs: [
      "https://instagram.com/scandish_app",
      "https://tiktok.com/@scandish_app",
      "https://facebook.com/scandish_app",
      "https://x.com/scandish_app",
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://scandish.online/#website",
    name: "ScanDish",
    url: "https://scandish.online",
    publisher: {
      "@id": "https://scandish.online/#organization",
    },
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ScanDish",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://scandish.online",
    logo: "https://scandish.online/images/logo.jpg",
    description:
      "ScanDish helps restaurants create smart QR-powered digital menu pages with menu management, gallery, offers, contact links, and map directions.",
    offers: [
      {
        "@type": "Offer",
        name: "6 Months Plan",
        price: "35000",
        priceCurrency: "RWF",
      },
      {
        "@type": "Offer",
        name: "1 Year Plan",
        price: "60000",
        priceCurrency: "RWF",
      },
      {
        "@type": "Offer",
        name: "One-time Restaurant Setup",
        price: "15000",
        priceCurrency: "RWF",
      },
    ],
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareSchema),
          }}
        />

        {children}
      </body>
    </html>
  );
}