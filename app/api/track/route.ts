import { recordView, type ViewSource } from "@/lib/server/analytics";
import { deviceFromUserAgent } from "@/lib/server/request";

const SLUG = /^[a-z0-9-]{1,80}$/;
const SOURCES: ViewSource[] = ["qr", "direct", "link"];
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|pingdom|monitor/i;

// Per-instance throttle so one device can't inflate counts by reloading.
const recent = new Map<string, number>();
const THROTTLE_MS = 30_000;

function throttled(key: string): boolean {
  const now = Date.now();
  if (recent.size > 5000) {
    for (const [k, t] of recent) if (now - t > THROTTLE_MS) recent.delete(k);
  }
  const last = recent.get(key);
  recent.set(key, now);
  return last !== undefined && now - last < THROTTLE_MS;
}

/** Anonymous page-view beacon from the public restaurant page. Always answers 204. */
export async function POST(req: Request) {
  const done = new Response(null, { status: 204 });
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (!ua || BOT.test(ua)) return done;

    const body = await req.json().catch(() => null);
    const slug = typeof body?.slug === "string" ? body.slug : "";
    if (!SLUG.test(slug)) return done;
    const source: ViewSource = SOURCES.includes(body?.source) ? body.source : "direct";

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    if (throttled(`${ip}|${ua}|${slug}`)) return done;

    await recordView(slug, { source, unique: body?.unique === true, device: deviceFromUserAgent(ua) });
  } catch (err) {
    console.error("track failed", err);
  }
  return done;
}
