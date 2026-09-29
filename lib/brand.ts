export const BRAND = {
  name: "ScanDish",
  color: "#f08c6c",
  url: "https://scandish.online",
  // Phone, WhatsApp and email are editable in MasterAdmin → Settings: use getContact() / useContact().
  /** The company that builds, operates and monitors ScanDish. */
  /** The menu the homepage's "See a live menu" button opens (the ScanDish demo restaurant). */
  demoMenuSlug: "kiza-restaurant",
  company: "Ironic Lab Inc.",
  companyUrl: "https://ironiclab.site",
} as const;

export const MIN_PASSWORD_LENGTH = 8;

/** Bump when the Terms or Privacy Policy change materially; stored with each acceptance. */
export const TERMS_VERSION = "2026-09-28";
export const LEGAL_UPDATED = "28 September 2026";

/** Bump when the Support Team Agreement changes materially. */
export const AGREEMENT_VERSION = "2026-09-28";

export const formatRwf = (n: number) => `${n.toLocaleString("en-US")} RWF`;
