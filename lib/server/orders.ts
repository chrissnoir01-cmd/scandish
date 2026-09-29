import "server-only";
import { adminDb } from "./firebase-admin";
import { kigaliParts } from "./analytics";
import { revalidateRestaurant, toContent } from "./restaurants";
import { ValidationError } from "./validate";
import { isPubliclyVisible } from "../subscription";
import {
  ORDER_LIMITS,
  ORDER_STATUSES,
  itemKey,
  menuCurrency,
  toOrder,
  normalizeGuestPhone,
  parsePrice,
  type Order,
  type OrderLine,
  type OrderStatus,
} from "../orders";
import type { CompanyStatus, MenuItem } from "../types";

type Doc = Record<string, unknown>;

/** Orders live under the owner's restaurant, so Firestore rules can let only that owner read them. */
export const ordersCol = (uid: string) => adminDb().collection("restaurants").doc(uid).collection("orders");
const counterDoc = (uid: string) => adminDb().collection("restaurants").doc(uid).collection("orderMeta").doc("counter");

/** Hard daily ceiling per restaurant, so a flood of fake orders can't fill the database. */
const MAX_ORDERS_PER_DAY = 1000;

const s = (v: unknown) => (typeof v === "string" ? v : "");

/** Guest-facing refusal (shown on the phone as is). */
export class OrderClosedError extends ValidationError {}

/* ---------- Placing an order (public) ---------- */

function parseRequest(raw: unknown) {
  const v = (raw && typeof raw === "object" ? raw : {}) as Doc;
  const slug = s(v.slug);
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) throw new ValidationError("Unknown menu");

  const items = Array.isArray(v.items) ? v.items : [];
  if (items.length === 0) throw new ValidationError("Your order is empty");
  if (items.length > ORDER_LIMITS.lines) throw new ValidationError(`Too many different dishes (max ${ORDER_LIMITS.lines})`);
  const lines = items.map((raw) => {
    const i = (raw && typeof raw === "object" ? raw : {}) as Doc;
    const qty = Number(i.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > ORDER_LIMITS.qtyPerLine) {
      throw new ValidationError(`Quantity must be between 1 and ${ORDER_LIMITS.qtyPerLine}`);
    }
    return { id: s(i.id).slice(0, 64), name: s(i.name).slice(0, 120), category: s(i.category).slice(0, 120), qty };
  });
  if (lines.reduce((n, l) => n + l.qty, 0) > ORDER_LIMITS.qtyTotal) throw new ValidationError("That order is too large — please ask a waiter");

  const table = s(v.table).trim().replace(/\s+/g, " ");
  if (table.length > ORDER_LIMITS.table) throw new ValidationError("Table number is too long");
  const phone = normalizeGuestPhone(s(v.phone));
  if (phone === null) throw new ValidationError("Please enter a valid phone number");
  if (!table && !phone) throw new ValidationError("Enter your table number or your phone number");
  const note = s(v.note).trim().slice(0, ORDER_LIMITS.note);

  return { slug, lines, table, phone, note };
}

/**
 * Records a guest's order. Prices, names and availability come from the stored menu, never from the phone.
 * Throws OrderClosedError when the restaurant isn't taking orders.
 */
export async function placeOrder(raw: unknown, meta: { device: string }): Promise<{ id: string; number: number; restaurant: string }> {
  const req = parseRequest(raw);
  const db = adminDb();

  const snap = await db.collection("restaurants").where("slug", "==", req.slug).limit(1).get();
  if (snap.empty) throw new ValidationError("Unknown menu");
  const doc = snap.docs[0];
  const data = doc.data() as Doc;
  const uid = doc.id;

  const closed = "This restaurant isn't taking orders from the menu right now. Please ask a waiter.";
  if (data.plan !== "premium" || data.ordersOpen !== true) throw new OrderClosedError(closed);
  const companyId = s(data.companyId);
  if (!companyId) throw new OrderClosedError(closed);

  const content = toContent(data);
  const byKey = new Map<string, { item: MenuItem; category: string }>();
  for (const c of content.menu) for (const item of c.items) byKey.set(itemKey(item, c.category), { item, category: c.category });

  const missing: string[] = [];
  const items: OrderLine[] = [];
  for (const l of req.lines) {
    const found = byKey.get(l.id || `${l.category}::${l.name}`) ?? byKey.get(`${l.category}::${l.name}`);
    if (!found || !found.item.available) {
      missing.push(l.name || "a dish");
      continue;
    }
    const unitPrice = parsePrice(found.item.price);
    items.push({
      name: found.item.name,
      category: found.category,
      qty: l.qty,
      unitPrice,
      priceText: found.item.price,
      lineTotal: unitPrice === null ? null : Math.round(unitPrice * l.qty * 100) / 100,
    });
  }
  if (missing.length) {
    throw new ValidationError(`Not available any more: ${missing.join(", ")}. Please remove ${missing.length > 1 ? "them" : "it"} and send again.`);
  }

  const total = items.reduce((n, l) => n + (l.lineTotal ?? 0), 0);
  const now = new Date();
  const { day } = kigaliParts(now);
  const ref = ordersCol(uid).doc();

  // The subscription check and the daily counter are read together: one trip to the database.
  const number = await db.runTransaction(async (tx) => {
    const [counter, companySnap] = await tx.getAll(counterDoc(uid), db.collection("companies").doc(companyId));
    const company = companySnap.data();
    if (!isPubliclyVisible({ status: company?.status as CompanyStatus, subscriptionEnd: s(company?.subscriptionEnd), trialEndsAt: s(company?.trialEndsAt) })) {
      throw new OrderClosedError(closed);
    }
    const n = counter.get("day") === day ? Number(counter.get("n")) || 0 : 0;
    if (n >= MAX_ORDERS_PER_DAY) throw new OrderClosedError(closed);
    tx.set(counterDoc(uid), { day, n: n + 1 });
    tx.set(ref, {
      number: n + 1,
      day,
      items,
      total: Math.round(total * 100) / 100,
      currency: menuCurrency(content.menu),
      hasUnpriced: items.some((l) => l.unitPrice === null),
      table: req.table,
      phone: req.phone,
      note: req.note,
      status: "new",
      createdAt: now.toISOString(),
      printedAt: "",
      printedBy: "",
      device: meta.device,
    });
    return n + 1;
  });

  return { id: ref.id, number, restaurant: content.name };
}

/* ---------- Owner side ---------- */

/** Ordering is part of Premium; returns the owner's restaurant after checking that. */
async function premiumRestaurant(uid: string) {
  const snap = await adminDb().collection("restaurants").doc(uid).get();
  if (!snap.exists) throw new ValidationError("Restaurant not found");
  if (snap.get("plan") !== "premium") throw new ValidationError("Table ordering is part of the Premium plan");
  return snap;
}

export async function setOrdersOpen(uid: string, open: boolean): Promise<{ name: string; slug: string }> {
  const snap = await premiumRestaurant(uid);
  await snap.ref.update({ ordersOpen: open, ordersOpenChangedAt: new Date().toISOString() });
  const slug = s(snap.get("slug"));
  // The menu page shows or hides its "Make an order" button.
  revalidateRestaurant(slug);
  return { name: s(snap.get("name")), slug };
}

export async function listOrders(uid: string): Promise<Order[]> {
  await premiumRestaurant(uid);
  const snap = await ordersCol(uid).orderBy("createdAt", "desc").limit(100).get();
  return snap.docs.map((d) => toOrder(d.id, d.data()));
}

export async function setOrderStatus(uid: string, orderId: string, status: OrderStatus): Promise<void> {
  if (!ORDER_STATUSES.includes(status)) throw new ValidationError("Unknown status");
  const ref = ordersCol(uid).doc(String(orderId).slice(0, 64));
  const snap = await ref.get();
  if (!snap.exists) throw new ValidationError("Order not found");
  await ref.update({ status, statusAt: new Date().toISOString() });
}

/**
 * Marks an order printed. With several print stations open, only the first to claim a
 * new order prints it (force = a reprint the staff asked for).
 */
export async function claimOrderPrint(uid: string, orderId: string, station: string, force: boolean): Promise<boolean> {
  const ref = ordersCol(uid).doc(String(orderId).slice(0, 64));
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    if (!force && snap.get("printedAt")) return false;
    tx.update(ref, { printedAt: new Date().toISOString(), printedBy: station.slice(0, 40) });
    return true;
  });
}

/** Deletes this restaurant's orders older than the keep period (guest phone numbers go with them). */
export async function pruneOldOrders(uid: string): Promise<number> {
  const cutoff = new Date(Date.now() - ORDER_LIMITS.keepDays * 86_400_000).toISOString();
  const old = await ordersCol(uid).where("createdAt", "<", cutoff).limit(300).get();
  if (old.empty) return 0;
  const batch = adminDb().batch();
  old.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return old.size;
}

/** Undoes a claim when the printer failed, so the order shows "Not printed" and can print again. */
export async function releaseOrderPrint(uid: string, orderId: string): Promise<void> {
  await ordersCol(uid).doc(String(orderId).slice(0, 64)).update({ printedAt: "", printedBy: "" });
}
