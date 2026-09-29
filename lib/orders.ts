/** Table ordering (Premium): rules shared by the menu page, the server and the dashboard. */

import type { MenuCategory, MenuItem } from "./types";

export type OrderStatus = "new" | "preparing" | "done" | "cancelled";
export const ORDER_STATUSES: OrderStatus[] = ["new", "preparing", "done", "cancelled"];

export interface OrderLine {
  name: string;
  category: string;
  qty: number;
  /** Price per unit read from the menu; null when the menu shows no number (e.g. "Market price"). */
  unitPrice: number | null;
  /** The price exactly as the menu shows it. */
  priceText: string;
  lineTotal: number | null;
}

export interface Order {
  id: string;
  /** Daily number, restarting at 1 each day (Kigali time). */
  number: number;
  /** YYYY-MM-DD, Kigali time. */
  day: string;
  items: OrderLine[];
  total: number;
  currency: string;
  /** Some lines have no number price, so the total leaves them out. */
  hasUnpriced: boolean;
  table: string;
  phone: string;
  note: string;
  status: OrderStatus;
  createdAt: string;
  printedAt: string;
}

/** What the guest's phone sends. Prices never travel from the guest; the server reads them from the menu. */
export interface OrderRequest {
  slug: string;
  items: { id: string; name: string; category: string; qty: number }[];
  table: string;
  phone: string;
  note: string;
}

export const ORDER_LIMITS = {
  lines: 40,
  qtyPerLine: 50,
  qtyTotal: 150,
  table: 20,
  note: 200,
  /** Orders are removed after this many days. */
  keepDays: 30,
};

/** Stable key for a dish in the cart (older menus may have dishes without an id). */
export const itemKey = (item: Pick<MenuItem, "id" | "name">, category: string) => item.id || `${category}::${item.name}`;

/**
 * Reads the number out of a menu price: "7,500", "7.500 RWF", "Frw 3500", "4.5" → 7500, 7500, 3500, 4.5.
 * Returns null when there is no number ("Market price", "Ask the waiter").
 */
export function parsePrice(text: string): number | null {
  const match = text.match(/\d[\d\s,.']*/);
  if (!match) return null;
  let raw = match[0].replace(/[\s']/g, "").replace(/[.,]$/, "");
  if (raw.includes(",") && raw.includes(".")) raw = raw.replace(/,/g, ""); // 1,500.50
  else if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) raw = raw.replace(/[.,]/g, ""); // thousands separators
  else raw = raw.replace(/,/g, ".");
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** The currency the menu prices are written in; RWF when they show none. */
export function menuCurrency(menu: MenuCategory[]): string {
  for (const c of menu) {
    for (const i of c.items) {
      const m = i.price.match(/\$|€|£|usd|eur|rwf|frw|rf/i);
      if (m) return m[0] === "$" ? "USD" : m[0] === "€" ? "EUR" : m[0] === "£" ? "GBP" : m[0].toUpperCase() === "RF" ? "RWF" : m[0].toUpperCase();
    }
  }
  return "RWF";
}

export function formatAmount(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Phone typed by a guest: digits with an optional leading +, 9–15 digits. "" when empty, null when invalid. */
export function normalizeGuestPhone(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "";
  const cleaned = v.replace(/[\s\-().]/g, "");
  if (!/^\+?\d{9,15}$/.test(cleaned)) return null;
  return cleaned;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  preparing: "Preparing",
  done: "Done",
  cancelled: "Cancelled",
};

/** Lenient read of a stored order (server and the dashboard's live list). */
export function toOrder(id: string, d: Record<string, unknown>): Order {
  type Doc = Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const items = Array.isArray(d.items) ? (d.items as Doc[]) : [];
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    id,
    number: num(d.number) ?? 0,
    day: s(d.day),
    items: items.map((l) => ({
      name: s(l.name),
      category: s(l.category),
      qty: num(l.qty) ?? 1,
      unitPrice: num(l.unitPrice),
      priceText: s(l.priceText),
      lineTotal: num(l.lineTotal),
    })),
    total: num(d.total) ?? 0,
    currency: s(d.currency) || "RWF",
    hasUnpriced: d.hasUnpriced === true,
    table: s(d.table),
    phone: s(d.phone),
    note: s(d.note),
    status: ORDER_STATUSES.includes(d.status as OrderStatus) ? (d.status as OrderStatus) : "new",
    createdAt: s(d.createdAt),
    printedAt: s(d.printedAt),
  };
}
