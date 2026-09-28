import "server-only";
import { BRAND, formatRwf } from "../brand";
import { CONTRACT_PLACEHOLDERS, type ContractTemplate, type Pricing } from "../settings";
import { fetchPrivatePng } from "./cloudinary";
import { buildContractPdf } from "./contract-pdf";

type Doc = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : "");

export const contractNumber = (companyId: string, createdAt: string) =>
  `SD-${(createdAt || new Date().toISOString()).slice(0, 4)}-${companyId.slice(0, 6).toUpperCase()}`;

/** Builds the service contract PDF for one company from the current template. */
export async function renderContract(opts: {
  companyId: string;
  company: Doc;
  slug: string;
  template: ContractTemplate;
  pricing: Pricing;
}): Promise<{ pdf: Uint8Array; number: string }> {
  const { companyId, company, slug, template, pricing } = opts;
  const plan = company.plan === "premium" ? "premium" : "standard";
  const planLabel = plan === "premium" ? "Premium" : "Standard";
  // The setup fee is fixed when the business was created; subscriptions follow current pricing.
  const setupFee = typeof company.setupFee === "number" ? company.setupFee : pricing[plan].setupFee;
  const number = contractNumber(companyId, s(company.createdAt));
  const date = new Date().toLocaleDateString("en-GB", { timeZone: "Africa/Kigali", day: "numeric", month: "long", year: "numeric" });

  const values: Record<string, string> = {
    contract_number: number,
    date,
    business_name: s(company.companyName),
    business_type: s(company.businessType) || "Restaurant",
    manager_name: s(company.managerName),
    manager_email: s(company.email),
    manager_phone: s(company.phone),
    location: s(company.location) || "-",
    plan: planLabel,
    setup_fee: formatRwf(setupFee),
    price_6_months: formatRwf(pricing[plan].sixMonths),
    price_1_year: formatRwf(pricing[plan].year),
    trial_days: String(pricing.trialDays),
    page_url: `${BRAND.url.replace(/^https?:\/\//, "")}/r/${slug}`,
    support_member: s(company.createdByAgentName) || "-",
    company: BRAND.company,
  };
  const known = new Set(CONTRACT_PLACEHOLDERS.map((p) => p.key));
  const fill = (t: string) => t.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (m, k: string) => (known.has(k) ? values[k] : m));

  const [signature, stamp] = await Promise.all([fetchPrivatePng(template.signatureId), fetchPrivatePng(template.stampId)]);

  const pdf = await buildContractPdf({
    title: fill(template.title),
    contractNumber: number,
    date,
    body: fill(template.body),
    company: { name: BRAND.company, url: BRAND.url.replace(/^https?:\/\//, ""), email: BRAND.supportEmail, phone: BRAND.supportPhone },
    business: {
      name: values.business_name,
      type: values.business_type,
      manager: values.manager_name,
      email: values.manager_email,
      phone: values.manager_phone,
      location: values.location,
    },
    fees: { plan: planLabel, setupFee: values.setup_fee, sixMonths: values.price_6_months, year: values.price_1_year },
    signatory: { name: template.signatoryName, title: template.signatoryTitle },
    signature,
    stamp,
  });
  return { pdf, number };
}
