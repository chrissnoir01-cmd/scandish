import "server-only";
import { unstable_cache } from "next/cache";
import { BRAND } from "../brand";
import { subdomainUrl } from "../domains";
import { optimizeImage } from "../links";
import { isPubliclyVisible } from "../subscription";
import { adminDb } from "./firebase-admin";
import { toContent } from "./restaurants";
import { topicsOf } from "../seo";

export const SHOWCASE_TAG = "showcase";

export interface ShowcaseRestaurant {
  name: string;
  logo: string;
  url: string;
}

const s = (v: unknown) => (typeof v === "string" ? v : "");

export interface Showcase {
  restaurants: ShowcaseRestaurant[];
  /** Restaurants with a live public page right now (shown or not). */
  liveCount: number;
  /** Where "See a live menu" goes: the demo restaurant while it's live, otherwise the first customer. */
  exampleUrl: string;
}

/**
 * Customers shown on the homepage: registered, currently live, with a logo, and not hidden by
 * MasterAdmin (Companies → "Show on homepage").
 */
async function load(): Promise<Showcase> {
  const db = adminDb();
  const [companies, restaurants] = await Promise.all([
    db.collection("companies").select("status", "subscriptionEnd", "trialEndsAt", "showOnHomepage").get(),
    db.collection("restaurants").select("companyId", "name", "logo", "slug", "subdomain").get(),
  ]);
  const live = companies.docs.filter((c) =>
    isPubliclyVisible({ status: c.get("status"), subscriptionEnd: s(c.get("subscriptionEnd")), trialEndsAt: s(c.get("trialEndsAt")) })
  );
  const liveIds = new Set(live.map((c) => c.id));
  const shown = new Set(live.filter((c) => c.get("showOnHomepage") !== false).map((c) => c.id));
  const pageUrl = (r: FirebaseFirestore.QueryDocumentSnapshot) =>
    s(r.get("subdomain")) ? `${subdomainUrl(s(r.get("subdomain")))}/` : `/r/${s(r.get("slug"))}`;
  const list = restaurants.docs
    .filter((r) => shown.has(s(r.get("companyId"))) && s(r.get("logo")) && s(r.get("name")) && s(r.get("slug")))
    .map((r) => ({
      name: s(r.get("name")),
      logo: optimizeImage(s(r.get("logo")), 240),
      url: pageUrl(r),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const liveCount = restaurants.docs.filter((r) => liveIds.has(s(r.get("companyId"))) && s(r.get("slug"))).length;
  // The demo counts even when it's hidden from the logo row.
  const demo = restaurants.docs.find((r) => r.get("slug") === BRAND.demoMenuSlug && liveIds.has(s(r.get("companyId"))));
  return { restaurants: list, liveCount, exampleUrl: demo ? pageUrl(demo) : list[0]?.url ?? "" };
}

const cached = unstable_cache(load, ["showcase"], { tags: [SHOWCASE_TAG], revalidate: 3600 });

/** Never breaks the homepage: an unreachable database just hides the logo row. */
export async function getShowcase(): Promise<Showcase> {
  try {
    return await cached();
  } catch (err) {
    console.error("showcase unavailable", err);
    return { restaurants: [], liveCount: 0, exampleUrl: "" };
  }
}

export interface DirectoryRestaurant {
  name: string;
  logo: string;
  url: string;
  location: string;
  /** Menu categories that have visible dishes, as the restaurant named them. */
  categories: string[];
  /** Clean search topics found in the menu ("Pizza", "Burgers", …). */
  topics: string[];
  dishes: number;
  updatedAt: string;
}

/**
 * Every live restaurant for the public directory (/restaurants): what Google follows to find
 * each menu page, and what matches searches like "pizza menu Kigali". Cached with the showcase.
 */
async function loadDirectory(): Promise<DirectoryRestaurant[]> {
  const db = adminDb();
  const [companies, restaurants] = await Promise.all([
    db.collection("companies").select("status", "subscriptionEnd", "trialEndsAt").get(),
    db.collection("restaurants").select("companyId", "name", "logo", "slug", "subdomain", "location", "menu", "updatedAt").get(),
  ]);
  const live = new Set(
    companies.docs
      .filter((c) => isPubliclyVisible({ status: c.get("status"), subscriptionEnd: s(c.get("subscriptionEnd")), trialEndsAt: s(c.get("trialEndsAt")) }))
      .map((c) => c.id)
  );
  return restaurants.docs
    .filter((r) => live.has(s(r.get("companyId"))) && s(r.get("slug")) && s(r.get("name")))
    .map((r) => {
      const content = toContent(r.data());
      const menu = (Array.isArray(r.get("menu")) ? r.get("menu") : []) as { category?: unknown; items?: { hidden?: unknown }[] }[];
      const shown = menu.map((c) => ({ category: s(c.category).trim(), count: (Array.isArray(c.items) ? c.items : []).filter((i) => i?.hidden !== true).length }));
      return {
        name: s(r.get("name")),
        logo: s(r.get("logo")) ? optimizeImage(s(r.get("logo")), 160) : "",
        url: s(r.get("subdomain")) ? `${subdomainUrl(s(r.get("subdomain")))}/` : `https://scandish.online/r/${s(r.get("slug"))}`,
        location: s(r.get("location")),
        categories: shown.filter((c) => c.count > 0 && c.category).map((c) => c.category),
        topics: topicsOf(content.menu),
        dishes: shown.reduce((n, c) => n + c.count, 0),
        updatedAt: s(r.get("updatedAt")),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

const directory = unstable_cache(loadDirectory, ["directory"], { tags: [SHOWCASE_TAG], revalidate: 3600 });

export async function getDirectory(): Promise<DirectoryRestaurant[]> {
  try {
    return await directory();
  } catch (err) {
    console.error("directory unavailable", err);
    return [];
  }
}
