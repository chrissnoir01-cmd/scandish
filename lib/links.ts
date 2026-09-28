/** Owner-entered links may be full URLs or bare handles; these always return an https URL (or ""). */

const SAFE_URL = /^https?:\/\//i;

function external(value: string, base: string, clean: (v: string) => string): string {
  const v = value.trim();
  if (!v) return "";
  if (SAFE_URL.test(v)) return v;
  if (/^[a-z]+:/i.test(v)) return ""; // any other scheme (javascript:, data:, …)
  return `${base}${clean(v)}`;
}

export const websiteUrl = (v: string) => external(v, "https://", (x) => x.replace(/^\/+/, ""));
export const instagramUrl = (v: string) => external(v, "https://instagram.com/", (x) => x.replace(/^@/, ""));
export const facebookUrl = (v: string) => external(v, "https://facebook.com/", (x) => x);
export const tiktokUrl = (v: string) => external(v, "https://tiktok.com/", (x) => (x.startsWith("@") ? x : `@${x}`));

/** wa.me needs digits in international format; local Rwandan numbers (07…) get the 250 country code. */
export const whatsappUrl = (v: string) => {
  let digits = v.replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) digits = `250${digits.slice(1)}`;
  return digits ? `https://wa.me/${digits}` : "";
};

export const phoneUrl = (v: string) => {
  const clean = v.replace(/[^\d+]/g, "");
  return clean ? `tel:${clean}` : "";
};

export const mapEmbedUrl = (location: string) =>
  location ? `https://www.google.com/maps?q=${encodeURIComponent(location)}&output=embed` : "";

export const directionsUrl = (location: string) =>
  location ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}` : "";

/** Serves Cloudinary images resized and in modern formats; other URLs pass through. */
export function optimizeImage(url: string, width = 800): string {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}

export async function sharePage(title: string, text: string) {
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Page link copied");
    }
  } catch (err) {
    // The user closing the share sheet is not an error.
    if ((err as Error)?.name !== "AbortError") alert(`Copy this link: ${url}`);
  }
}
