import "server-only";
import { randomUUID } from "node:crypto";
import type { MenuCategory, MenuItem, Offer, RestaurantContent } from "../types";

export class ValidationError extends Error {}

const LIMITS = {
  short: 120,
  medium: 500,
  long: 3000,
  url: 1000,
  categories: 60,
  itemsPerCategory: 300,
  gallery: 60,
  offers: 30,
};

const OFFER_ICONS = new Set(["wifi", "car", "truck", "music", "coffee", "tag", "flame", "phone"]);
const HEX = /^#[0-9a-f]{6}$/i;

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown, max: number, field: string): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new ValidationError(`${field} must be text`);
  const v = value.trim();
  if (v.length > max) throw new ValidationError(`${field} is too long (max ${max} characters)`);
  return v;
}

/** Links typed by owners: plain handles or http(s) URLs, never script/data URLs. */
function link(value: unknown, field: string): string {
  const v = str(value, LIMITS.url, field);
  if (/^\s*(javascript|data|vbscript):/i.test(v)) throw new ValidationError(`${field} is not a valid link`);
  return v;
}

function imageUrl(value: unknown, field: string): string {
  const v = str(value, LIMITS.url, field);
  if (v && !v.startsWith("https://")) throw new ValidationError(`${field} must be an uploaded image`);
  return v;
}

function color(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value) ? value : fallback;
}

function list(value: unknown, max: number, field: string): unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ValidationError(`${field} must be a list`);
  if (value.length > max) throw new ValidationError(`Too many ${field} (max ${max})`);
  return value;
}

function menuItem(value: unknown): MenuItem {
  const v = obj(value);
  const name = str(v.name, LIMITS.short, "Item name");
  if (!name) throw new ValidationError("Every menu item needs a name");
  const id = str(v.id, 64, "Item id") || randomUUID();
  return {
    id,
    name,
    description: str(v.description, LIMITS.medium, `Description of "${name}"`),
    price: str(v.price, 40, `Price of "${name}"`),
    image: imageUrl(v.image, `Photo of "${name}"`),
    available: v.available !== false,
    featured: v.featured === true,
  };
}

function menu(value: unknown): MenuCategory[] {
  return list(value, LIMITS.categories, "categories").map((raw) => {
    const c = obj(raw);
    const category = str(c.category, LIMITS.short, "Category name");
    if (!category) throw new ValidationError("Every category needs a name");
    return {
      category,
      items: list(c.items, LIMITS.itemsPerCategory, `items in "${category}"`).map(menuItem),
    };
  });
}

function offers(value: unknown): Offer[] {
  return list(value, LIMITS.offers, "offers").map((raw) => {
    // Older records stored offers as plain strings.
    const o = typeof raw === "string" ? { text: raw } : obj(raw);
    const icon = typeof o.icon === "string" && OFFER_ICONS.has(o.icon) ? o.icon : "tag";
    return { text: str(o.text, LIMITS.short, "Offer"), icon };
  }).filter((o) => o.text);
}

export function parseRestaurantContent(input: unknown): RestaurantContent {
  const v = obj(input);
  const social = obj(v.social);
  const theme = obj(v.theme);

  const name = str(v.name, LIMITS.short, "Business name");
  if (!name) throw new ValidationError("Business name is required");

  return {
    name,
    description: str(v.description, LIMITS.medium, "Slogan"),
    about: str(v.about, LIMITS.long, "About"),
    logo: imageUrl(v.logo, "Logo"),
    coverImage: imageUrl(v.coverImage, "Cover photo"),
    phone: str(v.phone, 40, "Phone"),
    whatsapp: str(v.whatsapp, 40, "WhatsApp"),
    website: link(v.website, "Website"),
    location: str(v.location, LIMITS.medium, "Address"),
    social: {
      instagram: link(social.instagram, "Instagram"),
      facebook: link(social.facebook, "Facebook"),
      tiktok: link(social.tiktok, "TikTok"),
    },
    theme: {
      primaryColor: color(theme.primaryColor, "#f08c6c"),
      secondaryColor: color(theme.secondaryColor, "#111827"),
      backgroundColor: color(theme.backgroundColor, "#ffffff"),
    },
    menu: menu(v.menu),
    gallery: list(v.gallery, LIMITS.gallery, "gallery photos").map((g, i) =>
      imageUrl(g, `Gallery photo ${i + 1}`)
    ).filter(Boolean),
    offers: offers(v.offers),
  };
}

export { str as validateString };
