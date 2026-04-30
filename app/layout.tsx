import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://scandish.online"),
  title: {
    default: "ScanDish | Smart QR Scan Experience",
    template: "%s | ScanDish",
  },
  description:
    "ScanDish helps restaurants create smart QR-powered digital menus. Customers scan and instantly view menus, gallery, offers, and contact info.",
  keywords: [
    "QR menu",
    "restaurant menu Rwanda",
    "digital menu",
    "ScanDish",
    "restaurant QR system",
  ],
  openGraph: {
    title: "ScanDish",
    description: "Smart QR menus for modern restaurants.",
    url: "https://scandish.online",
    siteName: "ScanDish",
    images: [{ url: "/images/hero.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScanDish",
    description: "Create QR menus for your restaurant instantly.",
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
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}