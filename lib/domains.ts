/**
 * Premium businesses get their own subdomain (kiza.scandish.online). Shared by proxy.ts,
 * server code and the browser.
 *
 * NEXT_PUBLIC_ROOT_DOMAIN overrides the root for local testing, e.g. "localhost:3000"
 * (then kiza.localhost:3000 works in the browser).
 */
export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "scandish.online").toLowerCase();

const isLocal = ROOT_DOMAIN.startsWith("localhost");
export const ROOT_URL = `${isLocal ? "http" : "https"}://${ROOT_DOMAIN}`;

export const subdomainUrl = (sub: string) => `${isLocal ? "http" : "https"}://${sub}.${ROOT_DOMAIN}`;
export const subdomainHost = (sub: string) => `${sub}.${ROOT_DOMAIN}`;

/** Names that can never be given to a business. */
const RESERVED = new Set([
  "www", "api", "app", "admin", "master", "masteradmin", "dashboard", "login", "signup", "support", "help", "mail", "email",
  "smtp", "imap", "pop", "ftp", "ns", "ns1", "ns2", "dns", "cdn", "static", "assets", "img", "images", "media", "files",
  "blog", "docs", "status", "dev", "test", "staging", "preview", "beta", "demo", "secure", "auth", "account", "accounts",
  "billing", "pay", "payment", "payments", "shop", "store", "scandish", "ironiclab", "ironic", "vercel", "firebase", "r", "s",
]);

/** Why a subdomain name can't be used (ignoring whether it's taken), or null. Expects the normalized name. */
export function subdomainProblem(name: string): string | null {
  if (name.length < 3) return "Use at least 3 characters";
  if (name.length > 32) return "Use at most 32 characters";
  if (!/^[a-z0-9-]+$/.test(name)) return "Use only letters, numbers and hyphens";
  if (name.startsWith("-") || name.endsWith("-")) return "Can't start or end with a hyphen";
  if (name.includes("--")) return "Can't contain two hyphens in a row";
  if (RESERVED.has(name)) return "This name is reserved by ScanDish";
  return null;
}

export const normalizeSubdomain = (value: string) => value.trim().toLowerCase();

/** The business subdomain in a request host, or null for the main site, www and other hosts. */
export function subdomainFromHost(host: string | null): string | null {
  if (!host) return null;
  const h = host.toLowerCase();
  const suffix = `.${ROOT_DOMAIN}`;
  if (!h.endsWith(suffix)) return null;
  const sub = h.slice(0, -suffix.length);
  if (!sub || sub === "www" || sub.includes(".")) return null;
  return sub;
}
