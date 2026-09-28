import { permanentRedirect } from "next/navigation";

// Premium pages are now served at /r/[slug]; keep old links and QR codes working.
export default async function PremiumRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/r/${slug}`);
}
