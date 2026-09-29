import { llmsText } from "@/lib/scandish-facts";
import { getCompanyLeader, getContact, getPricing } from "@/lib/server/settings";
import { getShowcase } from "@/lib/server/showcase";

/**
 * /llms.txt — a plain-text description of ScanDish for AI assistants and crawlers (llmstxt.org).
 * Same facts as /about, with live prices; refreshed hourly and when prices or the contract change.
 */
export const revalidate = 3600;

export async function GET() {
  const [pricing, leader, showcase, contact] = await Promise.all([getPricing(), getCompanyLeader(), getShowcase(), getContact()]);
  return new Response(llmsText({ pricing, leader, liveCount: showcase.liveCount, contact }), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
