"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import { getSettings, updateContractTemplate, updatePricing, type AdminSettings } from "@/app/actions/admin";
import { downloadContract } from "@/lib/download-contract";
import { getIdToken, uploadPrivateAsset } from "@/lib/firebase";
import { formatRwf } from "@/lib/brand";
import { agentEarning, CONTRACT_PLACEHOLDERS, type PlanPricing, type Pricing } from "@/lib/settings";

const input = "w-full rounded-2xl border border-[#efd6ce] bg-white px-4 py-3 outline-none focus:border-[#f08c6c]";
const card = "rounded-3xl border border-[#f2ddd6] bg-white p-6 shadow-sm";

const when = (iso: string) =>
  iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Kigali", dateStyle: "medium", timeStyle: "short" }) : "never (defaults)";

export default function SettingsPanel() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [error, setError] = useState("");

  const apply = useCallback((res: Awaited<ReturnType<typeof getSettings>>) => {
    if (res.ok) {
      setSettings(res.data);
      setError("");
    } else setError(res.error);
  }, []);

  const reload = async () => apply(await getSettings(await getIdToken()));

  useEffect(() => {
    getIdToken()
      .then((t) => getSettings(t))
      .then(apply);
  }, [apply]);

  if (!settings) {
    return (
      <div className={`${card} flex h-40 items-center justify-center`}>
        {error ? <p className="text-sm text-red-600">{error}</p> : <Loader2 className="animate-spin text-[#f08c6c]" />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PricingForm initial={settings.pricing} onSaved={reload} />
      <ContractForm initial={settings.contract} onSaved={reload} />
    </div>
  );
}

/* ---------- Pricing ---------- */

function PricingForm({ initial, onSaved }: { initial: Pricing; onSaved: () => Promise<void> }) {
  const [p, setP] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const setPlan = (plan: "standard" | "premium", key: keyof PlanPricing, value: string) =>
    setP((cur) => ({ ...cur, [plan]: { ...cur[plan], [key]: value === "" ? 0 : Number(value) } }));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await updatePricing(await getIdToken(), { standard: p.standard, premium: p.premium, trialDays: p.trialDays });
      if (!res.ok) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: "Pricing saved. The website, agreement and support portal now show these prices." });
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={card}>
      <h2 className="text-xl font-bold">Pricing</h2>
      <p className="mt-1 text-sm text-gray-500">
        Used on the landing page, in contracts, in the Support Team Agreement and portal. Changes apply to new businesses; existing
        businesses keep the setup fee and member share recorded when they were created. Last saved: {when(initial.updatedAt)}.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {(["standard", "premium"] as const).map((plan) => (
          <div key={plan} className="rounded-2xl border border-[#f7ebe6] p-5">
            <h3 className="font-bold capitalize">{plan}</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <NumberField label="Setup fee (RWF)" value={p[plan].setupFee} onChange={(v) => setPlan(plan, "setupFee", v)} />
              <NumberField label="Member share (%)" value={p[plan].agentSharePct} step="0.01" onChange={(v) => setPlan(plan, "agentSharePct", v)} />
              <NumberField label="6 months (RWF)" value={p[plan].sixMonths} onChange={(v) => setPlan(plan, "sixMonths", v)} />
              <NumberField label="1 year (RWF)" value={p[plan].year} onChange={(v) => setPlan(plan, "year", v)} />
            </div>
            <p className="mt-3 rounded-xl bg-[#fff8f5] px-3 py-2 text-sm text-gray-600">
              Support member keeps <strong>{formatRwf(agentEarning(p, plan))}</strong> · Ironic Lab receives{" "}
              <strong>{formatRwf(p[plan].setupFee - agentEarning(p, plan))}</strong> of each setup fee
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 max-w-xs">
        <NumberField
          label="Setup period for support-created businesses (days)"
          value={p.trialDays}
          onChange={(v) => setP((cur) => ({ ...cur, trialDays: v === "" ? 0 : Number(v) }))}
        />
        <p className="mt-1 text-xs text-gray-500">Live for this many days, then offline until you confirm the subscription (Renew).</p>
      </div>

      {msg && <p className={`mt-4 rounded-2xl p-3 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      <button onClick={save} disabled={saving} className="mt-5 rounded-2xl bg-[#f08c6c] px-8 py-3 font-semibold text-white disabled:opacity-50">
        {saving ? "Saving..." : "Save pricing"}
      </button>
    </section>
  );
}

function NumberField({ label, value, onChange, step = "1" }: { label: string; value: number; onChange: (v: string) => void; step?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-gray-600">{label}</span>
      <input type="number" min={0} step={step} className={input} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/* ---------- Contract template ---------- */

function ContractForm({ initial, onSaved }: { initial: AdminSettings["contract"]; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [signatoryName, setSignatoryName] = useState(initial.signatoryName);
  const [signatoryTitle, setSignatoryTitle] = useState(initial.signatoryTitle);
  const [stamp, setStamp] = useState<{ id?: string; has: boolean }>({ has: initial.hasStamp });
  const [signature, setSignature] = useState<{ id?: string; has: boolean }>({ has: initial.hasSignature });
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const insert = (key: string) => {
    const el = bodyRef.current;
    const token = `{{${key}}}`;
    if (!el) return setBody((b) => b + token);
    const start = el.selectionStart;
    const next = body.slice(0, start) + token + body.slice(el.selectionEnd);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  };

  const upload = async (file: File, purpose: "contract-stamp" | "contract-signature") => {
    setUploading(purpose);
    setMsg(null);
    try {
      const id = await uploadPrivateAsset(file, purpose);
      (purpose === "contract-stamp" ? setStamp : setSignature)({ id, has: true });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await updateContractTemplate(await getIdToken(), {
        title,
        body,
        signatoryName,
        signatoryTitle,
        ...(stamp.id ? { stampId: stamp.id } : {}),
        ...(signature.id ? { signatureId: signature.id } : {}),
        ...(!stamp.has && initial.hasStamp ? { stampId: "remove" } : {}),
        ...(!signature.has && initial.hasSignature ? { signatureId: "remove" } : {}),
      });
      if (!res.ok) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: "Contract template saved. New contracts use it immediately." });
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  const preview = async () => {
    setPreviewing(true);
    const err = await downloadContract("preview", "preview");
    if (err) setMsg({ ok: false, text: err });
    setPreviewing(false);
  };

  return (
    <section className={card}>
      <h2 className="text-xl font-bold">Service contract template</h2>
      <p className="mt-1 text-sm text-gray-500">
        The contract between Ironic Lab Inc. and each business, generated as a PDF from the support portal. Save, then preview
        with sample data. Last saved: {when(initial.updatedAt)}.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <label className="block text-sm md:col-span-3">
          <span className="mb-1 block text-gray-600">Title</span>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">Signatory name (Ironic Lab Inc.)</span>
          <input className={input} value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">Signatory title</span>
          <input className={input} value={signatoryTitle} onChange={(e) => setSignatoryTitle(e.target.value)} />
        </label>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <AssetBox
          label="Company stamp"
          hint="PNG with transparent background works best."
          has={stamp.has}
          busy={uploading === "contract-stamp"}
          onFile={(f) => upload(f, "contract-stamp")}
          onRemove={() => setStamp({ has: false })}
        />
        <AssetBox
          label="Signature"
          hint="Scan or photo of the signature on white/transparent background."
          has={signature.has}
          busy={uploading === "contract-signature"}
          onFile={(f) => upload(f, "contract-signature")}
          onRemove={() => setSignature({ has: false })}
        />
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Stored privately — they have no public link and appear only inside generated contracts.
      </p>

      <div className="mt-6">
        <p className="mb-2 text-sm text-gray-600">Contract text — blank line = new paragraph, &ldquo;## &rdquo; starts a heading. Click to insert:</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {CONTRACT_PLACEHOLDERS.map((p) => (
            <button key={p.key} type="button" onClick={() => insert(p.key)} title={p.label} className="rounded-full bg-[#fff1ec] px-3 py-1 font-mono text-xs text-[#c2553a] hover:bg-[#fde3da]">
              {`{{${p.key}}}`}
            </button>
          ))}
        </div>
        <textarea ref={bodyRef} className={`${input} min-h-[420px] font-mono text-sm leading-6`} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>

      {msg && <p className={`mt-4 rounded-2xl p-3 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={save} disabled={saving || uploading !== null} className="rounded-2xl bg-[#f08c6c] px-8 py-3 font-semibold text-white disabled:opacity-50">
          {saving ? "Saving..." : "Save template"}
        </button>
        <button onClick={preview} disabled={previewing} className="flex items-center gap-2 rounded-2xl bg-gray-900 px-6 py-3 font-semibold text-white disabled:opacity-50">
          <FileText size={16} /> {previewing ? "Generating..." : "Preview PDF (saved version)"}
        </button>
      </div>
    </section>
  );
}

function AssetBox({
  label,
  hint,
  has,
  busy,
  onFile,
  onRemove,
}: {
  label: string;
  hint: string;
  has: boolean;
  busy: boolean;
  onFile: (f: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#efd6ce] p-4">
      <p className="font-semibold">{label}</p>
      <p className="text-xs text-gray-500">{hint}</p>
      <div className="mt-3 flex items-center gap-3">
        <label className="relative flex cursor-pointer items-center gap-2 rounded-xl border border-[#efd6ce] px-3 py-2 text-sm font-semibold text-gray-700">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {has ? "Replace" : "Upload"}
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onFile(f);
            }}
          />
        </label>
        {has ? (
          <>
            <span className="flex items-center gap-1 text-sm text-green-700">
              <CheckCircle2 size={14} /> Ready
            </span>
            <button type="button" onClick={onRemove} className="text-sm text-red-500">
              Remove
            </button>
          </>
        ) : (
          <span className="text-sm text-gray-400">None</span>
        )}
      </div>
    </div>
  );
}
