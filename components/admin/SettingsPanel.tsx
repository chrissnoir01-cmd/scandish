"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, FileText, HardDrive, Loader2, Upload } from "lucide-react";
import {
  cleanStorage,
  getSettings,
  scanStorage,
  updateContact,
  updateContractTemplate,
  updatePricing,
  type AdminSettings,
  type StorageScan,
} from "@/app/actions/admin";
import { downloadContract } from "@/lib/download-contract";
import { getIdToken, uploadPrivateAsset } from "@/lib/firebase";
import { formatRwf } from "@/lib/brand";
import { agentEarning, contactTelUrl, contactWhatsAppUrl, CONTRACT_PLACEHOLDERS, type ContactInfo, type PlanPricing, type Pricing } from "@/lib/settings";

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
      <ContactForm initial={settings.contact} onSaved={reload} />
      <PricingForm initial={settings.pricing} onSaved={reload} />
      <ContractForm initial={settings.contract} onSaved={reload} />
      <StorageCleanup />
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

/* ---------- Storage cleanup ---------- */

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

function StorageCleanup() {
  const [scan, setScan] = useState<StorageScan | null>(null);
  const [busy, setBusy] = useState<"" | "scan" | "clean">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const runScan = async () => {
    setBusy("scan");
    setMsg(null);
    try {
      const res = await scanStorage(await getIdToken());
      if (!res.ok) return setMsg({ ok: false, text: res.error });
      setScan(res.data);
    } finally {
      setBusy("");
    }
  };

  const runClean = async () => {
    if (!scan || !confirm(`Delete ${scan.unusedCount} unused image(s) (${mb(scan.unusedBytes)})? This cannot be undone.`)) return;
    setBusy("clean");
    setMsg(null);
    try {
      const res = await cleanStorage(await getIdToken());
      if (!res.ok) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: `Deleted ${res.data.deleted} unused image(s), freeing ${mb(res.data.bytes)}.` });
      setScan(null);
    } finally {
      setBusy("");
    }
  };

  return (
    <section className={card}>
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <HardDrive size={20} className="text-[#f08c6c]" /> Storage cleanup
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Replaced photos are deleted automatically when an owner publishes. This finds files that were uploaded but never used
        (e.g. a photo uploaded and then not published), older than 7 days. Nothing in use is ever deleted.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={runScan} disabled={busy !== ""} className="flex items-center gap-2 rounded-2xl border border-[#efd6ce] px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
          {busy === "scan" && <Loader2 size={16} className="animate-spin" />} Scan storage
        </button>
        {scan && scan.unusedCount > 0 && (
          <button onClick={runClean} disabled={busy !== ""} className="flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy === "clean" && <Loader2 size={16} className="animate-spin" />} Delete {scan.unusedCount} unused ({mb(scan.unusedBytes)})
          </button>
        )}
      </div>
      {scan && (
        <div className="mt-4 rounded-2xl bg-[#fff8f5] p-4 text-sm">
          <p>
            Checked <strong>{scan.scanned}</strong> stored files: <strong>{scan.unusedCount}</strong> unused ({mb(scan.unusedBytes)}).
          </p>
          {scan.examples.length > 0 && (
            <ul className="mt-2 space-y-1 font-mono text-xs text-gray-500">
              {scan.examples.map((e) => (
                <li key={e.publicId}>
                  {e.publicId} · {mb(e.bytes)} · {e.createdAt.slice(0, 10)}
                </li>
              ))}
              {scan.unusedCount > scan.examples.length && <li>…and {scan.unusedCount - scan.examples.length} more</li>}
            </ul>
          )}
        </div>
      )}
      {msg && <p className={`mt-3 text-sm font-semibold ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
    </section>
  );
}

/* ---------- Contact details ---------- */

function ContactForm({ initial, onSaved }: { initial: ContactInfo; onSaved: () => Promise<void> }) {
  const [c, setC] = useState({ phone: initial.phone, whatsapp: initial.whatsapp, email: initial.email });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof typeof c) => (e: React.ChangeEvent<HTMLInputElement>) => setC((cur) => ({ ...cur, [k]: e.target.value }));
  const dirty = c.phone !== initial.phone || c.whatsapp !== initial.whatsapp || c.email !== initial.email;

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await updateContact(await getIdToken(), c);
      if (!res.ok) return setMsg({ ok: false, text: res.error });
      setC({ phone: res.data.phone, whatsapp: res.data.whatsapp, email: res.data.email });
      setMsg({ ok: true, text: "Saved. The website, legal pages, dashboards and new contracts now show these details." });
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  const preview = { ...initial, ...c, whatsapp: c.whatsapp.replace(/\D/g, "") };

  return (
    <section className={card}>
      <h2 className="text-xl font-bold">Contact details</h2>
      <p className="mt-1 text-sm text-gray-500">
        How customers and owners reach ScanDish. Used on the homepage, About, Terms, Privacy, the owner dashboard, the support
        portal, contracts and Google/AI information. Last saved: {when(initial.updatedAt)}.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Phone (calls)</span>
          <input className={input} inputMode="tel" placeholder="+250 781 822 350" value={c.phone} onChange={set("phone")} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">WhatsApp number</span>
          <input className={input} inputMode="tel" placeholder="250781822350" value={c.whatsapp} onChange={set("whatsapp")} />
          <span className="mt-1 block text-xs text-gray-400">With country code. 07… numbers get 250 added automatically.</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
          <input className={input} type="email" placeholder="support@scandish.online" value={c.email} onChange={set("email")} />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-gray-500">Test before saving:</span>
        <a href={contactTelUrl(preview)} className="font-semibold text-[#d9694a] underline">Call</a>
        <a href={contactWhatsAppUrl(preview)} target="_blank" rel="noreferrer" className="font-semibold text-[#d9694a] underline">Open WhatsApp</a>
        <a href={`mailto:${c.email}`} className="font-semibold text-[#d9694a] underline">Send email</a>
      </div>
      <button
        onClick={save}
        disabled={saving || !dirty}
        className="mt-5 flex items-center gap-2 rounded-2xl bg-[#f08c6c] px-6 py-3 font-semibold text-white disabled:opacity-50"
      >
        {saving && <Loader2 size={16} className="animate-spin" />} Save contact details
      </button>
      {msg && <p className={`mt-3 text-sm font-semibold ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
    </section>
  );
}