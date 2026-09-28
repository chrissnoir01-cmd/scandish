"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { createSupportAgent, listSupportAgents, setSupportAgentStatus } from "@/app/actions/admin";
import { getIdToken } from "@/lib/firebase";
import { formatRwf } from "@/lib/brand";
import type { AgentStatus, SupportAgent } from "@/lib/types";

const input = "w-full rounded-2xl border border-[#efd6ce] bg-white px-4 py-3 outline-none focus:border-[#f08c6c]";

const STATUS: Record<AgentStatus, string> = {
  invited: "bg-amber-50 text-amber-800",
  active: "bg-green-50 text-green-700",
  suspended: "bg-orange-50 text-orange-700",
  deactivated: "bg-red-50 text-red-700",
};

const date = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { timeZone: "Africa/Kigali", day: "numeric", month: "short", year: "numeric" }) : "—";

type Pending = { agent: SupportAgent; action: "suspend" | "deactivate" | "reactivate" };

export default function SupportTeamPanel() {
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [creating, setCreating] = useState(false);
  const [invite, setInvite] = useState<{ name: string; email: string; code: string } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const apply = useCallback((res: Awaited<ReturnType<typeof listSupportAgents>>) => {
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setError("");
    setAgents(res.data);
  }, []);

  const load = async () => {
    setLoading(true);
    apply(await listSupportAgents(await getIdToken()));
  };

  useEffect(() => {
    getIdToken()
      .then((t) => listSupportAgents(t))
      .then(apply);
  }, [apply]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await createSupportAgent(await getIdToken(), form);
      if (!res.ok) return alert(res.error);
      setInvite({ name: form.name, email: form.email, code: res.data.inviteCode });
      setForm({ name: "", email: "", phone: "", notes: "" });
      await load();
    } finally {
      setCreating(false);
    }
  };

  const totals = {
    members: agents.filter((a) => a.status !== "deactivated").length,
    businesses: agents.reduce((n, a) => n + a.businesses, 0),
    live: agents.reduce((n, a) => n + a.liveBusinesses, 0),
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form onSubmit={create} className="h-fit rounded-3xl border border-[#f2ddd6] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Invite a support member</h2>
        <p className="mt-1 text-sm text-gray-500">They get an invite code, create their own password, and must accept the Support Team Agreement.</p>
        <div className="mt-4 space-y-3">
          <input className={input} placeholder="Full name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={input} type="email" placeholder="Email * (their login)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={input} placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <textarea className={`${input} min-h-20`} placeholder="Notes (area, ID number…)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button type="submit" disabled={creating} className="w-full rounded-2xl bg-[#f08c6c] py-3 font-semibold text-white disabled:opacity-50">
            {creating ? "Creating..." : "Create invite"}
          </button>
        </div>
        <a href="/support/agreement" target="_blank" className="mt-4 block text-center text-sm font-semibold text-[#d9694a]">
          Read the Support Team Agreement
        </a>
      </form>

      <div className="rounded-3xl border border-[#f2ddd6] bg-white p-6 shadow-sm lg:col-span-2">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Support team</h2>
            <p className="text-sm text-gray-500">
              {totals.members} members · {totals.businesses} businesses onboarded · {totals.live} live
            </p>
          </div>
          <button onClick={load} disabled={loading} aria-label="Refresh" className="rounded-2xl border border-[#efd6ce] p-2.5 text-[#f08c6c] disabled:opacity-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!loading && agents.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No support members yet.</p>}

        <ul className="space-y-3">
          {agents.map((a) => (
            <li key={a.id} className="rounded-3xl border border-[#f2ddd6] bg-[#fffdfb] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold">{a.name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS[a.status]}`}>{a.status}</span>
                  </div>
                  <p className="text-sm text-gray-500">{a.email} · {a.phone}</p>
                  {a.status === "invited" && (
                    <p className="mt-1 text-sm">
                      Invite code: <span className="font-mono font-semibold">{a.inviteCode}</span>
                    </p>
                  )}
                  {a.agreementAcceptedAt && <p className="mt-1 text-xs text-gray-400">Agreement accepted {date(a.agreementAcceptedAt)} (v{a.agreementVersion})</p>}
                  {(a.status === "suspended" || a.status === "deactivated") && a.statusReason && (
                    <p className="mt-2 rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-800">
                      {a.status === "suspended" ? `Suspended ${a.suspendedUntil ? `until ${date(a.suspendedUntil)}` : "until lifted"}` : "Deactivated"}: {a.statusReason}
                    </p>
                  )}
                  {a.notes && <p className="mt-1 text-xs text-gray-400">Notes: {a.notes}</p>}
                </div>
                <div className="text-sm md:text-right">
                  <p><span className="font-bold">{a.businesses}</span> onboarded · <span className="font-bold">{a.liveBusinesses}</span> live</p>
                  <p className="text-gray-500">Setup fees: {formatRwf(a.setupEarnings)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {a.status === "active" && (
                  <>
                    <button onClick={() => setPending({ agent: a, action: "suspend" })} className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white">Suspend</button>
                    <button onClick={() => setPending({ agent: a, action: "deactivate" })} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white">Deactivate</button>
                  </>
                )}
                {a.status === "invited" && (
                  <button onClick={() => setPending({ agent: a, action: "deactivate" })} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white">Cancel invite</button>
                )}
                {(a.status === "suspended" || a.status === "deactivated") && (
                  <>
                    <button onClick={() => setPending({ agent: a, action: "reactivate" })} className="rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white">Reactivate</button>
                    {a.status === "suspended" && (
                      <button onClick={() => setPending({ agent: a, action: "deactivate" })} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white">Deactivate</button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {invite && (
        <Dialog title="Support member invited">
          <p className="mt-2 text-sm text-gray-600">
            Send this code to <strong>{invite.name}</strong>. They sign up at <strong>/support/signup</strong> with <strong>{invite.email}</strong>.
          </p>
          <p className="mt-4 rounded-2xl bg-[#fff8f5] p-4 text-center font-mono text-2xl font-bold tracking-widest">{invite.code}</p>
          <div className="mt-5 flex gap-3">
            <button onClick={() => navigator.clipboard?.writeText(invite.code)} className="flex-1 rounded-2xl bg-[#f08c6c] py-3 font-semibold text-white">Copy code</button>
            <button onClick={() => setInvite(null)} className="flex-1 rounded-2xl border border-[#efd6ce] py-3 font-semibold">Close</button>
          </div>
        </Dialog>
      )}

      {pending && <StatusDialog pending={pending} onClose={() => setPending(null)} onDone={load} />}
    </div>
  );
}

function StatusDialog({ pending, onClose, onDone }: { pending: Pending; onClose: () => void; onDone: () => Promise<void> }) {
  const { agent, action } = pending;
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const needsConfirm = action === "deactivate";
  const title = { suspend: `Suspend ${agent.name}`, deactivate: `Deactivate ${agent.name}`, reactivate: `Reactivate ${agent.name}` }[action];

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await setSupportAgentStatus(await getIdToken(), agent.id, { action, reason, until: until || undefined });
      if (!res.ok) return setError(res.error);
      await onDone();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={title}>
      <p className="mt-2 text-sm text-gray-600">
        {action === "suspend" &&
          "They can still sign in to read the reason and their agreement, but cannot create businesses or issue passwords."}
        {action === "deactivate" && "They will be signed out and can no longer sign in. Businesses they onboarded are not affected."}
        {action === "reactivate" && "They regain full access to the Support Team Portal."}
      </p>
      {action !== "reactivate" && (
        <textarea
          className={`${input} mt-4 min-h-24`}
          placeholder="Reason (shown to the member in their portal) *"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      )}
      {action === "suspend" && (
        <label className="mt-3 block text-sm text-gray-600">
          Ends automatically on (optional)
          <input type="date" className={`${input} mt-1`} value={until} onChange={(e) => setUntil(e.target.value)} />
        </label>
      )}
      {needsConfirm && (
        <input className={`${input} mt-3`} placeholder="Type DEACTIVATE to confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
      )}
      {error && <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex gap-3">
        <button
          onClick={submit}
          disabled={saving || (needsConfirm && confirmText !== "DEACTIVATE")}
          className={`flex-1 rounded-2xl py-3 font-semibold text-white disabled:opacity-50 ${action === "reactivate" ? "bg-green-600" : action === "suspend" ? "bg-orange-500" : "bg-red-600"}`}
        >
          {saving ? "Saving..." : "Confirm"}
        </button>
        <button onClick={onClose} className="flex-1 rounded-2xl border border-[#efd6ce] py-3 font-semibold">Cancel</button>
      </div>
    </Dialog>
  );
}

function Dialog({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
