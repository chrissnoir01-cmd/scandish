"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Globe, Loader2, XCircle } from "lucide-react";
import { checkSubdomain, setSubdomain, type SubdomainCheck } from "@/app/actions/admin";
import { ROOT_DOMAIN, normalizeSubdomain, subdomainHost, subdomainProblem, subdomainUrl } from "@/lib/domains";
import { getIdToken } from "@/lib/firebase";

/**
 * Set or change a Premium business's subdomain. Availability is checked as you type;
 * a changed name keeps redirecting from the old address.
 */
export default function SubdomainEditor({
  companyId,
  current,
  premium,
  suggestion,
  onSaved,
}: {
  companyId: string;
  current: string;
  premium: boolean;
  /** Pre-filled when the business has no subdomain yet (usually from its name). */
  suggestion: string;
  onSaved: (subdomain: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState(current || suggest(suggestion));
  const [check, setCheck] = useState<SubdomainCheck | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const name = normalizeSubdomain(value);
  const unchanged = name === current;
  const localProblem = subdomainProblem(name);

  useEffect(() => {
    if (unchanged || localProblem) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      getIdToken()
        .then((t) => checkSubdomain(t, name, companyId))
        .then((res) => {
          if (!cancelled) setCheck(res.ok ? res.data : { name, available: false, reason: res.error });
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [name, unchanged, localProblem, companyId]);

  const status: { ok: boolean; text: string } | null = unchanged
    ? null
    : localProblem
      ? { ok: false, text: localProblem }
      : check?.name === name
        ? { ok: check.available, text: check.available ? "Available" : check.reason }
        : null;

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await setSubdomain(await getIdToken(), companyId, name);
      if (!res.ok) return setMessage({ ok: false, text: res.error });
      setMessage({
        ok: true,
        text: current
          ? `Changed. ${subdomainHost(current)} now redirects to ${subdomainHost(name)}.`
          : `Live at ${subdomainHost(name)}. The old /r/ link and printed QR codes now open this address.`,
      });
      await onSaved(res.data.subdomain);
    } finally {
      setSaving(false);
    }
  };

  if (!premium) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">
        <Globe size={14} /> Own address (name.{ROOT_DOMAIN}) is available once the plan is Premium.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-[#f2ddd6] bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold text-gray-600">
        <Globe size={14} className="text-[#f08c6c]" /> Own address
        {current && (
          <a href={`${subdomainUrl(current)}/`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-[#d9694a]">
            {subdomainHost(current)} <ExternalLink size={12} />
          </a>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex flex-1 items-center rounded-xl border border-[#efd6ce] bg-white pr-3 focus-within:border-[#f08c6c]">
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value.toLowerCase().replace(/\s+/g, "-"));
              setMessage(null);
            }}
            maxLength={32}
            spellCheck={false}
            aria-label="Subdomain"
            className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm outline-none"
          />
          <span className="shrink-0 font-mono text-sm text-gray-400">.{ROOT_DOMAIN}</span>
        </label>
        <button
          type="button"
          onClick={save}
          disabled={saving || unchanged || !status?.ok}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Saving..." : current ? "Change address" : "Activate address"}
        </button>
      </div>
      {!unchanged && (
        <p className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${status ? (status.ok ? "text-green-700" : "text-red-600") : "text-gray-400"}`}>
          {status ? status.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} /> : <Loader2 size={14} className="animate-spin" />}
          {status ? status.text : "Checking..."}
          {current && status?.ok && " — the current address will redirect to the new one"}
        </p>
      )}
      {message && <p className={`mt-2 text-xs font-semibold ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>}
    </div>
  );
}

/** "Kiza Restaurant Ltd" → "kiza-restaurant" (drops common company suffixes). */
function suggest(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(ltd|limited|llc|inc|co|company|sarl)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/, "");
}
