"use client";

import { useEffect } from "react";

/** Kigali calendar day, matching the server's buckets. */
const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kigali", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

/**
 * Sends one anonymous view per page load. No cookies and no personal data:
 * "unique" is a per-device, per-day flag kept in localStorage.
 */
export default function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromQr = url.searchParams.get("s") === "qr";
    const source = fromQr ? "qr" : document.referrer ? "link" : "direct";

    // Keep QR tags out of links people copy and share from this page.
    if (fromQr) {
      url.searchParams.delete("s");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }

    let unique = true;
    try {
      const key = `sd:seen:${slug}`;
      unique = localStorage.getItem(key) !== today();
      localStorage.setItem(key, today());
    } catch {
      // Private mode / blocked storage: count as unique.
    }

    const payload = JSON.stringify({ slug, source, unique });
    const sent = navigator.sendBeacon?.("/api/track", new Blob([payload], { type: "application/json" }));
    if (!sent) {
      fetch("/api/track", { method: "POST", body: payload, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    }
  }, [slug]);

  return null;
}
