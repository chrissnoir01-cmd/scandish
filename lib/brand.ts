export const BRAND = {
  name: "ScanDish",
  color: "#f08c6c",
  url: "https://scandish.online",
  supportEmail: "support@scandish.online",
  supportPhone: "+250781822350",
  supportWhatsApp: "https://wa.me/250781822350",
  /** The company that builds, operates and monitors ScanDish. */
  company: "Ironic Lab Inc.",
  companyUrl: "https://ironiclab.site",
} as const;

export const MIN_PASSWORD_LENGTH = 8;

/** Bump when the Terms or Privacy Policy change materially; stored with each acceptance. */
export const TERMS_VERSION = "2026-09-28";
export const LEGAL_UPDATED = "28 September 2026";

/** Bump when the Support Team Agreement changes materially. */
export const AGREEMENT_VERSION = "2026-09-28";

/** One-time setup fees (RWF) — kept by the support member who onboards the business. Mirrors the pricing page. */
export const SETUP_FEES = { standard: 20000, premium: 80000 } as const;

export const formatRwf = (n: number) => `${n.toLocaleString("en-US")} RWF`;
