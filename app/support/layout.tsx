import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Support Team", template: "%s | ScanDish Support Team" },
  robots: { index: false },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
