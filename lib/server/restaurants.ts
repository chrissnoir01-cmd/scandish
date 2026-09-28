import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { adminDb } from "./firebase-admin";
import { daysRemaining, isPubliclyVisible } from "../subscription";
import type {
  CompanyStatus,
  DashboardData,
  MenuCategory,
  Offer,
  Plan,
  PremiumTemplate,
  PublicRestaurant,
  RestaurantContent,
} from "../types";

type Doc = Record<string, unknown>;

const TEMPLATES: PremiumTemplate[] = ["default", "camellia", "sample", "freshy"];

export const restaurantTag = (slug: string) => `restaurant:${slug}`;

export function revalidateRestaurant(slug: string | undefined) {
  if (slug) revalidateTag(restaurantTag(slug), { expire: 0 });
}

const s = (v: unknown) => (typeof v === "string" ? v : "");

/** Lenient read of a stored restaurant document; never throws on legacy shapes. */
function toContent(d: Doc): RestaurantContent {
  const social = (d.social ?? {}) as Doc;
  const theme = (d.theme ?? {}) as Doc;
  const menu = Array.isArray(d.menu) ? (d.menu as Doc[]) : [];
  const offers = Array.isArray(d.offers) ? (d.offers as unknown[]) : [];

  return {
    name: s(d.name),
    description: s(d.description),
    about: s(d.about),
    logo: s(d.logo),
    coverImage: s(d.coverImage),
    phone: s(d.phone),
    whatsapp: s(d.whatsapp),
    website: s(d.website),
    location: s(d.location),
    social: {
      instagram: s(social.instagram),
      facebook: s(social.facebook),
      tiktok: s(social.tiktok),
    },
    theme: {
      primaryColor: s(theme.primaryColor) || "#f08c6c",
      secondaryColor: s(theme.secondaryColor) || "#111827",
      backgroundColor: s(theme.backgroundColor) || "#ffffff",
    },
    menu: menu.map(
      (c): MenuCategory => ({
        category: s(c.category),
        items: (Array.isArray(c.items) ? (c.items as Doc[]) : []).map((i) => ({
          id: s(i.id),
          name: s(i.name),
          description: s(i.description),
          price: s(i.price),
          image: s(i.image),
          available: i.available !== false,
          featured: i.featured === true,
        })),
      })
    ),
    gallery: (Array.isArray(d.gallery) ? d.gallery : []).filter(
      (g): g is string => typeof g === "string" && g.length > 0
    ),
    offers: offers.map(
      (o): Offer =>
        typeof o === "string" ? { text: o, icon: "tag" } : { text: s((o as Doc).text), icon: s((o as Doc).icon) || "tag" }
    ),
  };
}

function toPlan(v: unknown): Plan {
  return v === "premium" ? "premium" : "standard";
}

async function loadPublicRestaurant(slug: string): Promise<PublicRestaurant | null> {
  const db = adminDb();
  const snap = await db.collection("restaurants").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;

  const data = snap.docs[0].data();
  const companyId = s(data.companyId);
  if (!companyId) return null;

  const company = await db.collection("companies").doc(companyId).get();
  const c = company.data();
  if (!isPubliclyVisible({ status: c?.status as CompanyStatus, subscriptionEnd: s(c?.subscriptionEnd) })) {
    return null;
  }

  const template = TEMPLATES.includes(data.premiumTemplate) ? data.premiumTemplate : "default";
  return {
    ...toContent(data),
    slug,
    plan: toPlan(data.plan),
    premiumEnabled: data.premiumEnabled === true,
    premiumTemplate: template,
  };
}

/**
 * Cached per slug. Saves and admin changes expire the tag immediately;
 * the hourly revalidate picks up subscription expiry.
 */
export function getPublicRestaurant(slug: string) {
  return unstable_cache(() => loadPublicRestaurant(slug), ["public-restaurant", slug], {
    tags: [restaurantTag(slug)],
    revalidate: 3600,
  })();
}

export async function listPublicSlugs(): Promise<string[]> {
  const db = adminDb();
  const [restaurants, companies] = await Promise.all([
    db.collection("restaurants").select("slug", "companyId").get(),
    db.collection("companies").select("status", "subscriptionEnd").get(),
  ]);
  const visible = new Set(
    companies.docs
      .filter((c) => isPubliclyVisible({ status: c.get("status"), subscriptionEnd: c.get("subscriptionEnd") }))
      .map((c) => c.id)
  );
  return restaurants.docs
    .filter((r) => visible.has(r.get("companyId")) && r.get("slug"))
    .map((r) => r.get("slug") as string);
}

export async function getDashboardData(uid: string): Promise<DashboardData | null> {
  const db = adminDb();
  const snap = await db.collection("restaurants").doc(uid).get();
  if (!snap.exists) return null;
  const data = snap.data() as Doc;

  let subscription: DashboardData["subscription"] = null;
  const companyId = s(data.companyId);
  if (companyId) {
    const c = (await db.collection("companies").doc(companyId).get()).data();
    if (c) {
      subscription = {
        status: c.status === "active" ? "active" : "inactive",
        subscriptionEnd: s(c.subscriptionEnd),
        daysRemaining: daysRemaining(s(c.subscriptionEnd)),
      };
    }
  }

  return { ...toContent(data), slug: s(data.slug), plan: toPlan(data.plan), subscription };
}

/** Writes only owner-editable fields; plan, slug and company links are untouchable here. */
export async function saveRestaurantContent(uid: string, content: RestaurantContent): Promise<string> {
  const ref = adminDb().collection("restaurants").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Restaurant not found");

  await ref.set({ ...content, updatedAt: new Date().toISOString() }, { merge: true });
  const slug = s(snap.get("slug"));
  revalidateRestaurant(slug);
  return slug;
}
