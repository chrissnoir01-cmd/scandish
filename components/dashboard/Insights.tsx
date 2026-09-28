"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, ChevronRight, Loader2, Minus, RefreshCw } from "lucide-react";
import type { Analytics } from "@/lib/types";

// Chart marks use a darker brand step: #f08c6c is only 2.4:1 on white, #d9694a clears 3:1.
const MARK = "#d9694a";
const TRACK = "#fbe9e3";
const GRID = "#f1e4df";

const fmt = (n: number) => n.toLocaleString("en-US");
const dayLabel = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", opts);

function weekChange(a: Analytics): { pct: number | null; dir: "up" | "down" | "flat" } {
  if (a.prev7 === 0) return { pct: null, dir: a.last7 > 0 ? "up" : "flat" };
  const pct = Math.round(((a.last7 - a.prev7) / a.prev7) * 100);
  return { pct, dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
}

function Delta({ a }: { a: Analytics }) {
  const { pct, dir } = weekChange(a);
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  const color = dir === "up" ? "text-green-700" : dir === "down" ? "text-red-600" : "text-gray-500";
  const text = pct === null ? (dir === "up" ? "New this week" : "No change") : `${pct > 0 ? "+" : ""}${pct}% vs previous 7 days`;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
      <Icon size={14} aria-hidden /> {text}
    </span>
  );
}

/* ---------- Sidebar card ---------- */

export function ViewsCard({
  analytics,
  loading,
  onOpen,
}: {
  analytics: Analytics | null;
  loading: boolean;
  onOpen: () => void;
}) {
  const week = analytics?.days.slice(-7) ?? [];
  const max = Math.max(1, ...week.map((d) => d.views));

  return (
    <div className="rounded-[2.5rem] border border-[#f4d4ca] bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Menu views</span>
        <BarChart3 size={16} className="text-[#f08c6c]" aria-hidden />
      </div>

      {loading && !analytics ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="animate-spin text-[#f08c6c]" size={20} />
        </div>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500">Today</p>
              <p className="text-2xl font-black">{fmt(analytics.today)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Last 7 days</p>
              <p className="text-2xl font-black">{fmt(analytics.last7)}</p>
            </div>
          </div>
          <div className="mt-1">
            <Delta a={analytics} />
          </div>

          {/* 7-day mini columns */}
          <div className="mt-4 flex h-12 items-end gap-[2px]" role="img" aria-label={`Views over the last 7 days: ${week.map((d) => d.views).join(", ")}`}>
            {week.map((d) => (
              <div key={d.date} className="flex-1" title={`${dayLabel(d.date, { weekday: "short", day: "numeric", month: "short" })}: ${fmt(d.views)} views`}>
                <div
                  className="mx-auto w-full max-w-[18px] rounded-t-[4px]"
                  style={{ height: `${Math.max(2, (d.views / max) * 48)}px`, backgroundColor: d.views ? MARK : TRACK }}
                />
              </div>
            ))}
          </div>

          <button onClick={onOpen} className="mt-4 flex w-full items-center justify-center gap-1 text-xs font-black uppercase tracking-widest text-[#f08c6c]">
            See insights <ChevronRight size={14} />
          </button>
        </>
      ) : (
        <p className="text-xs text-gray-400">Views are unavailable right now.</p>
      )}
    </div>
  );
}

/* ---------- Column chart (single series) ---------- */

interface Column {
  key: string;
  value: number;
  label: string; // tooltip title
  detail?: string; // tooltip second line
  tick?: string; // x-axis label (shown only when set)
}

function niceMax(n: number): number {
  if (n <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(n));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow * 4 >= n)! * pow;
  return step * 4;
}

function Columns({ data, height = 180, unit = "views" }: { data: Column[]; height?: number; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const top = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [0, top / 2, top];
  const W = 600;
  const PAD_L = 36;
  const PAD_B = 22;
  const plotW = W - PAD_L;
  const plotH = height - PAD_B;
  const slot = plotW / data.length;
  const barW = Math.min(24, Math.max(4, slot - 2)); // capped width; 2px surface gap between touching bars
  const y = (v: number) => plotH - (v / top) * plotH;

  const bar = (x: number, v: number) => {
    const h = Math.max(v > 0 ? 2 : 0, plotH - y(v));
    const r = Math.min(4, h, barW / 2);
    const yTop = plotH - h;
    // Rounded data end, square at the baseline.
    return `M${x},${plotH} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${plotH} Z`;
  };

  const hovered = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={`Column chart of ${unit}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} x2={W} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={PAD_L - 6} y={y(t) + 4} textAnchor="end" className="fill-gray-400" fontSize="11" style={{ fontVariantNumeric: "tabular-nums" }}>
              {fmt(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = PAD_L + i * slot + (slot - barW) / 2;
          return (
            <g key={d.key}>
              {d.value > 0 && <path d={bar(x, d.value)} fill={MARK} opacity={hover === null || hover === i ? 1 : 0.45} />}
              {d.tick && (
                <text x={x + barW / 2} y={height - 6} textAnchor="middle" className="fill-gray-400" fontSize="11">
                  {d.tick}
                </text>
              )}
              {/* Hit target: the whole slot, taller than the mark. */}
              <rect
                x={PAD_L + i * slot}
                y={0}
                width={slot}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onTouchStart={() => setHover(i)}
              />
            </g>
          );
        })}
      </svg>

      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: `${((PAD_L + (hover + 0.5) * slot) / W) * 100}%` }}
        >
          <p className="font-semibold text-gray-900">{hovered.label}</p>
          <p className="text-gray-600">
            <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: MARK }} />
            {fmt(hovered.value)} {unit}
          </p>
          {hovered.detail && <p className="text-gray-400">{hovered.detail}</p>}
        </div>
      )}
    </div>
  );
}

/* ---------- Share bars (meter style) ---------- */

function ShareBars({ rows }: { rows: { label: string; value: number; hint?: string }[] }) {
  const total = rows.reduce((n, r) => n + r.value, 0);
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const pct = total ? Math.round((r.value / total) * 100) : 0;
        return (
          <li key={r.label}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-semibold text-gray-700">
                {r.label}
                {r.hint && <span className="ml-1 text-xs font-normal text-gray-400">{r.hint}</span>}
              </span>
              <span className="text-gray-500" style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmt(r.value)} · {pct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: MARK }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Insights tab ---------- */

function StatTile({ label, value, children }: { label: string; value: number; children?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-[#f4d4ca] bg-white p-5">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-gray-900">{fmt(value)}</p>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}

export function InsightsPanel({
  analytics,
  loading,
  onRefresh,
}: {
  analytics: Analytics | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [asTable, setAsTable] = useState(false);

  if (!analytics) {
    return (
      <div className="flex h-64 items-center justify-center rounded-3xl border border-[#f4d4ca] bg-white">
        {loading ? <Loader2 className="animate-spin text-[#f08c6c]" /> : <p className="text-sm text-gray-500">Views are unavailable right now.</p>}
      </div>
    );
  }

  const a = analytics;
  const empty = a.allTime === 0;
  const daily: Column[] = a.days.map((d, i) => ({
    key: d.date,
    value: d.views,
    label: dayLabel(d.date, { weekday: "short", day: "numeric", month: "short" }),
    detail: `${fmt(d.unique)} unique visitor${d.unique === 1 ? "" : "s"}`,
    tick: i === 0 || i === a.days.length - 1 || i === 14 ? dayLabel(d.date) : undefined,
  }));
  const peak = a.hours.indexOf(Math.max(...a.hours));
  const hourName = (h: number) => `${String(h).padStart(2, "0")}:00`;
  const hourly: Column[] = a.hours.map((v, h) => ({
    key: String(h),
    value: v,
    label: `${hourName(h)} – ${hourName((h + 1) % 24)}`,
    tick: h % 6 === 0 ? hourName(h) : undefined,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Menu insights</h2>
          <p className="text-sm text-gray-500">Visits to your public menu page. Anonymous — no personal data is collected.</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-[#f4d4ca] bg-white px-3 py-2 text-sm font-bold text-[#f08c6c] disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {empty && (
        <div className="rounded-3xl border border-[#f4d4ca] bg-[#fff8f5] p-5 text-sm text-gray-600">
          No visits recorded yet. Views are counted from now on — print your QR code from the panel on the right and
          place it on your tables to start seeing numbers here.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Today" value={a.today} />
        <StatTile label="Last 7 days" value={a.last7}>
          <Delta a={a} />
        </StatTile>
        <StatTile label="Last 30 days" value={a.last30} />
        <StatTile label="Unique visitors (7 days)" value={a.unique7} />
      </div>

      <section className="rounded-3xl border border-[#f4d4ca] bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Daily views</h3>
            <p className="text-xs text-gray-500">Last 30 days · Kigali time</p>
          </div>
          <button onClick={() => setAsTable(!asTable)} className="text-xs font-bold text-[#f08c6c]">
            {asTable ? "Show chart" : "Show table"}
          </button>
        </div>
        {asTable ? (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left text-xs text-gray-500">
                <tr>
                  <th className="py-2 font-semibold">Date</th>
                  <th className="py-2 text-right font-semibold">Views</th>
                  <th className="py-2 text-right font-semibold">Unique</th>
                </tr>
              </thead>
              <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
                {[...a.days].reverse().map((d) => (
                  <tr key={d.date} className="border-t border-gray-50">
                    <td className="py-2 text-gray-700">{dayLabel(d.date, { weekday: "short", day: "numeric", month: "short" })}</td>
                    <td className="py-2 text-right text-gray-900">{fmt(d.views)}</td>
                    <td className="py-2 text-right text-gray-500">{fmt(d.unique)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Columns data={daily} />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-[#f4d4ca] bg-white p-6">
          <h3 className="font-bold text-gray-900">How people arrive</h3>
          <p className="mb-4 text-xs text-gray-500">Last 30 days</p>
          <ShareBars
            rows={[
              { label: "QR code", value: a.sources.qr, hint: "new QR downloads" },
              { label: "Direct", value: a.sources.direct, hint: "incl. older printed QR codes" },
              { label: "Shared links", value: a.sources.link, hint: "WhatsApp, social, search" },
            ]}
          />
        </section>
        <section className="rounded-3xl border border-[#f4d4ca] bg-white p-6">
          <h3 className="font-bold text-gray-900">Devices</h3>
          <p className="mb-4 text-xs text-gray-500">Last 30 days</p>
          <ShareBars
            rows={[
              { label: "Mobile", value: a.devices.mobile },
              { label: "Tablet", value: a.devices.tablet },
              { label: "Desktop", value: a.devices.desktop },
            ]}
          />
        </section>
      </div>

      <section className="rounded-3xl border border-[#f4d4ca] bg-white p-6">
        <h3 className="font-bold text-gray-900">Busiest hours</h3>
        <p className="mb-4 text-xs text-gray-500">
          Last 30 days · Kigali time{a.hours[peak] > 0 && ` · peak ${hourName(peak)}–${hourName((peak + 1) % 24)}`}
        </p>
        <Columns data={hourly} height={150} />
      </section>

      <p className="text-center text-xs text-gray-400">All-time views: {fmt(a.allTime)}</p>
    </div>
  );
}
