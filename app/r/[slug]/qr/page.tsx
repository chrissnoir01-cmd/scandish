import type { Metadata } from "next";
import { SlugPage, slugMetadata, slugStaticParams } from "@/components/public/SlugPage";

/**
 * QR-scan twin of /r/<slug>: proxy.ts rewrites /r/<slug>?s=qr here (the address bar is unchanged),
 * so the prebuilt page can still forward the QR tag to a Premium subdomain.
 */
export const revalidate = 3600;
export const generateStaticParams = slugStaticParams;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return slugMetadata((await params).slug);
}

export default async function RestaurantQrPage({ params }: Props) {
  return <SlugPage slug={(await params).slug} fromQr />;
}
