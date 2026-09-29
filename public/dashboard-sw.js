// Service worker for the installable business dashboard (registered by /dashboard with scope "/dashboard").
// It stores nothing: the dashboard always loads fresh from the network. When the connection is down,
// it shows a clear "You're offline" screen instead of the browser's error page.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const OFFLINE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · ScanDish</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fff8f5;
font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2937;text-align:center;padding:24px}
.c{max-width:360px}h1{font-size:22px;margin:16px 0 8px}p{color:#6b7280;line-height:1.5}
button{margin-top:20px;border:0;border-radius:14px;background:#f08c6c;color:#fff;font-weight:700;font-size:15px;padding:12px 22px;cursor:pointer}</style>
</head><body><div class="c"><div style="font-size:48px">📶</div>
<h1>You're offline</h1><p>ScanDish needs an internet connection. Check the Wi-Fi or mobile data — this page reloads by itself when the connection is back.</p>
<button onclick="location.reload()">Try again</button></div>
<script>addEventListener("online",()=>location.reload())</script></body></html>`;

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_PAGE, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } })
    )
  );
});
