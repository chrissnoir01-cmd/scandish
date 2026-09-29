import type { Metadata } from "next";
import { SlugPage, slugMetadata, slugStaticParams } from "@/components/public/SlugPage";

// Prebuilt and served from the CDN; the hourly refresh picks up subscription changes.
export const revalidate = 3600;
export const generateStaticParams = slugStaticParams;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return slugMetadata((await params).slug);
}

export default async function RestaurantPage({ params }: Props) {
  return <SlugPage slug={(await params).slug} fromQr={false} />;
}
