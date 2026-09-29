"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Monitor,
  Rocket,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Upload,
} from "lucide-react";
import {
  deleteDesignPreset,
  loadStudio,
  loadStudioBusiness,
  publishDesign,
  saveDesignDraft,
  saveDesignPreset,
  type StudioBusiness,
  type StudioBusinessData,
  type StudioPreset,
} from "@/app/actions/studio";
import StudioTemplate from "@/components/studio/StudioTemplate";
import SubdomainEditor from "@/components/admin/SubdomainEditor";
import { subdomainHost, subdomainUrl } from "@/lib/domains";
import {
  CUSTOM_CSS_MAX,
  DEFAULT_DESIGN,
  FONTS,
  HERO_VARIANTS,
  SECTION_INFO,
  contrastRatio,
  cssProblem,
  type DesignConfig,
  type DesignSection,
} from "@/lib/design";
import { getIdToken, uploadFile } from "@/lib/firebase";
import { SAMPLE_CONTENT as SAMPLE } from "@/lib/studio-sample";
import type { RestaurantContent } from "@/lib/types";

const card = "rounded-3xl border border-[#f2ddd6] bg-white shadow-sm";
const field = "w-full rounded-xl border border-[#efd6ce] bg-white px-3 py-2 text-sm outline-none focus:border-[#f08c6c]";
const DEVICES = { phone: 390, tablet: 820, desktop: 1280 } as const;
type Device = keyof typeof DEVICES;

const json = (d: DesignConfig | null) => (d ? JSON.stringify(d) : "");
const when = (iso: string) =>
  iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Kigali", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export default function DesignStudioPanel() {
  const [businesses, setBusinesses] = useState<StudioBusiness[]>([]);
  const [presets, setPresets] = useState<StudioPreset[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState("");
  const [biz, setBiz] = useState<StudioBusinessData | null>(null);
  const [design, setDesign] = useState<DesignConfig>(DEFAULT_DESIGN);
  const [savedJson, setSavedJson] = useState(() => json(DEFAULT_DESIGN));
  const [useSample, setUseSample] = useState(false);
  const [device, setDevice] = useState<Device>("phone");
  const [busy, setBusy] = useState<"" | "load" | "save" | "publish" | "preset">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const applyStudio = useCallback((res: Awaited<ReturnType<typeof loadStudio>>) => {
    if (res.ok) {
      setBusinesses(res.data.businesses);
      setPresets(res.data.presets);
      setError("");
    } else setError(res.error);
    setReady(true);
  }, []);

  useEffect(() => {
    getIdToken()
      .then((t) => loadStudio(t))
      .then(applyStudio);
  }, [applyStudio]);

  const reloadStudio = async () => applyStudio(await loadStudio(await getIdToken()));

  const dirty = json(design) !== savedJson;
  const business = businesses.find((b) => b.id === selected) ?? null;
  const content = !biz || useSample || !hasAnyContent(biz.content) ? SAMPLE : biz.content;
  const showingSample = content === SAMPLE;

  const guard = () => !dirty || confirm("You have unsaved changes to this design. Discard them?");

  const selectBusiness = async (id: string) => {
    if (!guard()) return;
    setSelected(id);
    setMsg(null);
    setBiz(null);
    if (!id) {
      setSavedJson(json(design));
      return;
    }
    setBusy("load");
    try {
      const res = await loadStudioBusiness(await getIdToken(), id);
      if (!res.ok) return setMsg({ ok: false, text: res.error });
      setBiz(res.data);
      const start = res.data.draft ?? res.data.published;
      setDesign(start ?? DEFAULT_DESIGN);
      setSavedJson(json(start));
      setUseSample(false);
    } finally {
      setBusy("");
    }
  };

  const run = async (kind: "save" | "publish", action: (token: string) => Promise<{ ok: boolean; error?: string }>, success: string) => {
    const problem = design.customCss ? cssProblem(design.customCss) : null;
    if (problem) return setMsg({ ok: false, text: problem });
    setBusy(kind);
    setMsg(null);
    try {
      const res = await action(await getIdToken());
      if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Failed" });
      setSavedJson(json(design));
      setMsg({ ok: true, text: success });
      await reloadStudio();
    } finally {
      setBusy("");
    }
  };

  const update = (patch: Partial<DesignConfig>) => setDesign((d) => ({ ...d, ...patch }));
  const updateSection = (i: number, patch: Partial<DesignSection>) =>
    setDesign((d) => ({ ...d, sections: d.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const moveSection = (i: number, by: -1 | 1) =>
    setDesign((d) => {
      const list = [...d.sections];
      const j = i + by;
      if (j < 0 || j >= list.length) return d;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...d, sections: list };
    });

  if (!ready) {
    return (
      <div className={`${card} flex h-40 items-center justify-center`}>
        <Loader2 className="animate-spin text-[#f08c6c]" />
      </div>
    );
  }
  if (error) return <div className={`${card} p-6 text-sm text-red-600`}>{error}</div>;

  return (
    <div className="space-y-4">
      {/* Business + actions */}
      <div className={`${card} flex flex-col gap-4 p-5 lg:flex-row lg:items-center`}>
        <div className="flex-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500" htmlFor="studio-business">
            Business
          </label>
          <select id="studio-business" className={`${field} mt-1 text-base`} value={selected} onChange={(e) => selectBusiness(e.target.value)} disabled={busy !== ""}>
            <option value="">— No business (design presets with sample content) —</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.companyName}
                {b.premiumPending ? ` · Premium page waiting${b.premiumDueAt ? ` (due ${when(b.premiumDueAt)})` : ""}` : ""}
                {b.premiumEnabled && b.premiumTemplate === "studio" ? " · Studio page live" : ""}
                {b.plan === "standard" ? " · Standard" : ""}
              </option>
            ))}
          </select>
          {business && <BusinessStatus b={business} />}
          {business && (
            <div className="mt-3">
              <SubdomainEditor
                key={`${business.id}-${business.subdomain}`}
                companyId={business.id}
                current={business.subdomain}
                premium={business.plan === "premium"}
                suggestion={business.companyName}
                onSaved={reloadStudio}
              />
            </div>
          )}
        </div>
        {business && (
          <div className="flex flex-wrap gap-2">
            {business.slug && (
              <a href={business.subdomain ? `${subdomainUrl(business.subdomain)}/` : `/r/${business.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl border border-[#efd6ce] px-4 py-2.5 text-sm font-semibold text-gray-700">
                <ExternalLink size={16} /> Live page
              </a>
            )}
            <button
              onClick={() => run("save", (t) => saveDesignDraft(t, business.id, design), "Draft saved. The live page has not changed.")}
              disabled={!dirty || busy !== ""}
              className="flex items-center gap-2 rounded-2xl border border-[#efd6ce] px-4 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-40"
            >
              {busy === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save draft
            </button>
            <button
              onClick={() => setConfirmPublish(true)}
              disabled={busy !== ""}
              className="flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy === "publish" ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />} Publish
            </button>
          </div>
        )}
      </div>

      {msg && (
        <p role="status" className={`rounded-2xl border p-3 text-sm ${msg.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg.text}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Editor */}
        <div className={`${card} p-2 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto`}>
          {dirty && <p className="m-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Unsaved changes</p>}

          <Group title="Start from a preset" open>
            <PresetPicker
              presets={presets}
              onPick={(p) => {
                if (!guard()) return;
                setDesign(p.design);
                if (!selected) setSavedJson(json(p.design));
              }}
              onDelete={async (p) => {
                if (!confirm(`Delete the preset “${p.name}”? Pages already using it are not affected.`)) return;
                const res = await deleteDesignPreset(await getIdToken(), p.id);
                if (!res.ok) return setMsg({ ok: false, text: res.error });
                await reloadStudio();
              }}
            />
            <SavePreset
              busy={busy === "preset"}
              onSave={async (name, description) => {
                setBusy("preset");
                try {
                  const res = await saveDesignPreset(await getIdToken(), name, description, design);
                  if (!res.ok) {
                    setMsg({ ok: false, text: res.error });
                    return false;
                  }
                  setMsg({ ok: true, text: `Preset “${res.data.name}” saved. Use it as a starting point for any business.` });
                  await reloadStudio();
                  return true;
                } finally {
                  setBusy("");
                }
              }}
            />
          </Group>

          <Group title="Header">
            <Segmented value={design.hero.variant} options={HERO_VARIANTS} onChange={(v) => update({ hero: { ...design.hero, variant: v } })} />
            <Label text="Small line above the name (optional)">
              <input className={field} maxLength={80} value={design.hero.tagline} onChange={(e) => update({ hero: { ...design.hero, tagline: e.target.value } })} />
            </Label>
          </Group>

          <Group title="Sections & order">
            <ul className="space-y-2">
              {design.sections.map((s, i) => (
                <li key={s.type} className={`rounded-2xl border border-[#f2ddd6] p-3 ${s.visible ? "" : "bg-gray-50 opacity-70"}`}>
                  <div className="flex items-center gap-1">
                    <span className="flex-1 text-sm font-bold">{SECTION_INFO[s.type].label}</span>
                    <IconButton label="Move up" onClick={() => moveSection(i, -1)} disabled={i === 0}>
                      <ArrowUp size={14} />
                    </IconButton>
                    <IconButton label="Move down" onClick={() => moveSection(i, 1)} disabled={i === design.sections.length - 1}>
                      <ArrowDown size={14} />
                    </IconButton>
                    <IconButton label={s.visible ? "Hide section" : "Show section"} onClick={() => updateSection(i, { visible: !s.visible })}>
                      {s.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </IconButton>
                  </div>
                  {s.visible && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <select className={field} value={s.variant} onChange={(e) => updateSection(i, { variant: e.target.value })} aria-label={`${SECTION_INFO[s.type].label} style`}>
                        {SECTION_INFO[s.type].variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                      <input
                        className={field}
                        maxLength={40}
                        placeholder={SECTION_INFO[s.type].defaultTitle}
                        value={s.title}
                        onChange={(e) => updateSection(i, { title: e.target.value })}
                        aria-label={`${SECTION_INFO[s.type].label} heading`}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Group>

          <Group title="Colours">
            <Segmented
              value={design.mode}
              options={[
                { id: "light", label: "Light" },
                { id: "dark", label: "Dark" },
              ]}
              onChange={(v) => update({ mode: v })}
            />
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["background", "Page background"],
                  ["surface", "Cards"],
                  ["text", "Text"],
                  ["muted", "Soft text"],
                  ["accent", "Accent"],
                  ["accentText", "Text on accent"],
                ] as const
              ).map(([key, label]) => (
                <ColorField key={key} label={label} value={design.colors[key]} onChange={(v) => update({ colors: { ...design.colors, [key]: v } })} />
              ))}
            </div>
            <ContrastWarnings d={design} />
          </Group>

          <Group title="Fonts">
            <Label text="Headings">
              <FontSelect value={design.fonts.heading} onChange={(v) => update({ fonts: { ...design.fonts, heading: v } })} />
            </Label>
            <Label text="Body text">
              <FontSelect value={design.fonts.body} onChange={(v) => update({ fonts: { ...design.fonts, body: v } })} />
            </Label>
            <Segmented
              value={design.headingCase}
              options={[
                { id: "normal", label: "Aa Normal" },
                { id: "upper", label: "AA Capitals" },
              ]}
              onChange={(v) => update({ headingCase: v })}
            />
          </Group>

          <Group title="Shape, spacing & motion">
            <Label text="Corners">
              <Segmented
                value={design.radius}
                options={[
                  { id: "none", label: "Square" },
                  { id: "soft", label: "Soft" },
                  { id: "round", label: "Round" },
                  { id: "pill", label: "Pill" },
                ]}
                onChange={(v) => update({ radius: v })}
              />
            </Label>
            <Label text="Spacing between sections">
              <Segmented
                value={design.spacing}
                options={[
                  { id: "compact", label: "Compact" },
                  { id: "comfortable", label: "Comfortable" },
                  { id: "airy", label: "Airy" },
                ]}
                onChange={(v) => update({ spacing: v })}
              />
            </Label>
            <Label text="Buttons">
              <Segmented
                value={design.buttons}
                options={[
                  { id: "solid", label: "Filled" },
                  { id: "outline", label: "Outline" },
                ]}
                onChange={(v) => update({ buttons: v })}
              />
            </Label>
            <Label text="Sections appear with">
              <Segmented
                value={design.animation}
                options={[
                  { id: "none", label: "No motion" },
                  { id: "fade", label: "Fade" },
                  { id: "rise", label: "Rise" },
                ]}
                onChange={(v) => update({ animation: v })}
              />
            </Label>
          </Group>

          <Group title="Page background">
            <Segmented
              value={design.background.style}
              options={[
                { id: "plain", label: "Plain" },
                { id: "gradient", label: "Gradient" },
                { id: "image", label: "Photo" },
              ]}
              onChange={(v) => update({ background: { ...design.background, style: v } })}
            />
            {design.background.style === "image" && (
              <BackgroundImage
                value={design.background}
                onChange={(background) => update({ background })}
                onError={(text) => setMsg({ ok: false, text })}
              />
            )}
          </Group>

          <Group title="Custom CSS (advanced)">
            <CustomCss value={design.customCss} onChange={(customCss) => update({ customCss })} />
          </Group>
        </div>

        {/* Preview */}
        <div className={`${card} flex min-w-0 flex-col p-3 lg:sticky lg:top-4 lg:h-[calc(100vh-7rem)]`}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-gray-100 p-1">
              {(
                [
                  ["phone", Smartphone],
                  ["tablet", Tablet],
                  ["desktop", Monitor],
                ] as const
              ).map(([id, Icon]) => (
                <button
                  key={id}
                  onClick={() => setDevice(id)}
                  aria-pressed={device === id}
                  aria-label={`${id} preview`}
                  className={`rounded-lg px-3 py-1.5 ${device === id ? "bg-white shadow-sm" : "text-gray-500"}`}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
            {biz && hasAnyContent(biz.content) && (
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                <input type="checkbox" checked={useSample} onChange={(e) => setUseSample(e.target.checked)} className="accent-[#f08c6c]" />
                Preview with sample content
              </label>
            )}
            <span className="ml-auto text-xs text-gray-400">
              {showingSample ? (biz ? "This business has no content yet — showing sample content" : "Sample content") : `Real content of ${biz?.content.name || "the business"}`}
            </span>
          </div>
          <Preview device={device}>
            {busy === "load" ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="animate-spin text-[#f08c6c]" />
              </div>
            ) : (
              <StudioTemplate restaurant={content} design={design} preview />
            )}
          </Preview>
        </div>
      </div>

      {confirmPublish && business && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold">Publish {business.companyName}&apos;s page?</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
              <li>
                The page <strong>{business.subdomain ? subdomainHost(business.subdomain) : `/r/${business.slug}`}</strong> switches to this Design Studio design right away.
              </li>
              <li>The business is set to Premium with Premium ON{business.premiumPending ? ", and its waiting Premium page is marked delivered" : ""}.</li>
              {business.premiumTemplate !== "studio" && business.premiumEnabled && (
                <li>It currently uses the coded “{business.premiumTemplate}” template — that is replaced by this design.</li>
              )}
              <li>The owner&apos;s menu, photos and details stay the same.</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <button
                onClick={async () => {
                  setConfirmPublish(false);
                  await run("publish", (t) => publishDesign(t, business.id, design), `Published — ${business.subdomain ? subdomainHost(business.subdomain) : `/r/${business.slug}`} now shows this design.`);
                }}
                className="flex-1 rounded-2xl bg-gray-900 px-4 py-3 font-semibold text-white"
              >
                Publish now
              </button>
              <button onClick={() => setConfirmPublish(false)} className="flex-1 rounded-2xl border border-[#efd6ce] px-4 py-3 font-semibold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function hasAnyContent(c: RestaurantContent) {
  return Boolean(c.coverImage || c.logo || c.about || c.menu.some((m) => m.items.length > 0));
}

function BusinessStatus({ b }: { b: StudioBusiness }) {
  const live = b.premiumEnabled && b.plan === "premium";
  return (
    <p className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
      <span className={`rounded-full px-2.5 py-1 ${live ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
        Live page: {live ? (b.premiumTemplate === "studio" ? "Design Studio" : `coded template “${b.premiumTemplate}”`) : "Standard design"}
      </span>
      {b.premiumPending && (
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-800">Premium page waiting{b.premiumDueAt ? ` — due ${when(b.premiumDueAt)}` : ""}</span>
      )}
      {b.designPublishedAt && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">Last published {when(b.designPublishedAt)}</span>}
      {b.hasDraft && !b.hasPublished && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">Draft saved, not published</span>}
    </p>
  );
}

/* ---------- Preview frame ---------- */

function Preview({ device, children }: { device: Device; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const width = DEVICES[device];
  const zoom = available ? Math.min(1, available / width) : 1;

  return (
    <div ref={box} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-2xl bg-gray-100">
      <div className="mx-auto overflow-hidden bg-white shadow-sm" style={{ width, zoom }}>
        {children}
      </div>
    </div>
  );
}

/* ---------- Editor controls ---------- */

function Group({ title, open = false, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group border-b border-[#f7ebe6] last:border-0">
      <summary className="cursor-pointer list-none px-3 py-3 text-sm font-bold marker:hidden hover:bg-[#fff8f5]">
        <span className="mr-2 inline-block text-[#f08c6c] transition group-open:rotate-90">›</span>
        {title}
      </summary>
      <div className="space-y-3 px-3 pb-4">{children}</div>
    </details>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-500">{text}</span>
      {children}
    </label>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: readonly { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold ${value === o.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
      {children}
    </button>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [prev, setPrev] = useState(value);
  // Follow outside changes (preset picked) while still allowing typing a partial hex.
  if (value !== prev) {
    setPrev(value);
    setDraft(value);
  }
  return (
    <label className="flex items-center gap-2 rounded-xl border border-[#efd6ce] p-1.5">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0" aria-label={label} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-semibold text-gray-500">{label}</span>
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value.toLowerCase());
          }}
          className="w-full bg-transparent font-mono text-xs outline-none"
          aria-label={`${label} hex`}
        />
      </span>
    </label>
  );
}

function ContrastWarnings({ d }: { d: DesignConfig }) {
  const checks: [string, string, string, number][] = [
    ["Text on page background", d.colors.text, d.colors.background, 4.5],
    ["Text on cards", d.colors.text, d.colors.surface, 4.5],
    ["Soft text on page background", d.colors.muted, d.colors.background, 3],
    ["Text on accent", d.colors.accentText, d.colors.accent, 3],
  ];
  const failing = checks.filter(([, a, b, min]) => contrastRatio(a, b) < min);
  if (!failing.length) {
    return (
      <p className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
        <CheckCircle2 size={14} /> All colour pairs are easy to read
      </p>
    );
  }
  return (
    <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
      <p className="flex items-center gap-1.5 font-bold">
        <AlertTriangle size={14} /> Hard to read on some phones:
      </p>
      <ul className="mt-1 list-disc pl-5">
        {failing.map(([label, a, b]) => (
          <li key={label}>
            {label} ({contrastRatio(a, b).toFixed(1)}:1)
          </li>
        ))}
      </ul>
    </div>
  );
}

function FontSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className={field} value={value} onChange={(e) => onChange(e.target.value)}>
      {FONTS.map((f) => (
        <option key={f.name} value={f.name}>
          {f.name}
        </option>
      ))}
    </select>
  );
}

function PresetPicker({ presets, onPick, onDelete }: { presets: StudioPreset[]; onPick: (p: StudioPreset) => void; onDelete: (p: StudioPreset) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {presets.map((p) => (
        <div key={p.id} className="group relative">
          <button
            type="button"
            onClick={() => onPick(p)}
            title={p.description}
            className="w-full rounded-2xl border border-[#f2ddd6] p-2 text-left transition hover:border-[#f08c6c]"
          >
            <span className="flex h-10 overflow-hidden rounded-xl">
              {[p.design.colors.background, p.design.colors.surface, p.design.colors.accent, p.design.colors.text].map((c, i) => (
                <span key={i} className="flex-1" style={{ background: c }} />
              ))}
            </span>
            <span className="mt-1.5 block truncate text-xs font-bold">{p.name}</span>
            <span className="block truncate text-[11px] text-gray-400">{p.builtIn ? "Built-in" : "Your preset"}</span>
          </button>
          {!p.builtIn && (
            <button
              type="button"
              onClick={() => onDelete(p)}
              aria-label={`Delete preset ${p.name}`}
              className="absolute right-1 top-1 rounded-lg bg-white/90 p-1 text-red-500 opacity-0 shadow group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function SavePreset({ busy, onSave }: { busy: boolean; onSave: (name: string, description: string) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  return (
    <div className="rounded-2xl bg-[#fff8f5] p-3">
      <p className="text-xs font-bold text-gray-600">Save the current design as a preset</p>
      <input className={`${field} mt-2`} placeholder="Preset name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      <input className={`${field} mt-2`} placeholder="Short description (optional)" maxLength={120} value={description} onChange={(e) => setDescription(e.target.value)} />
      <button
        type="button"
        disabled={busy || !name.trim()}
        onClick={async () => {
          if (await onSave(name, description)) {
            setName("");
            setDescription("");
          }
        }}
        className="mt-2 w-full rounded-xl bg-[#f08c6c] py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        {busy ? "Saving..." : "Save preset"}
      </button>
    </div>
  );
}

function BackgroundImage({
  value,
  onChange,
  onError,
}: {
  value: DesignConfig["background"];
  onChange: (v: DesignConfig["background"]) => void;
  onError: (text: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#efd6ce] px-3 py-2.5 text-sm text-gray-600 hover:bg-[#fff8f5]">
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        {value.image ? "Replace background photo" : "Upload background photo"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={uploading}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setUploading(true);
            try {
              onChange({ ...value, image: await uploadFile(file) });
            } catch (err) {
              onError(err instanceof Error ? err.message : "Upload failed");
            } finally {
              setUploading(false);
            }
          }}
        />
      </label>
      {value.image && <img src={value.image} alt="" className="h-20 w-full rounded-xl object-cover" />}
      <Label text={`Colour veil over the photo: ${value.overlay}%`}>
        <input type="range" min={0} max={95} value={value.overlay} onChange={(e) => onChange({ ...value, overlay: Number(e.target.value) })} className="w-full accent-[#f08c6c]" />
      </Label>
    </div>
  );
}

function CustomCss({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const problem = useMemo(() => (value ? cssProblem(value) : null), [value]);
  return (
    <div className="space-y-2">
      <p className="text-xs leading-5 text-gray-500">
        Applies to this page only. Useful classes: <code>.sd-h</code> headings, <code>.sd-btn</code> buttons, <code>.sd-surface</code> cards,{" "}
        <code>.sd-accent</code>, <code>.sd-section</code>, <code>#menu</code>, <code>#gallery</code>. Images must be ScanDish (Cloudinary) links.
      </p>
      <textarea
        className={`${field} min-h-40 font-mono text-xs`}
        spellCheck={false}
        maxLength={CUSTOM_CSS_MAX}
        placeholder={".sd-h { letter-spacing: 0.08em; }\n#menu .sd-surface { box-shadow: 0 10px 30px rgb(0 0 0 / 0.08); }"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className={`text-xs ${problem ? "font-semibold text-red-600" : "text-gray-400"}`}>
        {problem ?? `${value.length} / ${CUSTOM_CSS_MAX}`}
      </p>
    </div>
  );
}
