import "server-only";
import { unstable_cache } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { restaurantTag } from "./restaurants";
import { isPubliclyVisible } from "../subscription";
import type { Analytics, DailyViews } from "../types";

export type ViewSource = "qr" | "direct" | "link";
export type Device = "mobile" | "tablet" | "desktop";

const TZ = "Africa/Kigali";

/** YYYY-MM-DD and hour (0-23) in Kigali time. */
export function kigaliParts(date = new Date()): { day: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) % 24 };
}

/** Owner uid for a publicly visible restaurant, or null. Cached with the page's tag. */
function visibleRestaurantId(slug: string): Promise<string | null> {
  return unstable_cache(
    async () => {
      const db = adminDb();
      const snap = await db.collection("restaurants").where("slug", "==", slug).limit(1).get();
      if (snap.empty) return null;
      const companyId = snap.docs[0].get("companyId");
      if (!companyId) return null;
      const c = (await db.collection("companies").doc(companyId).get()).data();
      return isPubliclyVisible({ status: c?.status, subscriptionEnd: c?.subscriptionEnd, trialEndsAt: c?.trialEndsAt })
        ? snap.docs[0].id
        : null;
    },
    ["restaurant-id", slug],
    { tags: [restaurantTag(slug)], revalidate: 3600 }
  )();
}

const days = (uid: string) => adminDb().collection("analytics").doc(uid).collection("days");

/* ---------- Recording views in batches ----------
 * Each view used to cost two database writes. Views are now collected for a couple of seconds on
 * each server and saved together: about two writes per restaurant per batch, however many guests
 * are browsing. That keeps the free daily write allowance and busy restaurants' counters safe.
 */

interface PendingViews {
  slug: string;
  day: string;
  views: number;
  unique: number;
  qr: number;
  sources: Record<string, number>;
  devices: Record<string, number>;
  hours: Record<string, number>;
}

const FLUSH_MS = 2_000;
const pending = new Map<string, PendingViews>();
let scheduled: Promise<void> | null = null;

const bump = (m: Record<string, number>, k: string) => (m[k] = (m[k] ?? 0) + 1);

/**
 * Counts one anonymous page view. Resolves once it is saved (call it from `after()` so the guest
 * never waits). Unknown or offline pages are ignored when the batch is saved.
 */
export function queueView(slug: string, v: { source: ViewSource; unique: boolean; device: Device }): Promise<void> {
  const { day, hour } = kigaliParts();
  const key = `${slug}|${day}`;
  const p = pending.get(key) ?? { slug, day, views: 0, unique: 0, qr: 0, sources: {}, devices: {}, hours: {} };
  p.views++;
  if (v.unique) p.unique++;
  if (v.source === "qr") p.qr++;
  bump(p.sources, v.source);
  bump(p.devices, v.device);
  bump(p.hours, String(hour));
  pending.set(key, p);

  // One save per couple of seconds; views arriving while it runs go into the next one.
  scheduled ??= new Promise<void>((resolve) =>
    setTimeout(() => {
      scheduled = null;
      flushViews()
        .catch((err) => console.error("saving views failed", err))
        .finally(resolve);
    }, FLUSH_MS)
  );
  return scheduled;
}

async function flushViews() {
  const batch = [...pending.values()];
  pending.clear();
  if (!batch.length) return;
  const db = adminDb();
  const write = db.batch();
  let ops = 0;
  const now = new Date().toISOString();
  for (const p of batch) {
    const uid = await visibleRestaurantId(p.slug);
    if (!uid) continue;
    const inc = (n: number) => FieldValue.increment(n);
    const map = (m: Record<string, number>) => Object.fromEntries(Object.entries(m).map(([k, n]) => [k, inc(n)]));
    write.set(
      days(uid).doc(p.day),
      { date: p.day, views: inc(p.views), ...(p.unique ? { unique: inc(p.unique) } : {}), sources: map(p.sources), devices: map(p.devices), hours: map(p.hours) },
      { merge: true }
    );
    // The summary also keeps today's count, so MasterAdmin reads one small record per restaurant.
    write.set(
      db.collection("analytics").doc(uid),
      { total: inc(p.views), lastViewAt: now, ...(p.qr ? { qrTotal: inc(p.qr) } : {}), daily: { [p.day]: inc(p.views) } },
      { merge: true }
    );
    ops += 2;
  }
  if (ops) await write.commit();
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Day records from `from` up to (not including) `today`, cached until the next day or 6 hours. */
function pastDays(uid: string, from: string, today: string): Promise<Record<string, Record<string, unknown>>> {
  return unstable_cache(
    async () => {
      const snap = await days(uid).where("date", ">=", from).where("date", "<", today).get();
      return Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
    },
    ["analytics-past", uid, today],
    { revalidate: 6 * 3600 }
  )();
}

export async function getAnalytics(uid: string): Promise<Analytics> {
  // 60 days so "this week" can be compared with the week before, with room to spare.
  const dates: string[] = [];
  for (let i = 59; i >= 0; i--) dates.push(kigaliParts(new Date(Date.now() - i * 86_400_000)).day);
  const unique = [...new Set(dates)];

  const today = unique[unique.length - 1];
  // Earlier days never change: read them once a day (cached). Each refresh reads only today and the totals.
  const [past, todayDoc, totals] = await Promise.all([
    pastDays(uid, unique[0], today),
    days(uid).doc(today).get(),
    adminDb().collection("analytics").doc(uid).get(),
  ]);
  const byDate = new Map<string, Record<string, unknown>>(Object.entries(past));
  if (todayDoc.exists) byDate.set(today, todayDoc.data() as Record<string, unknown>);

  const series: DailyViews[] = unique.map((date) => {
    const d = byDate.get(date);
    return { date, views: num(d?.views), unique: num(d?.unique) };
  });
  const last30Docs = unique.slice(-30).map((date) => byDate.get(date)).filter(Boolean) as Record<string, Record<string, number>>[];

  const sum = (from: number, to: number, key: "views" | "unique" = "views") =>
    series.slice(series.length - from, series.length - to).reduce((n, d) => n + d[key], 0);

  const hours = Array.from({ length: 24 }, (_, h) => last30Docs.reduce((n, d) => n + num(d.hours?.[String(h)]), 0));
  const bucket = <K extends string>(field: string, keys: K[]) =>
    Object.fromEntries(keys.map((k) => [k, last30Docs.reduce((n, d) => n + num(d[field]?.[k]), 0)])) as Record<K, number>;

  return {
    days: series.slice(-30),
    today: series[series.length - 1].views,
    last7: sum(7, 0),
    prev7: sum(14, 7),
    last30: sum(30, 0),
    unique7: sum(7, 0, "unique"),
    sources: bucket("sources", ["qr", "direct", "link"]),
    devices: bucket("devices", ["mobile", "tablet", "desktop"]),
    hours,
    allTime: num(totals.get("total")),
  };
}

export interface ViewCount {
  /** Every counted visit since the page went live. */
  total: number;
  today: number;
  /** Visits that came from scanning the QR code. */
  qr: number;
  lastViewAt: string;
}

/**
 * Visit counters for every business, by company id (MasterAdmin cards). Reads one summary document
 * per restaurant plus today's; a QR total missing from older records is filled in once from history.
 */
export function adminViewCounts(): Promise<Record<string, ViewCount>> {
  // Shared by every open MasterAdmin page for 30 seconds.
  return unstable_cache(loadAdminViewCounts, ["admin-view-counts"], { revalidate: 30 })();
}

async function loadAdminViewCounts(): Promise<Record<string, ViewCount>> {
  const db = adminDb();
  const restaurants = await restaurantCompanies();
  if (!restaurants.length) return {};
  const { day } = kigaliParts();
  const roots = await db.getAll(...restaurants.map((r) => db.collection("analytics").doc(r.uid)));
  const out: Record<string, ViewCount> = {};
  await Promise.all(
    restaurants.map(async (r, i) => {
      const root = roots[i];
      let qr = num(root.get("qrTotal"));
      let today = num((root.get("daily") ?? {})[day]);
      // Older records (before the summary kept these): fill them in once from the day records.
      if (root.exists && (root.get("qrTotal") === undefined || root.get("daily") === undefined)) {
        const history = await days(r.uid).select("sources", "views").get();
        qr = history.docs.reduce((n, d) => n + num((d.get("sources") ?? {}).qr), 0);
        const daily = Object.fromEntries(history.docs.map((d) => [d.id, num(d.get("views"))]));
        today = num(daily[day]);
        await root.ref.set({ qrTotal: qr, daily }, { merge: true });
      }
      out[r.companyId] = { total: num(root.get("total")), today, qr, lastViewAt: typeof root.get("lastViewAt") === "string" ? root.get("lastViewAt") : "" };
    })
  );
  return out;
}

/** Which restaurant belongs to which company (changes rarely; cached 10 minutes). */
const restaurantCompanies = unstable_cache(
  async () =>
    (await adminDb().collection("restaurants").select("companyId").get()).docs
      .filter((r) => typeof r.get("companyId") === "string")
      .map((r) => ({ uid: r.id, companyId: r.get("companyId") as string })),
  ["restaurant-companies"],
  { revalidate: 600 }
);
