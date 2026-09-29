import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { adminDb } from "./firebase-admin";
import {
  DEFAULT_CONTACT,
  DEFAULT_CONTRACT,
  DEFAULT_PRICING,
  type ContactInfo,
  type ContractTemplate,
  type PlanPricing,
  type Pricing,
} from "../settings";

const SETTINGS_TAG = "settings";
const doc = (id: "pricing" | "contract") => adminDb().collection("settings").doc(id);

function mergePlan(base: PlanPricing, d: unknown): PlanPricing {
  const x = (d ?? {}) as Record<string, unknown>;
  const num = (k: keyof PlanPricing) => (typeof x[k] === "number" && Number.isFinite(x[k]) ? (x[k] as number) : base[k]);
  return { setupFee: num("setupFee"), sixMonths: num("sixMonths"), year: num("year"), agentSharePct: num("agentSharePct") };
}

async function readPricing(): Promise<Pricing> {
  const d = (await doc("pricing").get()).data();
  if (!d) return DEFAULT_PRICING;
  return {
    standard: mergePlan(DEFAULT_PRICING.standard, d.standard),
    premium: mergePlan(DEFAULT_PRICING.premium, d.premium),
    trialDays: typeof d.trialDays === "number" ? d.trialDays : DEFAULT_PRICING.trialDays,
    updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : "",
  };
}

const cachedPricing = unstable_cache(readPricing, ["pricing"], { tags: [SETTINGS_TAG], revalidate: 3600 });

/** Current pricing. Falls back to defaults if the database is unreachable (e.g. at build time). */
export async function getPricing(): Promise<Pricing> {
  try {
    return await cachedPricing();
  } catch {
    return DEFAULT_PRICING;
  }
}

/** Uncached read for money-affecting decisions (creating a business, generating a contract). */
export async function getPricingFresh(): Promise<Pricing> {
  return readPricing();
}

export async function savePricing(p: Omit<Pricing, "updatedAt">): Promise<Pricing> {
  const saved: Pricing = { ...p, updatedAt: new Date().toISOString() };
  await doc("pricing").set(saved);
  revalidateTag(SETTINGS_TAG, { expire: 0 });
  return saved;
}

export async function getContractTemplate(): Promise<ContractTemplate> {
  const d = (await doc("contract").get()).data() as Partial<ContractTemplate> | undefined;
  return { ...DEFAULT_CONTRACT, ...(d ?? {}) };
}

export async function saveContractTemplate(t: Partial<ContractTemplate>): Promise<ContractTemplate> {
  const current = await getContractTemplate();
  const saved: ContractTemplate = { ...current, ...t, updatedAt: new Date().toISOString() };
  await doc("contract").set(saved);
  // The About page and llms.txt show the signatory as the company's leader.
  revalidateTag(SETTINGS_TAG, { expire: 0 });
  return saved;
}

/* ---------- Contact details ---------- */

async function readContact(): Promise<ContactInfo> {
  const d = (await adminDb().collection("settings").doc("contact").get()).data() as Partial<ContactInfo> | undefined;
  return { ...DEFAULT_CONTACT, ...(d ?? {}) };
}

const cachedContact = unstable_cache(readContact, ["contact"], { tags: [SETTINGS_TAG], revalidate: 3600 });

/** How to reach ScanDish (phone, WhatsApp, email). Falls back to defaults if the database is unreachable. */
export async function getContact(): Promise<ContactInfo> {
  try {
    return await cachedContact();
  } catch {
    return DEFAULT_CONTACT;
  }
}

export async function saveContact(c: Omit<ContactInfo, "updatedAt">): Promise<ContactInfo> {
  const saved: ContactInfo = { ...c, updatedAt: new Date().toISOString() };
  await adminDb().collection("settings").doc("contact").set(saved);
  // Every page shows these details (footer, legal pages, contact buttons), so refresh them all.
  revalidateTag(SETTINGS_TAG, { expire: 0 });
  return saved;
}

/** Who leads the company, as named on the service contract (MasterAdmin → Settings). Cached. */
const cachedLeader = unstable_cache(
  async () => {
    const t = await getContractTemplate();
    return { name: t.signatoryName, title: t.signatoryTitle };
  },
  ["leader"],
  { tags: [SETTINGS_TAG], revalidate: 3600 }
);

export async function getCompanyLeader(): Promise<{ name: string; title: string }> {
  try {
    return await cachedLeader();
  } catch {
    return { name: DEFAULT_CONTRACT.signatoryName, title: DEFAULT_CONTRACT.signatoryTitle };
  }
}
