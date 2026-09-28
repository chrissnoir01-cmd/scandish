import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { adminDb } from "./firebase-admin";
import { DEFAULT_CONTRACT, DEFAULT_PRICING, type ContractTemplate, type PlanPricing, type Pricing } from "../settings";

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
  return saved;
}
