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

/** Adds one anonymous page view to the day's counters. Returns false for unknown/offline pages. */
export async function recordView(slug: string, v: { source: ViewSource; unique: boolean; device: Device }): Promise<boolean> {
  const uid = await visibleRestaurantId(slug);
  if (!uid) return false;

  const { day, hour } = kigaliParts();
  const inc = FieldValue.increment(1);
  const batch = adminDb().batch();
  batch.set(
    days(uid).doc(day),
    {
      date: day,
      views: inc,
      ...(v.unique ? { unique: inc } : {}),
      sources: { [v.source]: inc },
      devices: { [v.device]: inc },
      hours: { [String(hour)]: inc },
    },
    { merge: true }
  );
  batch.set(
    adminDb().collection("analytics").doc(uid),
    { total: inc, lastViewAt: new Date().toISOString(), ...(v.source === "qr" ? { qrTotal: inc } : {}) },
    { merge: true }
  );
  await batch.commit();
  return true;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export async function getAnalytics(uid: string): Promise<Analytics> {
  // 60 days so "this week" can be compared with the week before, with room to spare.
  const dates: string[] = [];
  for (let i = 59; i >= 0; i--) dates.push(kigaliParts(new Date(Date.now() - i * 86_400_000)).day);
  const unique = [...new Set(dates)];

  const [snap, totals] = await Promise.all([
    days(uid).where("date", ">=", unique[0]).get(),
    adminDb().collection("analytics").doc(uid).get(),
  ]);
  const byDate = new Map(snap.docs.map((d) => [d.id, d.data()]));

  const series: DailyViews[] = unique.map((date) => {
    const d = byDate.get(date);
    return { date, views: num(d?.views), unique: num(d?.unique) };
  });
  const last30Docs = unique.slice(-30).map((date) => byDate.get(date)).filter(Boolean) as Record<string, Record<string, unknown>>[];

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
export async function adminViewCounts(): Promise<Record<string, ViewCount>> {
  const db = adminDb();
  const restaurants = (await db.collection("restaurants").select("companyId").get()).docs.filter((r) => typeof r.get("companyId") === "string");
  if (!restaurants.length) return {};
  const { day } = kigaliParts();
  const [roots, todays] = await Promise.all([
    db.getAll(...restaurants.map((r) => db.collection("analytics").doc(r.id))),
    db.getAll(...restaurants.map((r) => days(r.id).doc(day))),
  ]);
  const out: Record<string, ViewCount> = {};
  await Promise.all(
    restaurants.map(async (r, i) => {
      const root = roots[i];
      let qr = num(root.get("qrTotal"));
      if (root.exists && root.get("qrTotal") === undefined) {
        const history = await days(r.id).select("sources").get();
        qr = history.docs.reduce((n, d) => n + num((d.get("sources") ?? {}).qr), 0);
        await root.ref.set({ qrTotal: qr }, { merge: true });
      }
      out[r.get("companyId") as string] = {
        total: num(root.get("total")),
        today: num(todays[i].get("views")),
        qr,
        lastViewAt: typeof root.get("lastViewAt") === "string" ? root.get("lastViewAt") : "",
      };
    })
  );
  return out;
}
