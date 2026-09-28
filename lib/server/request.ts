import "server-only";
import { headers } from "next/headers";

export interface ClientInfo {
  ip: string;
  userAgent: string;
  device: "mobile" | "tablet" | "desktop";
}

export function deviceFromUserAgent(ua: string): ClientInfo["device"] {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

/** Caller's IP / user agent for the current request (server actions and route handlers). */
export async function clientInfo(): Promise<ClientInfo> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";
  const userAgent = (h.get("user-agent") ?? "").slice(0, 300);
  return { ip, userAgent, device: deviceFromUserAgent(userAgent) };
}
