"use client";

import Image from "next/image";
import { useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { createBusiness, reissueTempPassword, type NewBusinessInput } from "@/app/actions/support";
import { PoweredBy } from "@/components/auth/AuthCard";
import { supportAgreementSections } from "@/components/legal/supportAgreement";
import { BRAND, formatRwf } from "@/lib/brand";
import { getIdToken } from "@/lib/firebase";
import { agentEarning, type Pricing } from "@/lib/settings";
import type { AgentBusiness, OnboardingState, SupportPortal as PortalData } from "@/lib/types";
import { downloadContract } from "@/lib/download-contract";

type Tab = "overview" | "new" | "businesses" | "guide" | "agreement";

const input =
  "w-full rounded-2xl border border-[#edd4cb] bg-white px-4 py-3 outline-none focus:border-[#f08c6c] focus:ring-2 focus:ring-[#f08c6c]/20 disabled:bg-gray-50";

const STATE: Record<OnboardingState, { label: string; style: string }> = {
  setup_period: { label: "Setup period — live", style: "bg-sky-50 text-sky-700" },
  awaiting_activation: { label: "Awaiting subscription — offline", style: "bg-amber-50 text-amber-800" },
  live: { label: "Live", style: "bg-green-50 text-green-700" },
  offline: { label: "Offline", style: "bg-gray-100 text-gray-600" },
};

const date = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { timeZone: "Africa/Kigali", day: "numeric", month: "short", year: "numeric" }) : "—";

const EMPTY: NewBusinessInput = {
  companyName: "",
  managerName: "",
  phone: "",
  email: "",
  location: "",
  businessType: "Restaurant",
  plan: "standard",
  notes: "",
};

/** WhatsApp needs digits with country code; local 07… numbers get 250. */
const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return /^0\d{9}$/.test(d) ? `250${d.slice(1)}` : d;
};

interface Credentials {
  companyId: string;
  businessName: string;
  managerName: string;
  email: string;
  phone: string;
  tempPassword: string;
}

export default function SupportPortal({
  data,
  onReload,
  onLogout,
}: {
  data: PortalData;
  onReload: () => Promise<void>;
  onLogout: () => void;
}) {
  const { agent, businesses, pricing } = data;
  const suspended = agent.status === "suspended";
  const [tab, setTab] = useState<Tab>("overview");
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const awaiting = businesses.filter((b) => b.state === "awaiting_activation" || b.state === "setup_period").length;

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "new", label: "New business", icon: PlusCircle },
    { id: "businesses", label: "My businesses", icon: Building2 },
    { id: "guide", label: "Onboarding guide", icon: BookOpen },
    { id: "agreement", label: "My agreement", icon: FileText },
  ];

  return (
    <main className="min-h-screen bg-[#fff8f5] text-gray-900">
      <header className="sticky top-0 z-30 border-b border-[#f4d4ca] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <span className="relative h-11 w-11 overflow-hidden rounded-2xl border border-[#f3d8cf]">
              <Image src="/images/logo.jpg" alt="ScanDish" fill sizes="44px" className="object-cover" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#f08c6c]">ScanDish Support Team</p>
              <p className="font-bold">{agent.name}</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 rounded-2xl border border-red-100 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        {suspended && (
          <div role="alert" className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0" />
              <div>
                <p className="text-lg font-bold">Your account is suspended</p>
                <p className="mt-1 text-sm">
                  {agent.suspendedUntil
                    ? `Until ${date(agent.suspendedUntil)}. `
                    : "Until ScanDish lifts the suspension. "}
                  While suspended you can read your portal and agreement, but you cannot create businesses or issue passwords.
                </p>
                {agent.statusReason && (
                  <p className="mt-3 rounded-2xl bg-white/70 p-3 text-sm">
                    <span className="font-semibold">Reason: </span>
                    {agent.statusReason}
                  </p>
                )}
                <p className="mt-3 text-sm">
                  To ask for a review, contact{" "}
                  <a href={`mailto:${BRAND.supportEmail}`} className="font-semibold underline">
                    {BRAND.supportEmail}
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        )}

        <nav className="mb-6 flex gap-2 overflow-x-auto" aria-label="Portal sections">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                tab === id ? "bg-[#f08c6c] text-white shadow" : "border border-[#f4d4ca] bg-white text-gray-600 hover:bg-[#fff1ec]"
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={Building2} label="Businesses onboarded" value={String(agent.businesses)} />
              <Stat icon={CheckCircle2} label="Live pages" value={String(agent.liveBusinesses)} />
              <Stat icon={Clock} label="Awaiting subscription" value={String(awaiting)} />
              <Stat icon={Wallet} label="Setup fees earned" value={formatRwf(agent.setupEarnings)} />
            </div>
            <div className="rounded-3xl border border-[#f4d4ca] bg-white p-6">
              <h2 className="text-lg font-bold">How your work pays</h2>
              <ul className="mt-3 space-y-1 text-sm leading-6 text-gray-600">
                <li>
                  <strong>Standard</strong> — setup fee {formatRwf(pricing.standard.setupFee)}, you keep{" "}
                  <strong>{formatRwf(agentEarning(pricing, "standard"))}</strong>.
                </li>
                <li>
                  <strong>Premium</strong> — setup fee {formatRwf(pricing.premium.setupFee)}, you keep{" "}
                  <strong>{formatRwf(agentEarning(pricing, "premium"))}</strong>; hand the remaining{" "}
                  {formatRwf(pricing.premium.setupFee - agentEarning(pricing, "premium"))} to Ironic Lab.
                </li>
              </ul>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                That is your only earning from ScanDish. Subscription fees go to Ironic Lab Inc. through the official payment
                channel. New businesses are live for a {pricing.trialDays}-day setup period, then go offline until their
                subscription is confirmed.
              </p>
              {!suspended && (
                <button onClick={() => setTab("new")} className="mt-4 flex items-center gap-2 rounded-2xl bg-[#f08c6c] px-5 py-3 font-semibold text-white">
                  <PlusCircle size={18} /> Onboard a new business
                </button>
              )}
            </div>
            {businesses.length > 0 && <BusinessList businesses={businesses.slice(0, 5)} suspended={suspended} onCredentials={setCredentials} />}
          </div>
        )}

        {tab === "new" && (
          <NewBusinessForm
            disabled={suspended}
            pricing={pricing}
            onCreated={async (c) => {
              setCredentials(c);
              await onReload();
            }}
          />
        )}

        {tab === "businesses" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={onReload} className="flex items-center gap-2 rounded-xl border border-[#f4d4ca] bg-white px-3 py-2 text-sm font-bold text-[#f08c6c]">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            <BusinessList businesses={businesses} suspended={suspended} onCredentials={setCredentials} />
          </div>
        )}

        {tab === "guide" && <OnboardingGuide pricing={pricing} />}

        {tab === "agreement" && (
          <div className="rounded-3xl border border-[#f4d4ca] bg-white p-6 md:p-8">
            <h2 className="text-2xl font-black">Support Team Agreement</h2>
            <p className="mt-1 text-sm text-gray-500">
              Accepted {date(agent.agreementAcceptedAt)} · version {agent.agreementVersion || "—"} · set by {BRAND.company}
            </p>
            <div className="mt-6 space-y-8">
              {supportAgreementSections(pricing).map((s, i) => (
                <section key={s.id}>
                  <h3 className="text-lg font-bold">
                    {i + 1}. {s.title}
                  </h3>
                  <div className="legal-body mt-2 space-y-3 leading-7 text-gray-700">{s.body}</div>
                </section>
              ))}
            </div>
          </div>
        )}

        <PoweredBy className="mt-12" />
      </div>

      {credentials && <CredentialsDialog c={credentials} onClose={() => setCredentials(null)} />}
    </main>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#f4d4ca] bg-white p-5">
      <Icon size={18} className="text-[#f08c6c]" />
      <p className="mt-3 text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function NewBusinessForm({
  disabled,
  pricing,
  onCreated,
}: {
  disabled: boolean;
  pricing: Pricing;
  onCreated: (c: Credentials) => Promise<void>;
}) {
  const [form, setForm] = useState<NewBusinessInput>(EMPTY);
  const [explained, setExplained] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof NewBusinessInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explained) return setError("Confirm that you explained the Terms and Privacy Policy and the business agreed to join.");
    setError("");
    setSaving(true);
    try {
      const res = await createBusiness(await getIdToken(), form);
      if (!res.ok) return setError(res.error);
      await onCreated({
        companyId: res.data.companyId,
        businessName: form.companyName,
        managerName: form.managerName,
        email: res.data.email,
        phone: form.phone,
        tempPassword: res.data.tempPassword,
      });
      setForm(EMPTY);
      setExplained(false);
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-3xl border border-[#f4d4ca] bg-white p-6 md:p-8">
      <h2 className="text-xl font-bold">Onboard a new business</h2>
      <p className="mt-1 text-sm text-gray-500">
        Creates the business and its manager&apos;s login. You&apos;ll get a temporary password to give the manager; their page
        goes live once ScanDish activates the subscription.
      </p>

      <fieldset disabled={disabled || saving} className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Business name *"><input className={input} value={form.companyName} onChange={set("companyName")} /></Field>
        <Field label="Business type"><input className={input} value={form.businessType} onChange={set("businessType")} /></Field>
        <Field label="Manager full name *"><input className={input} value={form.managerName} onChange={set("managerName")} /></Field>
        <Field label="Manager phone *"><input className={input} inputMode="tel" placeholder="07…" value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Manager email * (their login)"><input className={input} type="email" value={form.email} onChange={set("email")} /></Field>
        <Field label="Location"><input className={input} value={form.location} onChange={set("location")} /></Field>
        <Field label="Plan">
          <select className={input} value={form.plan} onChange={set("plan")}>
            <option value="standard">
              Standard — setup {formatRwf(pricing.standard.setupFee)} (you keep {formatRwf(agentEarning(pricing, "standard"))})
            </option>
            <option value="premium">
              Premium — setup {formatRwf(pricing.premium.setupFee)} (you keep {formatRwf(agentEarning(pricing, "premium"))})
            </option>
          </select>
        </Field>
        <Field label="Notes for ScanDish (optional)"><input className={input} value={form.notes} onChange={set("notes")} /></Field>

        <label className="flex items-start gap-3 rounded-2xl bg-[#fff8f5] p-4 text-sm text-gray-700 md:col-span-2">
          <input type="checkbox" checked={explained} onChange={(e) => setExplained(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#f08c6c]" />
          <span>
            The business agreed to join. I explained how ScanDish works, the prices, the{" "}
            <a href="/terms" target="_blank" className="font-semibold text-[#d9694a]">Terms of Service</a> and the{" "}
            <a href="/privacy" target="_blank" className="font-semibold text-[#d9694a]">Privacy Policy</a>.
          </span>
        </label>
      </fieldset>

      {disabled && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">Creating businesses is disabled while your account is suspended.</p>}
      {error && <p role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button type="submit" disabled={disabled || saving} className="mt-6 w-full rounded-2xl bg-[#f08c6c] py-4 font-bold text-white disabled:opacity-50 md:w-auto md:px-10">
        {saving ? "Creating..." : "Create business & login"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function BusinessList({
  businesses,
  suspended,
  onCredentials,
}: {
  businesses: AgentBusiness[];
  suspended: boolean;
  onCredentials: (c: Credentials) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (businesses.length === 0) {
    return <p className="rounded-3xl border border-[#f4d4ca] bg-white p-8 text-center text-sm text-gray-500">No businesses yet.</p>;
  }

  const reissue = async (b: AgentBusiness) => {
    if (!confirm(`Issue a new temporary password for ${b.companyName}? The old one stops working.`)) return;
    setBusy(b.id);
    setError("");
    try {
      const res = await reissueTempPassword(await getIdToken(), b.id);
      if (!res.ok) return setError(res.error);
      onCredentials({
        companyId: b.id,
        businessName: b.companyName,
        managerName: b.managerName,
        email: res.data.email,
        phone: b.phone,
        tempPassword: res.data.tempPassword,
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-3xl border border-[#f4d4ca] bg-white p-4 md:p-6">
      {error && <p role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <ul className="divide-y divide-[#f7ebe6]">
        {businesses.map((b) => (
          <li key={b.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold">{b.companyName}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATE[b.state].style}`}>{STATE[b.state].label}</span>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-gray-600">{b.plan}</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {b.managerName} · {b.email} · {b.phone}
              </p>
              {b.state === "setup_period" && (
                <p className="mt-1 text-xs font-semibold text-sky-700">
                  Live until {date(b.trialEndsAt)} — goes offline unless ScanDish confirms the subscription
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Created {date(b.createdAt)} · setup fee {formatRwf(b.setupFee)}, your share {formatRwf(b.agentEarning)} ·{" "}
                {b.passwordChanged ? "manager has set their own password" : b.managerHasLoggedIn ? "manager signed in, password not yet changed" : "manager hasn’t signed in yet"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  setBusy(`contract-${b.id}`);
                  setError((await downloadContract(b.id, b.companyName)) ?? "");
                  setBusy(null);
                }}
                disabled={busy === `contract-${b.id}`}
                className="flex items-center gap-1 rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <FileText size={14} /> {busy === `contract-${b.id}` ? "Generating..." : "Contract PDF"}
              </button>
              {(b.state === "live" || b.state === "setup_period") && b.slug && (
                <a href={`/r/${b.slug}`} target="_blank" rel="noreferrer" className="rounded-xl border border-[#f4d4ca] px-3 py-2 text-sm font-semibold text-gray-700">
                  View page
                </a>
              )}
              {!b.passwordChanged && (
                <button
                  onClick={() => reissue(b)}
                  disabled={suspended || busy === b.id}
                  className="flex items-center gap-1 rounded-xl border border-[#f4d4ca] px-3 py-2 text-sm font-semibold text-[#d9694a] disabled:opacity-50"
                >
                  <KeyRound size={14} /> {busy === b.id ? "Issuing..." : "New temporary password"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CredentialsDialog({ c, onClose }: { c: Credentials; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [contract, setContract] = useState<"idle" | "busy" | string>("idle");
  const loginUrl = `${window.location.origin}/login`;
  const message =
    `Hello ${c.managerName}, welcome to ScanDish!\n\n` +
    `Your login for ${c.businessName}:\n${loginUrl}\nEmail: ${c.email}\nTemporary password: ${c.tempPassword}\n\n` +
    `You will be asked to choose your own password the first time you sign in. Keep it private.`;

  const copy = async () => {
    await navigator.clipboard?.writeText(message);
    setCopied(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold">Login details for {c.businessName}</h2>
        <p className="mt-2 text-sm text-gray-500">
          This password is shown <strong>only once</strong>. Give it privately to {c.managerName} — they will replace it at first sign-in.
        </p>
        <dl className="mt-4 space-y-2 rounded-2xl bg-[#fff8f5] p-4 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-gray-500">Login page</dt><dd className="font-semibold">{loginUrl.replace(/^https?:\/\//, "")}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-gray-500">Email</dt><dd className="break-all font-semibold">{c.email}</dd></div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-gray-500">Temporary password</dt>
            <dd className="font-mono text-lg font-bold tracking-wider">{c.tempPassword}</dd>
          </div>
        </dl>
        <div className="mt-5 grid gap-2">
          <a
            href={`https://wa.me/${waNumber(c.phone)}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-green-600 py-3 font-semibold text-white"
          >
            <FaWhatsapp size={18} /> Send to manager on WhatsApp
          </a>
          <button onClick={copy} className="flex items-center justify-center gap-2 rounded-2xl border border-[#f4d4ca] py-3 font-semibold text-gray-700">
            <Copy size={16} /> {copied ? "Copied" : "Copy message"}
          </button>
          <button
            onClick={async () => {
              setContract("busy");
              setContract((await downloadContract(c.companyId, c.businessName)) ?? "idle");
            }}
            disabled={contract === "busy"}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3 font-semibold text-white disabled:opacity-50"
          >
            <FileText size={16} /> {contract === "busy" ? "Generating..." : "Generate service contract (PDF)"}
          </button>
          {contract !== "idle" && contract !== "busy" && <p className="text-center text-sm text-red-600">{contract}</p>}
          <button onClick={onClose} className="py-2 text-sm font-semibold text-gray-500">
            I&apos;ve given the details — close
          </button>
        </div>
      </div>
    </div>
  );
}

function OnboardingGuide({ pricing }: { pricing: Pricing }) {
  const steps: { title: string; points: string[] }[] = [
    {
      title: "1. Present ScanDish",
      points: [
        "Guests scan a QR code on the table and see the full menu, photos, offers, WhatsApp, directions — no app to install.",
        "The owner updates menu and prices any time from their phone; changes go live instantly.",
        "They see how many people viewed their menu, when, and from which device.",
        "Standard: professional menu page. Premium: luxury design templates and priority support.",
      ],
    },
    {
      title: "2. Explain prices and payments",
      points: [
        `Setup fee (collected by you): ${formatRwf(pricing.standard.setupFee)} Standard · ${formatRwf(pricing.premium.setupFee)} Premium. Give a receipt.`,
        `Subscription (paid to ScanDish, not to you): Standard ${formatRwf(pricing.standard.sixMonths)} / 6 months or ${formatRwf(pricing.standard.year)} / year; Premium ${formatRwf(pricing.premium.sixMonths)} / 6 months or ${formatRwf(pricing.premium.year)} / year.`,
        `The page is live for a ${pricing.trialDays}-day setup period right after you create the account, so they can check it. It stays online once ScanDish confirms the subscription payment.`,
        "If a subscription ends, the page stays online 10 more days, then goes offline until renewal.",
      ],
    },
    {
      title: "3. Walk through the Terms and Privacy Policy",
      points: [
        "They own their content (menu, photos) and are responsible for accurate prices and allergen information.",
        "Fees are generally non-refundable; prices for future periods can change with 30 days' notice.",
        "Menu visitors stay anonymous — ScanDish counts views but collects no guest personal data.",
        "ScanDish is owned and governed by Ironic Lab Inc. Full texts: scandish.online/terms and /privacy.",
      ],
    },
    {
      title: "4. Create the account",
      points: [
        "Use the manager's real email — it becomes their login.",
        "Generate the service contract PDF, print two copies, and have the manager sign and stamp both for their business. One copy stays with them; bring one back to ScanDish.",
        "Give the temporary password privately (in person or WhatsApp to the manager's own number).",
        "At first sign-in they choose their own password and accept the Terms. After that you can't access their account.",
      ],
    },
    {
      title: "5. Help them set up (if they want)",
      points: [
        "Sit with them while they add logo, cover photo, menu categories, items with prices and photos.",
        "Add WhatsApp, phone, location and social links; pick brand colours.",
        "Click Publish Changes, download the QR code (PNG for printing) and place it on every table.",
        "Show them the Insights tab so they can follow their menu views.",
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {steps.map((s) => (
        <section key={s.title} className="rounded-3xl border border-[#f4d4ca] bg-white p-6">
          <h2 className="text-lg font-bold">{s.title}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
            {s.points.map((p) => (
              <li key={p} className="flex gap-2">
                <CheckCircle2 size={16} className="mt-1 shrink-0 text-[#f08c6c]" aria-hidden />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
