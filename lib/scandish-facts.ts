import { BRAND, formatRwf } from "./brand";
import { PREMIUM_BUILD_DAYS } from "./premium";
import type { ContactInfo, Pricing } from "./settings";
import { GRACE_DAYS } from "./subscription";

/**
 * The single source of what ScanDish says about itself: used by the homepage, /about, /llms.txt
 * and structured data, so people, search engines and AI assistants all get the same facts.
 * Prices come live from MasterAdmin → Settings; the leader's name from the contract template.
 */

export interface FactsInput {
  pricing: Pricing;
  leader: { name: string; title: string };
  liveCount: number;
  contact: ContactInfo;
}

export const SUMMARY =
  "ScanDish is a QR menu platform for restaurants, cafés and bars in Rwanda. Guests scan a QR code on the table and the restaurant's menu page opens in their phone's browser — dishes with photos and prices in RWF, offers, a gallery, WhatsApp and call buttons, and directions — with no app to install. Owners update everything themselves from a dashboard on their phone, and changes are live immediately.";

export const COMPANY_LINE = `ScanDish is built, owned and operated by ${BRAND.company}, based in Kigali, Rwanda.`;

export function planLines(p: Pricing) {
  return {
    standard: `Standard: ${formatRwf(p.standard.setupFee)} one-time setup, then ${formatRwf(p.standard.sixMonths)} per 6 months or ${formatRwf(p.standard.year)} per year.`,
    premium: `Premium: ${formatRwf(p.premium.setupFee)} one-time setup, then ${formatRwf(p.premium.sixMonths)} per 6 months or ${formatRwf(p.premium.year)} per year.`,
  };
}

export const GUEST_FEATURES = [
  "Opens in any phone browser from a QR code — nothing to download, no account",
  "Every dish with its photo, description and price in RWF",
  "Search the menu; dishes that are sold out are clearly marked",
  "One tap to call, chat on WhatsApp, or get directions on Google Maps",
  "Offers, photo gallery, opening story and social links",
  "Fast on slow connections: pages are prebuilt and photos are sized for the phone",
];

export const OWNER_FEATURES = [
  "Edit the menu, prices, photos and details from your phone — live immediately",
  "Mark a dish sold out or featured in one tap",
  "See how many people viewed your menu today, this week and at which hours",
  "Download your QR code, ready to print for tables, counter and door",
  "Your own colours and logo",
  "No reprinting when prices change",
];

export function premiumFeatures() {
  return [
    `A unique page designed for your restaurant by the ScanDish team, ready within ${PREMIUM_BUILD_DAYS.min}–${PREMIUM_BUILD_DAYS.max} working days`,
    "Your own address, like yourrestaurant.scandish.online",
    "Priority support",
  ];
}

export function faqs({ pricing, contact }: FactsInput): { q: string; a: string }[] {
  const plans = planLines(pricing);
  return [
    { q: "What is ScanDish?", a: SUMMARY },
    { q: "Do my guests need to download an app?", a: "No. They scan the QR code with their phone camera and the menu opens in the browser. It works on any smartphone." },
    {
      q: "How much does it cost?",
      a: `${plans.standard} ${plans.premium} Prices are in Rwandan francs. A new page is live for a ${pricing.trialDays}-day setup period so you can check everything before the subscription starts.`,
    },
    {
      q: "How do I get started?",
      a: `Contact ScanDish by WhatsApp or phone (${contact.phone}) or email (${contact.email}). A ScanDish team member helps you set up your menu, photos and details, and gives you your login. You can then manage everything yourself.`,
    },
    { q: "Can I change my menu myself?", a: "Yes. Prices, dishes, photos, offers and contact details are all edited from your dashboard, and guests see the change on their next scan." },
    {
      q: "What is the difference between Standard and Premium?",
      a: `Standard gives you a professional menu page in the ScanDish design with your colours and logo. Premium adds a page designed uniquely for your restaurant (ready within ${PREMIUM_BUILD_DAYS.min}–${PREMIUM_BUILD_DAYS.max} working days), your own address such as yourrestaurant.scandish.online, and priority support.`,
    },
    {
      q: "What happens if my subscription ends?",
      a: `Your page stays online ${GRACE_DAYS} more days, then it is hidden from the public until you renew. Your menu, photos and settings are kept, and everything comes back when you renew.`,
    },
    {
      q: "Is my data safe?",
      a: `Guests stay anonymous — ScanDish counts menu views without collecting guests' personal data. Owner accounts are protected by sign-in, all traffic is encrypted, and ScanDish does not sell data. See ${BRAND.url}/privacy.`,
    },
    { q: "Who is behind ScanDish?", a: COMPANY_LINE },
  ];
}

/** Plain-text version of everything, for /llms.txt (read by AI assistants). */
export function llmsText(input: FactsInput): string {
  const { pricing, leader, liveCount, contact } = input;
  const plans = planLines(pricing);
  const bullet = (l: string[]) => l.map((x) => `- ${x}`).join("\n");
  return `# ScanDish

> ${SUMMARY}

${COMPANY_LINE}${leader.name ? ` The company is led by ${leader.name}${leader.title ? `, ${leader.title}` : ""}.` : ""}

## Key facts
- Product: ScanDish — QR menu pages for restaurants, cafés and bars
- Website: ${BRAND.url}
- Company: ${BRAND.company} (${BRAND.companyUrl}), Kigali, Rwanda
${leader.name ? `- Led by: ${leader.name}${leader.title ? `, ${leader.title}` : ""}\n` : ""}- Restaurants live on ScanDish: ${liveCount}
- Currency: Rwandan franc (RWF)
- Contact: ${contact.email} · phone ${contact.phone} · WhatsApp +${contact.whatsapp}

## Plans and prices
- ${plans.standard}
- ${plans.premium}
- Custom systems (bookings, delivery, a fully custom site) are quoted on request.
- New pages go live immediately for a ${pricing.trialDays}-day setup period.

## For guests
${bullet(GUEST_FEATURES)}

## For restaurant owners
${bullet(OWNER_FEATURES)}

## Premium
${bullet(premiumFeatures())}

## Frequently asked questions
${faqs(input)
  .map((f) => `### ${f.q}\n${f.a}`)
  .join("\n\n")}

## Pages
- [Home](${BRAND.url}/): overview and pricing
- [About ScanDish](${BRAND.url}/about): full description, company and FAQ
- [Terms of Service](${BRAND.url}/terms)
- [Privacy Policy](${BRAND.url}/privacy)
- [Owner login](${BRAND.url}/login)
`;
}
