// Dev helper: renders the default contract template with sample data to a local PDF (no database, no auth).
// Usage: npx tsx --conditions=react-server scripts/render-sample-contract.ts <out.pdf> [image.png|jpg]
import { readFileSync, writeFileSync } from "node:fs";
import { buildContractPdf } from "../lib/server/contract-pdf";
import { DEFAULT_CONTRACT, DEFAULT_PRICING } from "../lib/settings";

const values: Record<string, string> = {
  contract_number: "SD-2026-AB12CD",
  date: "28 September 2026",
  business_name: "Sample Restaurant Ltd",
  business_type: "Restaurant",
  manager_name: "Jane Uwase",
  manager_email: "manager@example.rw",
  manager_phone: "0788 000 000",
  location: "KN 4 Ave, Kigali",
  plan: "Premium",
  setup_fee: `${DEFAULT_PRICING.premium.setupFee.toLocaleString("en-US")} RWF`,
  price_6_months: `${DEFAULT_PRICING.premium.sixMonths.toLocaleString("en-US")} RWF`,
  price_1_year: `${DEFAULT_PRICING.premium.year.toLocaleString("en-US")} RWF`,
  trial_days: String(DEFAULT_PRICING.trialDays),
  page_url: "scandish.online/r/sample-restaurant",
  support_member: "Support Member Name",
  company: "Ironic Lab Inc.",
};
const fill = (t: string) => t.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (m, k: string) => values[k] ?? m);

async function main() {
const pdf = await buildContractPdf({
  title: DEFAULT_CONTRACT.title,
  contractNumber: values.contract_number,
  date: values.date,
  body: fill(DEFAULT_CONTRACT.body),
  company: { name: "Ironic Lab Inc.", url: "scandish.online", email: "support@scandish.online", phone: "+250781822350" },
  business: {
    name: values.business_name,
    type: values.business_type,
    manager: values.manager_name,
    email: values.manager_email,
    phone: values.manager_phone,
    location: values.location,
  },
  fees: { plan: values.plan, setupFee: values.setup_fee, sixMonths: values.price_6_months, year: values.price_1_year },
  signatory: { name: "Director Name", title: "Managing Director" },
  // Optional 3rd argument: an image used as both signature and stamp, to check placement.
  signature: process.argv[3] ? new Uint8Array(readFileSync(process.argv[3])) : null,
  stamp: process.argv[3] ? new Uint8Array(readFileSync(process.argv[3])) : null,
});
writeFileSync(process.argv[2] ?? "sample-contract.pdf", pdf);
console.log(`wrote ${pdf.length} bytes`);
}

main();
