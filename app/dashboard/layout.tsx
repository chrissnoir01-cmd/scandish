import type { Metadata, Viewport } from "next";

// Only the business dashboard is installable as an app ("ScanDish Business").
export const metadata: Metadata = {
  title: "Dashboard · ScanDish",
  manifest: "/dashboard.webmanifest",
  appleWebApp: { capable: true, title: "ScanDish", statusBarStyle: "default" },
  icons: { apple: "/app/icon-192.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f08c6c",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
