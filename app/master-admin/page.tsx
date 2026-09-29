"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth, getIdToken, uploadPrivateAsset } from "../../lib/firebase";
import {
  createCompany as createCompanyAction,
  deleteCompany as deleteCompanyAction,
  listCompanies,
  renewSubscription as renewAction,
  setCompanyStatus,
  setShowOnHomepage,
  updatePremium,
  type NewCompanyInput,
} from "../actions/admin";
import { daysRemaining as getDaysRemaining } from "../../lib/subscription";
import type { Company, Plan, PremiumTemplate } from "../../lib/types";
import { PoweredBy } from "@/components/auth/AuthCard";
import ActivityPanel from "@/components/admin/ActivityPanel";
import AccountsPanel from "@/components/admin/AccountsPanel";
import SupportTeamPanel from "@/components/admin/SupportTeamPanel";
import SettingsPanel from "@/components/admin/SettingsPanel";
import DesignStudioPanel from "@/components/admin/DesignStudioPanel";
import SubdomainEditor from "@/components/admin/SubdomainEditor";
import { subdomainUrl } from "@/lib/domains";
import { downloadContract } from "@/lib/download-contract";
import { openCertificate } from "@/lib/open-certificate";

const BRAND = "#f08c6c";

const EMPTY_FORM: NewCompanyInput = {
  companyName: "",
  managerName: "",
  phone: "",
  email: "",
  location: "",
  certificateNumber: "",
  certificateId: "",
  businessType: "Restaurant",
  subscriptionStart: "",
  subscriptionEnd: "",
  notes: "",
};

export default function MasterAdminPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState<NewCompanyInput>(EMPTY_FORM);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<{ code: string; name: string } | null>(null);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [certificateName, setCertificateName] = useState("");

  const [confirmStatusCompany, setConfirmStatusCompany] = useState<Company | null>(null);
  const [confirmDeleteCompany, setConfirmDeleteCompany] = useState<Company | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [renewCompany, setRenewCompany] = useState<Company | null>(null);
  const [renewDays, setRenewDays] = useState(180);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"companies" | "activity" | "studio" | "support" | "accounts" | "settings">("companies");
  const [contractBusy, setContractBusy] = useState<string | null>(null);

  const loadCompanies = useCallback(async () => {
    const res = await listCompanies(await getIdToken());
    if (res.ok) {
      setCompanies(res.data);
      setError("");
    } else {
      setError(res.error);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/secure-access-9xk3-admin");
        return;
      }
      const token = await currentUser.getIdTokenResult();
      if (token.claims.admin !== true) {
        router.replace("/dashboard");
        return;
      }
      setUser(currentUser);
      setChecking(false);
      loadCompanies();
    });
    return () => unsub();
  }, [router, loadCompanies]);

  /** Runs an admin action, reports its error, and reloads the list on success. */
  const run = async (action: (token: string) => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true);
    try {
      const res = await action(await getIdToken());
      if (!res.ok) {
        alert(res.error);
        return false;
      }
      await loadCompanies();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const setField = (key: keyof NewCompanyInput) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const createCompany = async () => {
    if (creatingCompany) return;
    setCreatingCompany(true);
    try {
      const res = await createCompanyAction(await getIdToken(), form);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      setCreatedInvite({ code: res.data.inviteCode, name: form.companyName });
      setForm(EMPTY_FORM);
      setCertificateName("");
      await loadCompanies();
    } finally {
      setCreatingCompany(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    router.replace("/secure-access-9xk3-admin");
  };

  const filteredCompanies = useMemo(() => {
    const q = search.toLowerCase();
    return companies.filter((c) =>
      [c.companyName, c.managerName, c.email, c.phone, c.location, c.status, c.slug].some((v) =>
        v.toLowerCase().includes(q)
      )
    );
  }, [companies, search]);

  const stats = useMemo(() => {
    const days = companies.map((c) => getDaysRemaining(c.subscriptionEnd));
    return [
      ["Total Companies", companies.length],
      ["Active", companies.filter((c) => c.status === "active").length],
      ["Inactive", companies.filter((c) => c.status === "inactive").length],
      ["Expired", days.filter((d) => d !== null && d < 1).length],
      ["Expiring Soon", days.filter((d) => d !== null && d > 0 && d <= 5).length],
    ] as const;
  }, [companies]);

  if (checking || !user) {
    return (
      <main className="min-h-screen bg-[#fff8f5] flex items-center justify-center">
        <p>Checking access...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8f5] text-gray-900">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <header className="bg-white border border-[#f2ddd6] rounded-3xl p-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: BRAND }}>
              ScanDish MasterAdmin
            </p>
            <h1 className="text-3xl font-bold">Control Center</h1>
            <p className="text-gray-500 mt-1">Logged in as {user.email}</p>
          </div>
          <button
            onClick={logout}
            className="px-5 py-3 rounded-2xl text-white font-semibold bg-red-600 hover:bg-red-700 transition"
          >
            Logout
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        )}

        <nav className="mb-6 flex gap-2 overflow-x-auto" aria-label="Admin sections">
          {(
            [
              ["companies", "Companies"],
              ["activity", "System activity"],
              ["studio", "Design Studio"],
              ["support", "Support team"],
              ["accounts", "Accounts"],
              ["settings", "Settings"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              aria-current={view === id ? "page" : undefined}
              className={`whitespace-nowrap rounded-2xl px-5 py-2.5 text-sm font-semibold transition ${
                view === id ? "bg-gray-900 text-white" : "border border-[#f2ddd6] bg-white text-gray-600 hover:bg-[#fff8f5]"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {view === "activity" && <ActivityPanel />}
        {view === "accounts" && <AccountsPanel />}
        {view === "studio" && <DesignStudioPanel />}
        {view === "support" && <SupportTeamPanel />}
        {view === "settings" && <SettingsPanel />}

        {view === "companies" && (
        <>
        {/* OVERVIEW */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {stats.map(([label, value]) => (
            <div key={label} className="bg-white border border-[#f2ddd6] rounded-3xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-3xl font-bold mt-2">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          {/* CREATE COMPANY */}
          <div className="lg:col-span-1 bg-white border border-[#f2ddd6] rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Create Company Account</h2>

            <div className="space-y-3">
              <input placeholder="Company Name *" className="input" value={form.companyName} onChange={(e) => setField("companyName")(e.target.value)} />
              <input placeholder="Manager Name *" className="input" value={form.managerName} onChange={(e) => setField("managerName")(e.target.value)} />
              <input placeholder="Phone Number *" className="input" value={form.phone} onChange={(e) => setField("phone")(e.target.value)} />
              <input type="email" placeholder="Owner Email * (used to sign up)" className="input" value={form.email} onChange={(e) => setField("email")(e.target.value)} />
              <input placeholder="Location" className="input" value={form.location} onChange={(e) => setField("location")(e.target.value)} />
              <input placeholder="RDB Registration Number" className="input" value={form.certificateNumber} onChange={(e) => setField("certificateNumber")(e.target.value)} />

              <div>
                <label className="text-sm text-gray-500">RDB Certificate (PDF or photo, stored privately)</label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="input"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setUploadingCertificate(true);
                    try {
                      setField("certificateId")(await uploadPrivateAsset(file, "certificate"));
                      setCertificateName(file.name);
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "Certificate upload failed");
                    } finally {
                      setUploadingCertificate(false);
                    }
                  }}
                />
                {uploadingCertificate && <p className="text-sm text-gray-500 mt-1">Uploading certificate...</p>}
                {form.certificateId && !uploadingCertificate && (
                  <p className="text-sm font-semibold mt-2 text-green-700">✓ {certificateName || "Certificate"} uploaded</p>
                )}
              </div>

              <input placeholder="Business Type" className="input" value={form.businessType} onChange={(e) => setField("businessType")(e.target.value)} />

              <div>
                <label className="text-sm text-gray-500">Subscription Start</label>
                <input type="date" className="input" value={form.subscriptionStart} onChange={(e) => setField("subscriptionStart")(e.target.value)} />
              </div>

              <div>
                <label className="text-sm text-gray-500">Subscription End</label>
                <input type="date" className="input" value={form.subscriptionEnd} onChange={(e) => setField("subscriptionEnd")(e.target.value)} />
              </div>

              <textarea placeholder="Notes" className="input min-h-24" value={form.notes} onChange={(e) => setField("notes")(e.target.value)} />

              <button
                onClick={createCompany}
                disabled={creatingCompany || uploadingCertificate}
                className="w-full rounded-2xl px-4 py-3 font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: BRAND }}
              >
                {creatingCompany ? "Creating..." : "Create Company"}
              </button>
            </div>
          </div>

          {/* MANAGE COMPANIES */}
          <div className="lg:col-span-2 bg-white border border-[#f2ddd6] rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xl font-bold">Manage Companies</h2>
                <p className="text-gray-500 text-sm">Activate, deactivate, search, or delete companies.</p>
              </div>
              <input placeholder="Search company..." className="input md:max-w-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="space-y-3">
              {filteredCompanies.length === 0 && <p className="text-gray-500">No companies found.</p>}

              {filteredCompanies.map((company) => {
                const days = getDaysRemaining(company.subscriptionEnd);
                const isExpired = days !== null && days < 1;

                return (
                  <div key={company.id} className="border border-[#f2ddd6] rounded-3xl p-4 bg-[#fffdfb]">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold">{company.companyName}</h3>
                        <p className="text-sm text-gray-500">Manager: {company.managerName}</p>
                        <p className="text-sm text-gray-500">Phone: {company.phone}</p>
                        <p className="text-sm text-gray-500">Email: {company.email || "No email"}</p>
                        <p className="text-sm text-gray-500">Location: {company.location || "No location"}</p>
                        <p className="text-sm text-gray-500">Page: /r/{company.slug}</p>
                        <p className="text-sm text-gray-500">
                          RDB Reg. No.: {company.certificateNumber || "Not provided"}
                          {company.hasCertificate && (
                            <button
                              onClick={async () => {
                                const err = await openCertificate(company.id);
                                if (err) alert(err);
                              }}
                              className="ml-2 font-semibold underline"
                              style={{ color: BRAND }}
                            >
                              View certificate
                            </button>
                          )}
                        </p>
                        {company.premiumPending && (
                          <p
                            className={`mt-1 inline-block rounded-lg px-2 py-1 text-sm font-semibold ${
                              company.premiumOverdue
                                ? "bg-red-50 text-red-700"
                                : "bg-violet-50 text-violet-800"
                            }`}
                          >
                            Premium page to build
                            {company.premiumDueAt
                              ? ` — due ${new Date(company.premiumDueAt).toLocaleDateString("en-GB", { timeZone: "Africa/Kigali", weekday: "short", day: "numeric", month: "short" })}`
                              : ""}
                            . Showing the Standard design until you switch Premium ON.
                          </p>
                        )}
                        {company.createdByAgentName && (
                          <p className="text-sm text-violet-700">
                            Onboarded by {company.createdByAgentName} (support team) · setup fee{" "}
                            {company.setupFee.toLocaleString("en-US")} RWF, member keeps {company.agentEarning.toLocaleString("en-US")} RWF
                          </p>
                        )}
                        {!company.subscriptionEnd && company.trialEndsAt && (
                          <p className="mt-1 inline-block rounded-lg bg-sky-50 px-2 py-1 text-sm font-semibold text-sky-800">
                            {company.trialActive
                              ? `Setup period — live until ${new Date(company.trialEndsAt).toLocaleDateString("en-GB")}. Use Renew to confirm the subscription.`
                              : "Setup period ended — offline until you confirm the subscription (Renew)."}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          Invite Code:{" "}
                          <span className="font-semibold text-gray-800">{company.inviteCode}</span>
                          {company.inviteUsed && <span className="ml-2 text-green-600">(used)</span>}
                        </p>
                      </div>

                      <div className="text-sm md:text-right">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 font-semibold ${
                            company.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {company.status}
                        </span>
                        <p className="mt-2 text-gray-500">
                          Days remaining:{" "}
                          <span
                            className={
                              isExpired ? "text-red-600 font-bold" : days !== null && days <= 5 ? "text-orange-600 font-bold" : "text-green-600 font-bold"
                            }
                          >
                            {days ?? "Not set"}
                          </span>
                        </p>
                        {days !== null && days > 0 && days <= 5 && (
                          <p className="mt-2 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2 text-orange-700 font-semibold">
                            ⚠️ Subscription ends in {days} day{days > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-3 rounded-2xl border border-[#f2ddd6] bg-white px-4 py-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={company.status === "active"}
                          onChange={() => setConfirmStatusCompany(company)}
                          className="h-5 w-5 accent-[#f08c6c]"
                        />
                        <span className="text-sm font-semibold">{company.status === "active" ? "Active" : "Inactive"}</span>
                      </label>

                      <label className="flex items-center gap-3 rounded-2xl border border-[#f2ddd6] bg-white px-4 py-2 cursor-pointer" title="Logo appears in the customer row on scandish.online (needs a logo and an active page)">
                        <input
                          type="checkbox"
                          checked={company.showOnHomepage}
                          disabled={busy}
                          onChange={(e) => run((t) => setShowOnHomepage(t, company.id, e.target.checked))}
                          className="h-5 w-5 accent-[#f08c6c]"
                        />
                        <span className="text-sm font-semibold">Show on homepage</span>
                      </label>

                      <div className="mt-4 w-full rounded-2xl border border-[#f2ddd6] bg-white p-4">
                        <p className="mb-3 text-sm font-bold" style={{ color: BRAND }}>Premium Controls</p>
                        <div className="grid gap-3 md:grid-cols-3">
                          <select
                            className="input"
                            disabled={busy}
                            value={company.plan}
                            onChange={(e) => run((t) => updatePremium(t, company.id, { plan: e.target.value as Plan }))}
                          >
                            <option value="standard">Standard</option>
                            <option value="premium">Premium</option>
                          </select>
                          <select
                            className="input"
                            disabled={busy}
                            value={company.premiumEnabled ? "true" : "false"}
                            onChange={(e) => run((t) => updatePremium(t, company.id, { premiumEnabled: e.target.value === "true" }))}
                          >
                            <option value="false">Premium OFF</option>
                            <option value="true">Premium ON</option>
                          </select>
                          <select
                            className="input"
                            disabled={busy}
                            value={company.premiumTemplate}
                            onChange={(e) =>
                              run((t) => updatePremium(t, company.id, { premiumTemplate: e.target.value as PremiumTemplate }))
                            }
                          >
                            <option value="default">Default Template</option>
                            <option value="camellia">Camellia Template</option>
                            <option value="sample">Sample Template</option>
                            <option value="freshy">Freshy Template</option>
                            <option value="studio">Design Studio page</option>
                          </select>
                        </div>
                        <div className="mt-3">
                          <SubdomainEditor
                            key={`${company.id}-${company.subdomain}`}
                            companyId={company.id}
                            current={company.subdomain}
                            premium={company.plan === "premium"}
                            suggestion={company.companyName}
                            onSaved={loadCompanies}
                          />
                        </div>
                        {company.slug && (
                          <a
                            href={company.subdomain ? `${subdomainUrl(company.subdomain)}/` : `/r/${company.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-block rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
                          >
                            Open Public Page
                          </a>
                        )}
                      </div>

                      <button onClick={() => setRenewCompany(company)} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">
                        Renew
                      </button>
                      <button
                        onClick={async () => {
                          setContractBusy(company.id);
                          const err = await downloadContract(company.id, company.companyName);
                          setContractBusy(null);
                          if (err) alert(err);
                        }}
                        disabled={contractBusy === company.id}
                        className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-50"
                      >
                        {contractBusy === company.id ? "Generating..." : "Contract PDF"}
                      </button>
                      <button onClick={() => setConfirmDeleteCompany(company)} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold">
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        </>
        )}

        <PoweredBy className="mt-10" />
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #efd6ce;
          border-radius: 16px;
          padding: 12px 14px;
          outline: none;
          background: white;
        }
        .input:focus {
          border-color: ${BRAND};
          box-shadow: 0 0 0 3px ${BRAND}22;
        }
      `}</style>

      {createdInvite && (
        <Dialog title="Company created">
          <p className="mt-3 text-gray-600">
            Send this invite code to <span className="font-bold">{createdInvite.name}</span>. The owner must sign up with the email you entered.
          </p>
          <p className="mt-4 rounded-2xl bg-[#fff8f5] p-4 text-center font-mono text-2xl font-bold tracking-widest">
            {createdInvite.code}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => navigator.clipboard?.writeText(createdInvite.code)}
              className="flex-1 rounded-2xl px-4 py-3 text-white font-semibold"
              style={{ backgroundColor: BRAND }}
            >
              Copy code
            </button>
            <button onClick={() => setCreatedInvite(null)} className="flex-1 rounded-2xl border border-[#efd6ce] px-4 py-3 font-semibold">
              Close
            </button>
          </div>
        </Dialog>
      )}

      {confirmStatusCompany && (
        <Dialog title="Confirm status change">
          <p className="mt-3 text-gray-600">
            Are you sure you want to{" "}
            <span className="font-bold">{confirmStatusCompany.status === "active" ? "deactivate" : "activate"}</span>{" "}
            {confirmStatusCompany.companyName}?
          </p>
          <div className="mt-6 flex gap-3">
            <button
              disabled={busy}
              onClick={async () => {
                const c = confirmStatusCompany;
                await run((t) => setCompanyStatus(t, c.id, c.status === "active" ? "inactive" : "active"));
                setConfirmStatusCompany(null);
              }}
              className="flex-1 rounded-2xl px-4 py-3 text-white font-semibold disabled:opacity-50"
              style={{ backgroundColor: BRAND }}
            >
              Yes, confirm
            </button>
            <button onClick={() => setConfirmStatusCompany(null)} className="flex-1 rounded-2xl border border-[#efd6ce] px-4 py-3 font-semibold">
              Cancel
            </button>
          </div>
        </Dialog>
      )}

      {confirmDeleteCompany && (
        <Dialog title="Delete company" danger>
          <p className="mt-3 text-gray-600">
            This deletes the company record for <span className="font-bold">{confirmDeleteCompany.companyName}</span> and takes
            its public page offline. The owner&apos;s menu data is kept.
          </p>
          <p className="mt-3 text-sm text-gray-500">
            Type <span className="font-bold">DELETE</span> to confirm.
          </p>
          <input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="Type DELETE" className="input mt-4" />
          <div className="mt-6 flex gap-3">
            <button
              disabled={deleteText !== "DELETE" || busy}
              onClick={async () => {
                const c = confirmDeleteCompany;
                if (await run((t) => deleteCompanyAction(t, c.id))) {
                  setConfirmDeleteCompany(null);
                  setDeleteText("");
                }
              }}
              className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-white font-semibold disabled:opacity-50"
            >
              Delete
            </button>
            <button
              onClick={() => {
                setConfirmDeleteCompany(null);
                setDeleteText("");
              }}
              className="flex-1 rounded-2xl border border-[#efd6ce] px-4 py-3 font-semibold"
            >
              Cancel
            </button>
          </div>
        </Dialog>
      )}

      {renewCompany && (
        <Dialog title="Renew Subscription">
          <p className="mt-2 text-gray-600">{renewCompany.companyName}</p>
          <div className="mt-4 space-y-3">
            {[
              [180, "6 Months (180 days)"],
              [365, "1 Year (365 days)"],
            ].map(([d, label]) => (
              <button
                key={d}
                onClick={() => setRenewDays(d as number)}
                className={`w-full border rounded-xl py-2 ${renewDays === d ? "border-[#f08c6c] font-bold" : ""}`}
              >
                {label}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={3650}
              placeholder="Custom days"
              value={renewDays}
              onChange={(e) => setRenewDays(Number(e.target.value))}
              className="input"
            />
          </div>
          <div className="mt-6 flex gap-3">
            <button
              disabled={busy}
              onClick={async () => {
                const c = renewCompany;
                if (await run((t) => renewAction(t, c.id, renewDays))) setRenewCompany(null);
              }}
              className="flex-1 rounded-2xl px-4 py-3 text-white font-semibold disabled:opacity-50"
              style={{ backgroundColor: BRAND }}
            >
              Confirm Renew
            </button>
            <button onClick={() => setRenewCompany(null)} className="flex-1 rounded-2xl border px-4 py-3">
              Cancel
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}

function Dialog({ title, danger, children }: { title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <h2 className={`text-xl font-bold ${danger ? "text-red-600" : ""}`}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
