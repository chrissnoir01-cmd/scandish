/**
 * Design Studio: a Premium page described as data (colours, fonts, section styles and order),
 * rendered by components/studio/StudioTemplate. Shared by the MasterAdmin editor, the server
 * (validation) and the public page. Hand-coded templates remain available alongside it.
 */

export type HeroVariant = "cover" | "split" | "centered" | "minimal";
export type SectionType = "offers" | "about" | "menu" | "gallery" | "contact";

export interface DesignSection {
  type: SectionType;
  variant: string;
  visible: boolean;
  /** Heading shown on the page; "" uses the default for the section. */
  title: string;
}

export interface DesignConfig {
  version: 1;
  mode: "light" | "dark";
  colors: { background: string; surface: string; text: string; muted: string; accent: string; accentText: string };
  fonts: { heading: string; body: string };
  headingCase: "normal" | "upper";
  radius: "none" | "soft" | "round" | "pill";
  spacing: "compact" | "comfortable" | "airy";
  buttons: "solid" | "outline";
  background: { style: "plain" | "gradient" | "image"; image: string; overlay: number };
  animation: "none" | "fade" | "rise";
  hero: { variant: HeroVariant; tagline: string };
  sections: DesignSection[];
  customCss: string;
}

export const HERO_VARIANTS: { id: HeroVariant; label: string }[] = [
  { id: "cover", label: "Full-screen photo" },
  { id: "split", label: "Photo beside text" },
  { id: "centered", label: "Centered logo" },
  { id: "minimal", label: "Minimal header" },
];

export const SECTION_INFO: Record<SectionType, { label: string; defaultTitle: string; variants: { id: string; label: string }[] }> = {
  offers: {
    label: "Offers",
    defaultTitle: "Today's offers",
    variants: [
      { id: "ribbon", label: "Ribbon" },
      { id: "cards", label: "Cards" },
    ],
  },
  about: {
    label: "About",
    defaultTitle: "Our story",
    variants: [
      { id: "quote", label: "Big quote" },
      { id: "split", label: "Text + photo" },
    ],
  },
  menu: {
    label: "Menu",
    defaultTitle: "Menu",
    variants: [
      { id: "cards", label: "Photo cards" },
      { id: "list", label: "Elegant list" },
      { id: "grid", label: "Square grid" },
      { id: "tabs", label: "Category tabs" },
    ],
  },
  gallery: {
    label: "Gallery",
    defaultTitle: "Gallery",
    variants: [
      { id: "carousel", label: "Carousel" },
      { id: "grid", label: "Grid" },
      { id: "mosaic", label: "Mosaic" },
    ],
  },
  contact: {
    label: "Location & contact",
    defaultTitle: "Find us",
    variants: [
      { id: "map", label: "Map + directions" },
      { id: "compact", label: "Compact card" },
    ],
  },
};

export const SECTION_TYPES = Object.keys(SECTION_INFO) as SectionType[];

/** Cover beside the text ("split" header): half the width on wider screens. */
export const SPLIT_COVER_SIZES = "(min-width: 768px) 50vw, 100vw";

/** Google Fonts offered in the studio, with the weights each one actually has. */
export const FONTS: { name: string; weights: string; fallback: string }[] = [
  { name: "Inter", weights: "400;500;600;700;800", fallback: "system-ui, sans-serif" },
  { name: "DM Sans", weights: "400;500;700", fallback: "system-ui, sans-serif" },
  { name: "Outfit", weights: "400;500;600;700;800", fallback: "system-ui, sans-serif" },
  { name: "Poppins", weights: "400;500;600;700;800", fallback: "system-ui, sans-serif" },
  { name: "Montserrat", weights: "400;500;600;700;800", fallback: "system-ui, sans-serif" },
  { name: "Nunito", weights: "400;600;700;800", fallback: "system-ui, sans-serif" },
  { name: "Lato", weights: "400;700;900", fallback: "system-ui, sans-serif" },
  { name: "Space Grotesk", weights: "400;500;600;700", fallback: "system-ui, sans-serif" },
  { name: "Josefin Sans", weights: "400;600;700", fallback: "system-ui, sans-serif" },
  { name: "Oswald", weights: "400;500;600;700", fallback: "Impact, sans-serif" },
  { name: "Bebas Neue", weights: "400", fallback: "Impact, sans-serif" },
  { name: "Playfair Display", weights: "400;600;700;800", fallback: "Georgia, serif" },
  { name: "Cormorant Garamond", weights: "400;500;600;700", fallback: "Georgia, serif" },
  { name: "DM Serif Display", weights: "400", fallback: "Georgia, serif" },
  { name: "Fraunces", weights: "400;600;700;800", fallback: "Georgia, serif" },
  { name: "Libre Baskerville", weights: "400;700", fallback: "Georgia, serif" },
  { name: "Lora", weights: "400;500;600;700", fallback: "Georgia, serif" },
  { name: "Source Serif 4", weights: "400;600;700", fallback: "Georgia, serif" },
  { name: "Pacifico", weights: "400", fallback: "cursive" },
  { name: "Great Vibes", weights: "400", fallback: "cursive" },
];

const fontByName = new Map(FONTS.map((f) => [f.name, f]));

export const fontStack = (name: string) => {
  const f = fontByName.get(name) ?? FONTS[0];
  return `"${f.name}", ${f.fallback}`;
};

export function googleFontsHref(fonts: DesignConfig["fonts"]): string {
  const names = [...new Set([fonts.heading, fonts.body])].filter((n) => fontByName.has(n));
  const families = names.map((n) => `family=${n.replace(/ /g, "+")}:wght@${fontByName.get(n)!.weights}`);
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

const sections = (spec: [SectionType, string][]): DesignSection[] => [
  ...spec.map(([type, variant]) => ({ type, variant, visible: true, title: "" })),
  // Any section a preset leaves out is appended hidden, so every type is always configurable.
  ...SECTION_TYPES.filter((t) => !spec.some(([s]) => s === t)).map((type) => ({
    type,
    variant: SECTION_INFO[type].variants[0].id,
    visible: false,
    title: "",
  })),
];

const base: Omit<DesignConfig, "mode" | "colors" | "fonts" | "hero" | "sections"> = {
  version: 1,
  headingCase: "normal",
  radius: "round",
  spacing: "comfortable",
  buttons: "solid",
  background: { style: "plain", image: "", overlay: 70 },
  animation: "rise",
  customCss: "",
};

export const BUILTIN_PRESETS: { id: string; name: string; description: string; design: DesignConfig }[] = [
  {
    id: "builtin:camellia-night",
    name: "Camellia Night",
    description: "Dark luxury, full-screen photo — the Camellia look",
    design: {
      ...base,
      mode: "dark",
      colors: { background: "#0b0706", surface: "#171210", text: "#f7efe9", muted: "#b9a89f", accent: "#f08c6c", accentText: "#1a0f0b" },
      fonts: { heading: "Playfair Display", body: "Inter" },
      hero: { variant: "cover", tagline: "Luxury dining experience" },
      sections: sections([["offers", "ribbon"], ["about", "quote"], ["menu", "cards"], ["gallery", "mosaic"], ["contact", "map"]]),
    },
  },
  {
    id: "builtin:classic-bistro",
    name: "Classic Bistro",
    description: "Warm cream and serif type, elegant menu list",
    design: {
      ...base,
      mode: "light",
      colors: { background: "#faf6ef", surface: "#ffffff", text: "#2b2118", muted: "#7b6a5a", accent: "#8c3b2a", accentText: "#ffffff" },
      fonts: { heading: "Cormorant Garamond", body: "Lora" },
      radius: "soft",
      hero: { variant: "split", tagline: "Since day one, made with care" },
      sections: sections([["about", "quote"], ["menu", "list"], ["offers", "cards"], ["gallery", "grid"], ["contact", "map"]]),
    },
  },
  {
    id: "builtin:fresh-garden",
    name: "Fresh Garden",
    description: "Bright greens, rounded and friendly",
    design: {
      ...base,
      mode: "light",
      colors: { background: "#f4faf3", surface: "#ffffff", text: "#163822", muted: "#5b7862", accent: "#23874b", accentText: "#ffffff" },
      fonts: { heading: "Outfit", body: "DM Sans" },
      radius: "pill",
      background: { style: "gradient", image: "", overlay: 70 },
      hero: { variant: "centered", tagline: "Fresh every day" },
      sections: sections([["offers", "cards"], ["menu", "grid"], ["about", "split"], ["gallery", "carousel"], ["contact", "compact"]]),
    },
  },
  {
    id: "builtin:urban-street",
    name: "Urban Street",
    description: "Bold black and yellow, big condensed headings",
    design: {
      ...base,
      mode: "dark",
      colors: { background: "#111111", surface: "#1c1c1c", text: "#ffffff", muted: "#a3a3a3", accent: "#ffc400", accentText: "#111111" },
      fonts: { heading: "Bebas Neue", body: "Inter" },
      headingCase: "upper",
      radius: "none",
      hero: { variant: "cover", tagline: "Street food, done right" },
      sections: sections([["menu", "tabs"], ["offers", "ribbon"], ["gallery", "grid"], ["about", "split"], ["contact", "compact"]]),
    },
  },
  {
    id: "builtin:cafe-pastel",
    name: "Café Pastel",
    description: "Soft pink café style with playful serif",
    design: {
      ...base,
      mode: "light",
      colors: { background: "#fff7f3", surface: "#ffffff", text: "#3d2c2e", muted: "#8d7a7c", accent: "#c2536d", accentText: "#ffffff" },
      fonts: { heading: "Fraunces", body: "Nunito" },
      hero: { variant: "split", tagline: "Coffee, cakes & good company" },
      sections: sections([["offers", "cards"], ["menu", "cards"], ["gallery", "carousel"], ["about", "quote"], ["contact", "map"]]),
    },
  },
  {
    id: "builtin:ocean-minimal",
    name: "Ocean Minimal",
    description: "Clean white and blue, calm and modern",
    design: {
      ...base,
      mode: "light",
      colors: { background: "#ffffff", surface: "#f3f6f9", text: "#0f1f2e", muted: "#5b6b7a", accent: "#1f5fd1", accentText: "#ffffff" },
      fonts: { heading: "Space Grotesk", body: "Inter" },
      radius: "soft",
      animation: "fade",
      hero: { variant: "minimal", tagline: "" },
      sections: sections([["menu", "list"], ["offers", "ribbon"], ["about", "split"], ["gallery", "grid"], ["contact", "map"]]),
    },
  },
];

export const DEFAULT_DESIGN: DesignConfig = BUILTIN_PRESETS[0].design;

/* ---------- Validation (lenient reading, strict limits) ---------- */

const HEX = /^#[0-9a-f]{6}$/i;
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const color = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : fallback);
const imageUrl = (v: unknown) => (typeof v === "string" && /^https:\/\/res\.cloudinary\.com\/[\w./%-]+$/.test(v) ? v : "");

export const CUSTOM_CSS_MAX = 8000;

/** Why custom CSS can't be used, or null. Keeps it inside its page and away from anything but styling. */
export function cssProblem(css: string): string | null {
  if (css.length > CUSTOM_CSS_MAX) return `Custom CSS is too long (max ${CUSTOM_CSS_MAX} characters)`;
  // "<" could close the <style> tag; backslashes could hide blocked words behind CSS escapes.
  if (css.includes("<")) return "Custom CSS can't contain “<”";
  if (css.includes("\\")) return "Custom CSS can't contain backslashes";
  if (/@import|@charset|@namespace/i.test(css)) return "@import is not allowed in custom CSS";
  if (/expression\s*\(|javascript:|behavior\s*:|-moz-binding/i.test(css)) return "Custom CSS contains a blocked expression";
  // Only images already uploaded to ScanDish: every url(...) must be a Cloudinary link.
  const withoutAllowed = css.replace(/url\(\s*(['"]?)https:\/\/res\.cloudinary\.com\/[^'"()\s]*\1\s*\)/gi, "");
  if (/url\s*\(|image-set\s*\(|src\s*\(/i.test(withoutAllowed)) {
    return "Images in custom CSS must be uploaded to ScanDish (Cloudinary links only)";
  }
  let depth = 0;
  for (const ch of css) {
    if (ch === "{") depth++;
    else if (ch === "}" && --depth < 0) return "Custom CSS has an extra “}”";
  }
  if (depth !== 0) return "Custom CSS has an unclosed “{”";
  return null;
}

/** Reads any stored or submitted value into a complete, safe design. Invalid custom CSS is dropped. */
export function normalizeDesign(raw: unknown): DesignConfig {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const def = DEFAULT_DESIGN;
  const c = (d.colors ?? {}) as Record<string, unknown>;
  const f = (d.fonts ?? {}) as Record<string, unknown>;
  const bg = (d.background ?? {}) as Record<string, unknown>;
  const hero = (d.hero ?? {}) as Record<string, unknown>;

  const seen = new Set<SectionType>();
  const list: DesignSection[] = [];
  for (const s of Array.isArray(d.sections) ? d.sections : []) {
    const x = (s ?? {}) as Record<string, unknown>;
    const type = x.type as SectionType;
    if (!SECTION_TYPES.includes(type) || seen.has(type)) continue;
    seen.add(type);
    const variants = SECTION_INFO[type].variants.map((v) => v.id);
    list.push({ type, variant: pick(x.variant as string, variants, variants[0]), visible: x.visible !== false, title: text(x.title, 40) });
  }
  for (const type of SECTION_TYPES) {
    if (!seen.has(type)) list.push({ type, variant: SECTION_INFO[type].variants[0].id, visible: false, title: "" });
  }

  const overlay = typeof bg.overlay === "number" && Number.isFinite(bg.overlay) ? Math.round(Math.min(95, Math.max(0, bg.overlay))) : 70;
  const customCss = typeof d.customCss === "string" ? d.customCss.slice(0, CUSTOM_CSS_MAX) : "";

  return {
    version: 1,
    mode: pick(d.mode as string, ["light", "dark"] as const, def.mode),
    colors: {
      background: color(c.background, def.colors.background),
      surface: color(c.surface, def.colors.surface),
      text: color(c.text, def.colors.text),
      muted: color(c.muted, def.colors.muted),
      accent: color(c.accent, def.colors.accent),
      accentText: color(c.accentText, def.colors.accentText),
    },
    fonts: {
      heading: fontByName.has(f.heading as string) ? (f.heading as string) : def.fonts.heading,
      body: fontByName.has(f.body as string) ? (f.body as string) : def.fonts.body,
    },
    headingCase: pick(d.headingCase as string, ["normal", "upper"] as const, "normal"),
    radius: pick(d.radius as string, ["none", "soft", "round", "pill"] as const, "round"),
    spacing: pick(d.spacing as string, ["compact", "comfortable", "airy"] as const, "comfortable"),
    buttons: pick(d.buttons as string, ["solid", "outline"] as const, "solid"),
    background: { style: pick(bg.style as string, ["plain", "gradient", "image"] as const, "plain"), image: imageUrl(bg.image), overlay },
    animation: pick(d.animation as string, ["none", "fade", "rise"] as const, "rise"),
    hero: { variant: pick(hero.variant as string, HERO_VARIANTS.map((h) => h.id), "cover"), tagline: text(hero.tagline, 80) },
    sections: list,
    customCss: cssProblem(customCss) ? "" : customCss,
  };
}

/* ---------- Contrast (WCAG) for editor warnings ---------- */

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
