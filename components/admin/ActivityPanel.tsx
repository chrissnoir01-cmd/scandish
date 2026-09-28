"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Headset,
  KeyRound,
  LogIn,
  Monitor,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Store,
  Tablet,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { listActivity } from "@/app/actions/admin";
import { getIdToken } from "@/lib/firebase";
import type { ActivityCategory, ActivityEvent, ActivityType } from "@/lib/types";

type Filter = "all" | ActivityCategory;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "auth", label: "Sign-ins & signups" },
  { id: "restaurant", label: "Restaurants" },
  { id: "admin", label: "Admin actions" },
  { id: "support", label: "Support team" },
  { id: "security", label: "Security" },
];

const ICONS: Record<ActivityType, LucideIcon> = {
  "auth.login": LogIn,
  "auth.admin_login": LogIn,
  "auth.login_failed": AlertTriangle,
  "auth.signup": UserPlus,
  "auth.signup_failed": AlertTriangle,
  "restaurant.saved": Store,
  "restaurant.upload": Store,
  "admin.company_created": Building2,
  "admin.status_changed": Building2,
  "admin.renewed": Building2,
  "admin.premium_changed": Building2,
  "admin.company_deleted": Building2,
  "admin.support_created": Headset,
  "admin.support_suspended": Headset,
  "admin.support_deactivated": Headset,
  "admin.support_reactivated": Headset,
  "support.signup": UserPlus,
  "support.login": LogIn,
  "support.business_created": Headset,
  "support.password_reissued": KeyRound,
  "restaurant.password_set": KeyRound,
  "security.unauthorized": ShieldAlert,
};

const TONE: Record<ActivityCategory, string> = {
  auth: "bg-blue-50 text-blue-700",
  restaurant: "bg-[#fff1ec] text-[#c2553a]",
  admin: "bg-gray-100 text-gray-700",
  support: "bg-violet-50 text-violet-700",
  security: "bg-red-50 text-red-700",
};

const DEVICE_ICON: Record<string, LucideIcon> = { mobile: Smartphone, tablet: Tablet, desktop: Monitor };

const kigali = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Kigali", ...opts });
const dayKey = (iso: string) => kigali(iso, { year: "numeric", month: "2-digit", day: "2-digit" });

function relative(iso: string, now: number): string {
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return kigali(iso, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ActivityPanel() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(0);

  const apply = useCallback((res: Awaited<ReturnType<typeof listActivity>>, before?: string) => {
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setError("");
    setNow(Date.now());
    setEvents((prev) => (before ? [...prev, ...res.data] : res.data));
    setHasMore(res.data.length === 100);
  }, []);

  const load = async (before?: string) => {
    setLoading(true);
    apply(await listActivity(await getIdToken(), before), before);
  };

  useEffect(() => {
    getIdToken()
      .then((t) => listActivity(t))
      .then((res) => apply(res));
  }, [apply]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter(
      (e) =>
        (filter === "all" || e.category === filter) &&
        (!q || [e.message, e.actorEmail, e.targetName, e.ip].some((v) => v.toLowerCase().includes(q)))
    );
  }, [events, filter, search]);

  const today = now ? dayKey(new Date(now).toISOString()) : "";
  const todays = events.filter((e) => dayKey(e.createdAt) === today);
  const stats: [string, number][] = [
    ["Events today", todays.length],
    ["Sign-ins today", todays.filter((e) => e.type === "auth.login" || e.type === "auth.admin_login").length],
    ["Menus published today", todays.filter((e) => e.type === "restaurant.saved").length],
    ["Security alerts today", todays.filter((e) => e.category === "security").length],
  ];

  const groups = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>();
    for (const e of visible) {
      const k = dayKey(e.createdAt);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()];
  }, [visible]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-[#f2ddd6] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`mt-2 text-3xl font-bold ${label.startsWith("Security") && value > 0 ? "text-red-600" : ""}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-[#f2ddd6] bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold">System activity</h2>
            <p className="text-sm text-gray-500">Everything that happens on ScanDish, newest first · Kigali time</p>
          </div>
          <div className="flex gap-2">
            <input
              placeholder="Search email, restaurant, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-[#efd6ce] px-4 py-2 text-sm outline-none focus:border-[#f08c6c] lg:w-72"
            />
            <button
              onClick={() => load()}
              disabled={loading}
              aria-label="Refresh"
              className="rounded-2xl border border-[#efd6ce] px-3 text-[#f08c6c] disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                filter === f.id ? "bg-[#f08c6c] text-white" : "bg-[#fff8f5] text-gray-600 hover:bg-[#fdeee8]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {!loading && visible.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-500">
            {events.length === 0
              ? "No activity recorded yet. Events appear here as soon as people sign in, publish menus, or you manage companies."
              : "No events match this filter."}
          </p>
        )}

        <div className="space-y-6">
          {groups.map(([day, list]) => (
            <div key={day}>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                {day === today ? "Today" : kigali(list[0].createdAt, { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <ul className="divide-y divide-[#f7ebe6] rounded-2xl border border-[#f7ebe6]">
                {list.map((e) => {
                  const Icon = ICONS[e.type] ?? Store;
                  const DeviceIcon = DEVICE_ICON[e.device];
                  return (
                    <li key={e.id} className="flex gap-3 p-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONE[e.category]}`}>
                        <Icon size={16} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-900">{e.message}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-gray-400">
                          <span title={kigali(e.createdAt, { dateStyle: "full", timeStyle: "medium" })}>{relative(e.createdAt, now)}</span>
                          {e.actorEmail && <span>{e.actorEmail}</span>}
                          {e.ip && <span>IP {e.ip}</span>}
                          {DeviceIcon && (
                            <span className="inline-flex items-center gap-1">
                              <DeviceIcon size={12} aria-hidden /> {e.device}
                            </span>
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {hasMore && events.length > 0 && (
          <button
            onClick={() => load(events[events.length - 1].createdAt)}
            disabled={loading}
            className="mt-6 w-full rounded-2xl border border-[#efd6ce] py-3 text-sm font-semibold text-gray-600 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load older activity"}
          </button>
        )}
      </div>
    </div>
  );
}
