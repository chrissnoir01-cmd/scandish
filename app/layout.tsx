import type { Metadata } from "next";
import "./globals.css";
import { ContactProvider } from "@/components/ContactProvider";
import { getContact } from "@/lib/server/settings";

export const metadata: Metadata = {
  metadataBase: new URL("https://scandish.online"),
  // Canonical URLs are set per page; a layout-level one would mark every page as a homepage duplicate.
  applicationName: "ScanDish",
  authors: [{ name: "Ironic Lab Inc.", url: "https://ironiclab.site" }],
  creator: "Ironic Lab Inc.",
  publisher: "Ironic Lab Inc.",
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const contact = await getContact();
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://scandish.online/#organization",
    name: "ScanDish",
    url: "https://scandish.online",
    logo: "https://scandish.online/images/logo.jpg",
    description:
      "ScanDish is a smart QR menu platform for restaurants in Africa, built and operated by Ironic Lab Inc.",
    parentOrganization: {
      "@type": "Organization",
      name: "Ironic Lab Inc.",
      url: "https://ironiclab.site",
    },
    email: contact.email,
    telephone: contact.phone,
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
        telephone: contact.phone,
        contactType: "customer support",
        email: contact.email,
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

  // The SoftwareApplication schema (with live prices) is emitted by the homepage.
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

        <ContactProvider value={contact}>{children}</ContactProvider>
      </body>
    </html>
  );
}