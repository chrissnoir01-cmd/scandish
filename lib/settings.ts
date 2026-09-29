import type { Plan } from "./types";

/* ---------- Pricing (editable in MasterAdmin → Settings) ---------- */

export interface PlanPricing {
  /** One-time setup fee, RWF. */
  setupFee: number;
  /** Subscription, RWF. */
  sixMonths: number;
  year: number;
  /** % of the setup fee kept by the support member who onboards the business (0–100). */
  agentSharePct: number;
}

export interface Pricing {
  standard: PlanPricing;
  premium: PlanPricing;
  /** Days a support-created business stays live before MasterAdmin confirms its subscription. */
  trialDays: number;
  updatedAt: string;
}

export const DEFAULT_PRICING: Pricing = {
  standard: { setupFee: 20000, sixMonths: 72000, year: 144000, agentSharePct: 100 },
  // 25,000 of 80,000 RWF
  premium: { setupFee: 80000, sixMonths: 90000, year: 180000, agentSharePct: 31.25 },
  trialDays: 5,
  updatedAt: "",
};

/** RWF the support member keeps for onboarding a business on `plan`. */
export function agentEarning(pricing: Pricing, plan: Plan): number {
  const p = pricing[plan];
  return Math.round((p.setupFee * p.agentSharePct) / 100);
}

/* ---------- Contact details (editable in MasterAdmin → Settings) ---------- */

/** How customers and owners reach ScanDish; shown across the whole app. */
export interface ContactInfo {
  /** Phone number as displayed and dialled, e.g. "+250781822350". */
  phone: string;
  /** WhatsApp number in international digits only, e.g. "250781822350". */
  whatsapp: string;
  email: string;
  updatedAt: string;
}

export const DEFAULT_CONTACT: ContactInfo = {
  phone: "+250781822350",
  whatsapp: "250781822350",
  email: "support@scandish.online",
  updatedAt: "",
};

export const contactWhatsAppUrl = (c: ContactInfo, text?: string) =>
  `https://wa.me/${c.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
export const contactTelUrl = (c: ContactInfo) => `tel:${c.phone.replace(/[^\d+]/g, "")}`;

/** Local Rwandan numbers (07…) become international (2507…); everything else keeps its digits. */
export const normalizeWhatsApp = (v: string) => {
  const d = v.replace(/\D/g, "");
  return /^0\d{9}$/.test(d) ? `250${d.slice(1)}` : d;
};

/* ---------- Service contract template ---------- */

export interface ContractTemplate {
  title: string;
  /** Plain text. Blank lines separate paragraphs; lines starting with "## " are headings. Supports {{placeholders}}. */
  body: string;
  signatoryName: string;
  signatoryTitle: string;
  /** Private Cloudinary public ids ("" = none). Never exposed to browsers except inside generated PDFs. */
  stampId: string;
  signatureId: string;
  updatedAt: string;
}

export const CONTRACT_PLACEHOLDERS: { key: string; label: string }[] = [
  { key: "contract_number", label: "Contract number" },
  { key: "date", label: "Date generated" },
  { key: "business_name", label: "Business name" },
  { key: "business_type", label: "Business type" },
  { key: "registration_number", label: "RDB registration number" },
  { key: "manager_name", label: "Manager name" },
  { key: "manager_email", label: "Manager email" },
  { key: "manager_phone", label: "Manager phone" },
  { key: "location", label: "Business location" },
  { key: "plan", label: "Plan (Standard / Premium)" },
  { key: "setup_fee", label: "Setup fee" },
  { key: "price_6_months", label: "6-month subscription" },
  { key: "price_1_year", label: "1-year subscription" },
  { key: "trial_days", label: "Setup period (days)" },
  { key: "page_url", label: "Public page URL" },
  { key: "support_member", label: "Support member name" },
  { key: "company", label: "Ironic Lab Inc." },
];

export const DEFAULT_CONTRACT: ContractTemplate = {
  title: "ScanDish Service Agreement",
  signatoryName: "",
  signatoryTitle: "Managing Director",
  stampId: "",
  signatureId: "",
  updatedAt: "",
  body: `This Service Agreement (No. {{contract_number}}) is made on {{date}} between {{company}}, the owner and operator of ScanDish ("the Provider"), and {{business_name}}, a {{business_type}} located at {{location}}, represented by {{manager_name}} ("the Client").

## 1. Service
The Provider gives the Client a ScanDish digital menu page at {{page_url}}, reachable by QR code and link, together with a dashboard to manage the menu, photos, offers, contact details and branding, a downloadable QR code, and anonymous visit statistics.

## 2. Plan and fees
The Client subscribes to the {{plan}} plan. The one-time setup fee is {{setup_fee}}, paid to the ScanDish Support Team member who onboards the Client. The subscription is {{price_6_months}} for 6 months or {{price_1_year}} for 1 year, paid in advance to {{company}} through ScanDish's official payment channels only.

## 3. Setup period and activation
The Client's page is live for a setup period of {{trial_days}} days from account creation so the Client can review it. The page stays online after that period only once the Provider confirms payment of the subscription.

## 4. Renewal and grace period
The Client renews the subscription before its end date. If it is not renewed, the page stays online for 10 days after the end date and is then taken offline until renewal. The Client's content is kept so the page can be restored.

## 5. Client content and responsibilities
The Client owns the content it publishes and is responsible for its accuracy, including prices and allergen information, and for having the right to use all photos and logos. The Client keeps its login password private.

## 6. Data protection
The Provider processes data as described in the ScanDish Privacy Policy (scandish.online/privacy). Menu visitors remain anonymous.

## 7. Terms of Service
This Agreement incorporates the ScanDish Terms of Service (scandish.online/terms), which the Client has read and accepts. If they conflict, this Agreement prevails for the matters it covers.

## 8. Term and termination
This Agreement starts on the date above and continues while the subscription is active. Either party may end it with written notice; fees already paid are non-refundable except where the law requires otherwise.

## 9. Governing law
This Agreement is governed by the laws of the Republic of Rwanda. Disputes that cannot be settled amicably go to the competent courts of Kigali.

Onboarded by ScanDish Support Team member: {{support_member}}.`,
};
