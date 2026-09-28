"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { listAccounts } from "@/app/actions/admin";
import { getIdToken } from "@/lib/firebase";
import type { AccountSummary } from "@/lib/types";

const when = (iso: string) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Kigali", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

const ROLE_STYLE: Record<AccountSummary["role"], string> = {
  admin: "bg-gray-900 text-white",
  support: "bg-violet-50 text-violet-700",
  restaurant: "bg-[#fff1ec] text-[#c2553a]",
  unknown: "bg-gray-100 text-gray-500",
};

/** Live list of every login account, read from Firebase Auth. */
export default function AccountsPanel() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [loadedAt, setLoadedAt] = useState(0);

  const apply = useCallback((res: Awaited<ReturnType<typeof listAccounts>>) => {
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setAccounts(res.data);
    setLoadedAt(Date.now());
    setError("");
  }, []);

  const load = async () => {
    setLoading(true);
    apply(await listAccounts(await getIdToken()));
  };

  useEffect(() => {
    getIdToken()
      .then((t) => listAccounts(t))
      .then(apply);
  }, [apply]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => !q || [a.email, a.restaurantName, a.slug].some((v) => v.toLowerCase().includes(q)));
  }, [accounts, search]);

  const weekAgo = loadedAt - 7 * 86_400_000;
  const activeThisWeek = accounts.filter((a) => {
    const t = a.lastActiveAt || a.lastSignInAt;
    return t && new Date(t).getTime() > weekAgo;
  }).length;

  return (
    <div className="rounded-3xl border border-[#f2ddd6] bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold">Accounts</h2>
          <p className="text-sm text-gray-500">
            {accounts.length} login accounts · {activeThisWeek} active in the last 7 days · live from Firebase Auth
          </p>
        </div>
        <div className="flex gap-2">
          <input
            placeholder="Search email or restaurant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-[#efd6ce] px-4 py-2 text-sm outline-none focus:border-[#f08c6c] lg:w-72"
          />
          <button onClick={load} disabled={loading} aria-label="Refresh" className="rounded-2xl border border-[#efd6ce] px-3 text-[#f08c6c] disabled:opacity-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs text-gray-500">
            <tr>
              <th className="pb-3 font-semibold">Account</th>
              <th className="pb-3 font-semibold">Role</th>
              <th className="pb-3 font-semibold">Email verified</th>
              <th className="pb-3 font-semibold">Created</th>
              <th className="pb-3 font-semibold">Last sign-in</th>
              <th className="pb-3 font-semibold">Last active</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((a) => (
              <tr key={a.uid} className="border-t border-[#f7ebe6] align-top">
                <td className="py-3 pr-4">
                  <p className="font-semibold text-gray-900">{a.email || a.uid}</p>
                  {a.restaurantName && (
                    <p className="text-xs text-gray-500">
                      {a.restaurantName}
                      {a.slug && (
                        <a href={`/r/${a.slug}`} target="_blank" rel="noreferrer" className="ml-1 text-[#f08c6c]">
                          /r/{a.slug}
                        </a>
                      )}
                    </p>
                  )}
                  {a.disabled && <p className="text-xs font-semibold text-red-600">Disabled</p>}
                </td>
                <td className="py-3 pr-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_STYLE[a.role]}`}>{a.role}</span>
                </td>
                <td className="py-3 pr-4">
                  {a.emailVerified ? (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <CheckCircle2 size={14} aria-hidden /> Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <XCircle size={14} aria-hidden /> No
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 text-gray-600">{when(a.createdAt)}</td>
                <td className="py-3 pr-4 text-gray-600">{when(a.lastSignInAt)}</td>
                <td className="py-3 text-gray-600">{when(a.lastActiveAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && visible.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No accounts found.</p>}
      </div>
    </div>
  );
}
