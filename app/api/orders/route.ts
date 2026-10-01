import { NextResponse } from "next/server";
import { OrderClosedError, placeOrder } from "@/lib/server/orders";
import { ValidationError } from "@/lib/server/validate";
import { deviceFromUserAgent } from "@/lib/server/request";

// Per-instance limit: a device can send a few orders in a short time (a table ordering in rounds), not a flood.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 6;
const recent = new Map<string, number[]>();

function limited(key: string): boolean {
  const now = Date.now();
  if (recent.size > 5000) {
    for (const [k, times] of recent) if (times.every((t) => now - t > WINDOW_MS)) recent.delete(k);
  }
  const times = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (times.length >= MAX_PER_WINDOW) return true;
  times.push(now);
  recent.set(key, times);
  return false;
}

/** A guest sends an order from a Premium menu page. No account needed. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  // Hidden form field only bots fill in.
  if (body.website) return NextResponse.json({ error: "Invalid order" }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const ua = req.headers.get("user-agent") ?? "";
  if (limited(`${ip}|${ua}|${String(body.slug ?? "")}`)) {
    return NextResponse.json({ error: "You've sent several orders just now. Please wait a few minutes or ask a waiter." }, { status: 429 });
  }

  try {
    const order = await placeOrder(body, { device: deviceFromUserAgent(ua) });
    // The total comes from the server (menu prices), so the payment screen shows the real amount.
    return NextResponse.json({ number: order.number, total: order.total, currency: order.currency, hasUnpriced: order.hasUnpriced });
  } catch (err) {
    if (err instanceof OrderClosedError) return NextResponse.json({ error: err.message, closed: true }, { status: 409 });
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("order failed", err);
    return NextResponse.json({ error: "Your order could not be sent. Please try again or ask a waiter." }, { status: 500 });
  }
}
