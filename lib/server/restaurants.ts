import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { destroyImages, publicIdFromUrl } from "./cloudinary";
import { adminDb } from "./firebase-admin";
import { normalizeDesign } from "../design";
import { premiumPending } from "../premium";
import { daysRemaining, inTrial, isPubliclyVisible } from "../subscription";
import { ValidationError } from "./validate";
import type {
  CompanyStatus,
  DashboardData,
  MenuCategory,
  Offer,
  Plan,
  PremiumTemplate,
  PublicRestaurant,
  ReceiptPayment,
  RestaurantContent,
} from "../types";

type Doc = Record<string, unknown>;

const TEMPLATES: PremiumTemplate[] = ["default", "camellia", "sample", "freshy", "studio"];

export const restaurantTag = (slug: string) => `restaurant:${slug}`;

export function revalidateRestaurant(slug: string | undefined) {
  if (slug) revalidateTag(restaurantTag(slug), { expire: 0 });
  // A new logo, name, address or status can change the homepage's customer row.
  revalidateTag("showcase", "max");
}

const s = (v: unknown) => (typeof v === "string" ? v : "");

/** Lenient read of a stored restaurant document; never throws on legacy shapes. */
export function toContent(d: Doc): RestaurantContent {
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
          hidden: i.hidden === true,
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
  if (!isPubliclyVisible({ status: c?.status as CompanyStatus, subscriptionEnd: s(c?.subscriptionEnd), trialEndsAt: s(c?.trialEndsAt) })) {
    return null;
  }

  const template = TEMPLATES.includes(data.premiumTemplate) ? data.premiumTemplate : "default";
  const content = toContent(data);
  // Hidden dishes stay in the dashboard only; categories left empty disappear from the page.
  content.menu = content.menu
    .map((c) => ({ ...c, items: c.items.filter((i) => !i.hidden) }))
    .filter((c) => c.items.length > 0);
  return {
    ...content,
    slug,
    plan: toPlan(data.plan),
    premiumEnabled: data.premiumEnabled === true,
    premiumTemplate: template,
    design: template === "studio" && data.design ? normalizeDesign(data.design) : null,
    subdomain: s(data.subdomain),
    ordering: toPlan(data.plan) === "premium" && data.ordersOpen === true,
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

/** Every publicly visible page, with its subdomain when it has one (for the sitemap). */
export async function listPublicPages(): Promise<{ slug: string; subdomain: string }[]> {
  const db = adminDb();
  const [restaurants, companies] = await Promise.all([
    db.collection("restaurants").select("slug", "companyId", "subdomain").get(),
    db.collection("companies").select("status", "subscriptionEnd", "trialEndsAt").get(),
  ]);
  const visible = new Set(
    companies.docs
      .filter((c) =>
        isPubliclyVisible({ status: c.get("status"), subscriptionEnd: c.get("subscriptionEnd"), trialEndsAt: c.get("trialEndsAt") })
      )
      .map((c) => c.id)
  );
  return restaurants.docs
    .filter((r) => visible.has(r.get("companyId")) && r.get("slug"))
    .map((r) => ({ slug: r.get("slug") as string, subdomain: s(r.get("subdomain")) }));
}

export async function getDashboardData(uid: string): Promise<DashboardData | null> {
  const db = adminDb();
  // The owner's account record doesn't depend on the restaurant, so read both at once.
  const [snap, owner] = await Promise.all([db.collection("restaurants").doc(uid).get(), db.collection("users").doc(uid).get()]);
  if (!snap.exists) return null;
  const data = snap.data() as Doc;

  let subscription: DashboardData["subscription"] = null;
  let premiumDueAt = "";
  const companyId = s(data.companyId);
  if (companyId) {
    const c = (await db.collection("companies").doc(companyId).get()).data();
    if (c) {
      premiumDueAt = s(c.premiumDueAt);
      const trial = { subscriptionEnd: s(c.subscriptionEnd), trialEndsAt: s(c.trialEndsAt) };
      subscription = {
        status: c.status === "active" ? "active" : "inactive",
        subscriptionEnd: s(c.subscriptionEnd),
        daysRemaining: daysRemaining(s(c.subscriptionEnd)),
        trialEndsAt: inTrial(trial) ? trial.trialEndsAt : "",
      };
    }
  }

  return {
    ...toContent(data),
    slug: s(data.slug),
    plan: toPlan(data.plan),
    subscription,
    mustChangePassword: owner.get("mustChangePassword") === true,
    subdomain: s(data.subdomain),
    premiumPending: premiumPending(data),
    premiumDueAt: premiumPending(data) ? premiumDueAt : "",
    ordersOpen: toPlan(data.plan) === "premium" && data.ordersOpen === true,
    receiptPayment: toReceiptPayment(data.receiptPayment),
  };
}

export function toReceiptPayment(v: unknown): ReceiptPayment {
  const d = (v && typeof v === "object" ? v : {}) as Doc;
  return { label: s(d.label), code: s(d.code), name: s(d.name) };
}

/** Saves the payment details printed on receipts (validated here; the action checks the PIN). */
export async function saveReceiptPayment(uid: string, input: unknown): Promise<ReceiptPayment> {
  const d = (input && typeof input === "object" ? input : {}) as Doc;
  const code = s(d.code).replace(/\s+/g, "");
  if (code && !/^[0-9*#+]{3,40}$/.test(code)) throw new ValidationError("The payment code can only contain digits, * and # (for example *182*8*1*123456#).");
  const label = s(d.label).trim().slice(0, 40) || (code ? "Pay with Mobile Money" : "");
  const name = s(d.name).trim().slice(0, 60);
  const payment = code ? { label, code, name } : { label: "", code: "", name: "" };
  await adminDb().collection("restaurants").doc(uid).update({ receiptPayment: payment });
  return payment;
}

const SECTION_LABELS: Record<keyof RestaurantContent, string> = {
  name: "name",
  description: "slogan",
  about: "about",
  logo: "logo",
  coverImage: "cover photo",
  phone: "phone",
  whatsapp: "WhatsApp",
  website: "website",
  location: "address",
  social: "social links",
  theme: "colors",
  menu: "menu",
  gallery: "gallery",
  offers: "offers",
};

const itemCount = (menu: MenuCategory[]) => menu.reduce((n, c) => n + c.items.length, 0);

/** Human-readable list of what changed, e.g. ["menu (12 → 14 items)", "gallery"]. */
function describeChanges(before: RestaurantContent, after: RestaurantContent): string[] {
  return (Object.keys(SECTION_LABELS) as (keyof RestaurantContent)[])
    .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map((k) => {
      if (k === "menu") {
        const [a, b] = [itemCount(before.menu), itemCount(after.menu)];
        return a === b ? "menu" : `menu (${a} → ${b} items)`;
      }
      return SECTION_LABELS[k];
    });
}

/** Every image a page uses: logo, cover, dish photos and gallery. */
export function contentImages(c: RestaurantContent): string[] {
  return [c.logo, c.coverImage, ...c.menu.flatMap((cat) => cat.items.map((i) => i.image)), ...c.gallery].filter(Boolean);
}

/** Writes only owner-editable fields; plan, slug and company links are untouchable here. */
export async function saveRestaurantContent(
  uid: string,
  content: RestaurantContent
): Promise<{ slug: string; name: string; changes: string[]; dishChanges: string[]; imagesDeleted: number }> {
  const ref = adminDb().collection("restaurants").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Restaurant not found");

  const before = toContent(snap.data() as Doc);
  // Hide / Unhide is its own instant switch; publishing never changes it.
  const hiddenBefore = new Map(before.menu.flatMap((c) => c.items.map((i) => [dishKey(i, c.category), i.hidden === true] as const)));
  content = {
    ...content,
    menu: content.menu.map((c) => ({
      ...c,
      items: c.items.map((i) => ({ ...i, hidden: hiddenBefore.get(dishKey(i, c.category)) ?? false })),
    })),
  };
  const changes = describeChanges(before, content);
  const dishChanges = menuChanges(before, content);
  await ref.set({ ...content, updatedAt: new Date().toISOString() }, { merge: true });
  const slug = s(snap.get("slug"));
  revalidateRestaurant(slug);

  // Images replaced or removed in this save are deleted from Cloudinary — only files in this
  // owner's own upload folder, and only after the new content is safely stored.
  const kept = new Set(contentImages(content));
  const removed = contentImages(before)
    .filter((url) => !kept.has(url))
    .map(publicIdFromUrl)
    .filter((id): id is string => Boolean(id?.startsWith(`scandish/${uid}/`)));
  const imagesDeleted = removed.length ? await destroyImages(removed) : 0;

  return { slug, name: content.name, changes, dishChanges, imagesDeleted };
}

const dishKey = (i: { id: string; name: string }, category: string) => i.id || `${category}::${i.name}`;

/** Dish-level changes for the weekly log: added, removed, price changes and edits. */
export function menuChanges(before: RestaurantContent, after: RestaurantContent): string[] {
  const flat = (c: RestaurantContent) => new Map(c.menu.flatMap((cat) => cat.items.map((i) => [dishKey(i, cat.category), { ...i, category: cat.category }] as const)));
  const [a, b] = [flat(before), flat(after)];
  const out: string[] = [];
  for (const [k, item] of b) {
    const old = a.get(k);
    if (!old) {
      out.push(`Product added: ${item.name} (${item.price || "no price"})`);
      continue;
    }
    if (old.price !== item.price) out.push(`Price changed: ${item.name} ${old.price || "—"} → ${item.price || "—"}`);
    const edited = (["name", "description", "image", "category", "available", "featured"] as const).filter((f) => old[f] !== item[f]);
    if (edited.length) {
      const what = edited.map((f) => (f === "image" ? "photo" : f === "available" ? (item.available ? "now available" : "marked sold out") : f));
      out.push(`Product edited: ${item.name} (${what.join(", ")})`);
    }
  }
  for (const [k, item] of a) if (!b.has(k)) out.push(`Product deleted: ${item.name}`);
  return out;
}

/** Hide or unhide one dish right away (no publish needed). Returns its name. */
export async function setMenuItemHidden(uid: string, key: string, hidden: boolean): Promise<{ name: string; slug: string }> {
  const ref = adminDb().collection("restaurants").doc(uid);
  const result = await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ValidationError("Restaurant not found");
    const menu = Array.isArray(snap.get("menu")) ? (snap.get("menu") as Doc[]) : [];
    let found = "";
    const next = menu.map((c) => ({
      ...c,
      items: (Array.isArray(c.items) ? (c.items as Doc[]) : []).map((i) => {
        if (found || dishKey({ id: s(i.id), name: s(i.name) }, s(c.category)) !== key) return i;
        found = s(i.name);
        return { ...i, hidden };
      }),
    }));
    if (!found) throw new ValidationError("That product was not found. Publish your menu first, then try again.");
    tx.update(ref, { menu: next, updatedAt: new Date().toISOString() });
    return { name: found, slug: s(snap.get("slug")) };
  });
  revalidateRestaurant(result.slug);
  return result;
}

/**
 * After the owner changes their login email (Firebase confirms it by email), copies of the address
 * in ScanDish records follow. Everything else is linked by the account id, so nothing else moves.
 * Returns the previous address when something changed.
 */
export async function syncLoginEmail(uid: string, email: string | undefined): Promise<string | null> {
  const next = (email ?? "").toLowerCase();
  if (!next) return null;
  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const user = await userRef.get();
  const previous = s(user.get("email")).toLowerCase();
  if (!user.exists || previous === next) return null;

  const now = new Date().toISOString();
  const batch = db.batch();
  batch.set(userRef, { email: next, emailChangedAt: now, previousEmail: previous }, { merge: true });
  const restaurant = await db.collection("restaurants").doc(uid).get();
  if (restaurant.exists) batch.update(restaurant.ref, { ownerEmail: next });
  const companyId = s(restaurant.get("companyId"));
  if (companyId) {
    const company = await db.collection("companies").doc(companyId).get();
    // The business contact email follows only when it was the same address as the login.
    if (company.exists && s(company.get("email")).toLowerCase() === previous) batch.update(company.ref, { email: next, updatedAt: now });
  }
  await batch.commit();
  return previous;
}
