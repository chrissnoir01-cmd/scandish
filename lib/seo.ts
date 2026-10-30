/** How restaurant pages describe themselves to search engines (titles, descriptions, keywords). */

import { formatAmount, parsePrice } from "./orders";
import type { MenuCategory } from "./types";

/** "13 KG 182 St, Kigali" → "Kigali"; empty when no address is set. */
export function placeOf(location: string): string {
  const parts = location
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : /kigali/i.test(location) ? "Kigali" : "";
}

const visibleCategories = (menu: MenuCategory[]) => menu.filter((c) => c.items.some((i) => !i.hidden)).map((c) => c.category.trim()).filter(Boolean);

/** "PIZZA" → "Pizza", keeps "BBQ" style short words. */
const nice = (s: string) => (s.length > 3 && s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s);

/** Page title: "Huber Food Menu & Prices – Kigali". Search engines show about 60 characters. */
export function restaurantTitle(name: string, location: string): string {
  const place = placeOf(location);
  const full = `${name} Menu & Prices${place ? ` – ${place}` : ""}`;
  return full.length <= 65 ? full : `${name} Menu${place ? ` – ${place}` : ""}`;
}

/**
 * Description: what people search for — the restaurant's name, "menu", the place, its menu
 * categories (pizza, burgers…) and a few dishes with prices. About 155 characters are shown.
 */
export function restaurantDescription(r: { name: string; description: string; location: string; menu: MenuCategory[] }): string {
  const place = placeOf(r.location);
  const cats = cuisinesOf(r.menu).slice(0, 4);
  const dishes = r.menu
    .flatMap((c) => c.items)
    .filter((i) => !i.hidden && i.available)
    .slice(0, 3)
    .map((i) => {
      const p = parsePrice(i.price);
      return p === null ? i.name : `${i.name} ${formatAmount(p)} RWF`;
    });
  const parts = [
    `${r.name} menu${place ? ` in ${place}` : ""}${cats.length ? `: ${cats.join(", ")}` : ""}.`,
    dishes.length ? `${dishes.join(", ")}.` : "",
    "See prices, photos and location.",
  ].filter(Boolean);
  let text = parts.join(" ");
  if (text.length > 160 && r.description) text = `${parts[0]} ${r.description}`;
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

/**
 * Words people actually search for ("pizza menu", "burgers Kigali"), found in a restaurant's category
 * and dish names. Restaurants name categories freely ("Lg, pizza", "Chickiez special"); these are clean.
 */
const TOPICS: [string, RegExp][] = [
  ["Pizza", /pizza/i],
  ["Burgers", /burger/i],
  ["Chicken", /chicken|wings|poulet/i],
  ["Fries & chips", /fries|chips|frites/i],
  ["Grill & brochettes", /grill|brochette|bbq|barbecue|kebab|nyama/i],
  ["Fish", /fish|tilapia|sambaza|poisson/i],
  ["Beef", /beef|steak|boeuf/i],
  ["Goat", /goat|chèvre|chevre/i],
  ["Rice", /\brice\b|pilau|riz/i],
  ["Pasta", /pasta|spaghetti|macaroni|penne/i],
  ["Sandwiches & wraps", /sandwich|wrap|shawarma|panini/i],
  ["Salads", /sala[dt]/i],
  ["Soups", /soup|soupe/i],
  ["Breakfast", /breakfast|omelet|omelette|omlette|eggs|pancake|petit[- ]d[ée]jeuner/i],
  ["African dishes", /isombe|ugali|matoke|igitoki|brochette|akabenz|ibihaza|sambaza/i],
  ["Coffee & tea", /coffee|cappuccino|espresso|latte|\btea\b|caf[ée]\b/i],
  ["Juices & drinks", /juice|smoothie|soda|soft drink|drinks|jus\b|mocktail/i],
  ["Beer & cocktails", /beer|cocktail|wine|whisky|primus|mützig|mutzig|skol/i],
  ["Desserts", /dessert|cake|ice cream|pastry|pastries|sweet/i],
];

/** Clean search topics for a menu ("Pizza", "Burgers", …), most dishes first. */
export function topicsOf(menu: MenuCategory[]): string[] {
  const counts = new Map<string, number>();
  for (const c of menu) {
    for (const item of c.items) {
      if (item.hidden) continue;
      const text = `${c.category} ${item.name} ${item.description}`;
      for (const [topic, re] of TOPICS) if (re.test(text)) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

/** Cuisine keywords for structured data: clean topics, or the category names when none are recognised. */
export function cuisinesOf(menu: MenuCategory[]): string[] {
  const topics = topicsOf(menu);
  return (topics.length ? topics : [...new Set(visibleCategories(menu).map(nice))]).slice(0, 12);
}

/* ---------- IndexNow (Bing, Yandex, Seznam…; Bing also feeds ChatGPT search) ---------- */

/** Public by design: search engines fetch it from https://<host>/<key>.txt to confirm the site is ours. */
export const INDEXNOW_KEY = "5c1a9e7d3b8f4a6e9d2c7b1f0e4a8d36";
