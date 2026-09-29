"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Car, Coffee, Flame, Globe, MapPin, Music, Phone, Search, Share2, Star, Tag, Truck, Wifi, type LucideIcon } from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa6";
import {
  directionsUrl,
  facebookUrl,
  instagramUrl,
  mapEmbedUrl,
  optimizeImage,
  phoneUrl,
  responsiveImage,
  sharePage,
  tiktokUrl,
  websiteUrl,
  whatsappUrl,
} from "@/lib/links";
import { SECTION_INFO, SPLIT_COVER_SIZES, cssProblem, fontStack, googleFontsHref, type DesignConfig, type DesignSection } from "@/lib/design";
import type { MenuItem, PublicRestaurant, RestaurantContent } from "@/lib/types";
import { ROOT_URL } from "@/lib/domains";
import MenuViewSwitcher, { useMenuView, type MenuView } from "@/components/menu/MenuViewSwitcher";
import { AddToOrder, OrderToggle } from "@/components/order/OrderProvider";

type Content = RestaurantContent & { slug?: string };

const RADIUS = {
  none: ["0", "0", "0"],
  soft: ["10px", "8px", "10px"],
  round: ["22px", "18px", "14px"],
  pill: ["28px", "24px", "999px"],
} as const;
const SPACE = { compact: "3rem", comfortable: "5rem", airy: "7.5rem" } as const;

const OFFER_ICONS: Record<string, LucideIcon> = { wifi: Wifi, truck: Truck, car: Car, music: Music, coffee: Coffee, tag: Tag, flame: Flame, phone: Phone };

function pageBackground(d: DesignConfig): string {
  const { background: bg, colors } = d;
  if (bg.style === "gradient") return `linear-gradient(180deg, ${colors.background} 0%, color-mix(in srgb, ${colors.accent} 12%, ${colors.background}) 100%)`;
  if (bg.style === "image" && bg.image) {
    const veil = `color-mix(in srgb, ${colors.background} ${bg.overlay}%, transparent)`;
    return `linear-gradient(${veil}, ${veil}), url("${optimizeImage(bg.image, 1600)}") center / cover`;
  }
  return colors.background;
}

/**
 * A Premium page built in the Design Studio. `preview` is set inside the MasterAdmin editor,
 * where the page sits in a scrolling panel instead of the whole window.
 */
export default function StudioTemplate({ restaurant, design, preview = false }: { restaurant: Content | PublicRestaurant; design: DesignConfig; preview?: boolean }) {
  const d = design;
  const [radius, radiusImg, radiusBtn] = RADIUS[d.radius];
  const vars = {
    "--sd-bg": d.colors.background,
    "--sd-page-bg": pageBackground(d),
    "--sd-surface": d.colors.surface,
    "--sd-text": d.colors.text,
    "--sd-muted": d.colors.muted,
    "--sd-accent": d.colors.accent,
    "--sd-accent-text": d.colors.accentText,
    "--sd-font-h": fontStack(d.fonts.heading),
    "--sd-font-b": fontStack(d.fonts.body),
    "--sd-h-case": d.headingCase === "upper" ? "uppercase" : "none",
    "--sd-h-track": d.headingCase === "upper" ? "0.03em" : "-0.01em",
    "--sd-radius": radius,
    "--sd-radius-img": radiusImg,
    "--sd-btn-radius": radiusBtn,
    "--sd-space": SPACE[d.spacing],
    colorScheme: d.mode,
  } as React.CSSProperties;

  const whatsapp = whatsappUrl(restaurant.whatsapp);
  const visible = d.sections.filter((s) => s.visible && hasContent(s, restaurant));

  return (
    <div className="sd-root relative min-h-screen" style={vars} data-buttons={d.buttons} data-animation={d.animation}>
      {/* React hoists the stylesheet into <head>. */}
      <link rel="stylesheet" href={googleFontsHref(d.fonts)} precedence="default" />
      {d.customCss && !cssProblem(d.customCss) && <style>{`.sd-root{${d.customCss}}`}</style>}

      <Hero r={restaurant} d={d} />
      {visible.map((s) => (
        <Section key={s.type} s={s} r={restaurant} dark={d.mode === "dark"} />
      ))}

      <footer className="sd-muted px-4 py-10 text-center text-sm">
        <p>
          Powered by{" "}
          <a href={ROOT_URL} className="sd-accent font-bold">
            ScanDish
          </a>{" "}
          · Smart QR menu
        </p>
      </footer>

      {whatsapp && (
        <div
          className={preview ? "pointer-events-none sticky bottom-5 -mt-16 flex justify-end px-5" : "fixed right-5 z-50"}
          style={preview ? undefined : { bottom: "calc(1.25rem + var(--order-bar, 0px))" }}
        >
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            aria-label="Chat on WhatsApp"
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-xl transition-transform hover:scale-110"
          >
            <FaWhatsapp className="h-7 w-7" />
          </a>
        </div>
      )}
    </div>
  );
}

function hasContent(s: DesignSection, r: Content) {
  switch (s.type) {
    case "offers":
      return r.offers.length > 0;
    case "about":
      return Boolean(r.about);
    case "menu":
      return r.menu.some((c) => c.items.length > 0);
    case "gallery":
      return r.gallery.length > 0;
    case "contact":
      return Boolean(r.location || r.phone || r.whatsapp);
  }
}

const title = (s: DesignSection) => s.title || SECTION_INFO[s.type].defaultTitle;

/* ---------------- Hero ---------------- */

function contactLinks(r: Content) {
  return [
    { href: phoneUrl(r.phone), label: "Call", Icon: Phone, external: false },
    { href: whatsappUrl(r.whatsapp), label: "WhatsApp", Icon: FaWhatsapp, external: true },
    { href: websiteUrl(r.website), label: "Website", Icon: Globe, external: true },
    { href: instagramUrl(r.social.instagram), label: "Instagram", Icon: FaInstagram, external: true },
    { href: facebookUrl(r.social.facebook), label: "Facebook", Icon: FaFacebook, external: true },
    { href: tiktokUrl(r.social.tiktok), label: "TikTok", Icon: FaTiktok, external: true },
  ].filter((c) => c.href);
}

function Socials({ r, onImage = false }: { r: Content; onImage?: boolean }) {
  const links = contactLinks(r);
  if (!links.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map(({ href, label, Icon, external }) => (
        <a
          key={label}
          href={href}
          aria-label={label}
          title={label}
          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition hover:-translate-y-0.5 ${
            onImage ? "bg-white/15 text-white backdrop-blur" : "sd-surface sd-accent border sd-line"
          }`}
        >
          <Icon className="h-5 w-5" />
        </a>
      ))}
    </div>
  );
}

function ShareButton({ r, onImage = false }: { r: Content; onImage?: boolean }) {
  return (
    <button
      onClick={() => sharePage(r.name, `Check out ${r.name} on ScanDish`)}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${onImage ? "bg-white/15 text-white backdrop-blur" : "sd-btn-ghost"}`}
    >
      <Share2 className="h-4 w-4" /> Share
    </button>
  );
}

function Logo({ r, size }: { r: Content; size: string }) {
  if (!r.logo) return null;
  return <img src={optimizeImage(r.logo, 240)} alt={`${r.name} logo`} className={`${size} sd-r-img object-cover shadow-md`} />;
}

function HeroActions({ r, menu }: { r: Content; menu: boolean }) {
  if (!menu && !r.phone) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {menu && (
        <a href="#menu" className="sd-btn">
          View menu <ArrowRight className="h-4 w-4" />
        </a>
      )}
      {r.phone && (
        <a href={phoneUrl(r.phone)} className="sd-btn sd-btn-ghost">
          <Phone className="h-4 w-4" /> Call
        </a>
      )}
    </div>
  );
}

function Hero({ r, d }: { r: Content; d: DesignConfig }) {
  const cover = r.coverImage ? responsiveImage(r.coverImage) : null;
  const splitCover = r.coverImage ? responsiveImage(r.coverImage, SPLIT_COVER_SIZES) : null;
  const tagline = d.hero.tagline;
  const menu = d.sections.some((s) => s.type === "menu" && s.visible) && r.menu.some((c) => c.items.length > 0);

  if (d.hero.variant === "cover") {
    return (
      <header className="relative flex min-h-[min(88svh,780px)] flex-col overflow-hidden text-white">
        {cover ? (
          <img {...cover} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="sd-accent-bg absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/75" />
        <div className="relative z-10 flex items-center justify-between gap-4 p-5 @3xl:p-8">
          <Logo r={r} size="h-14 w-14" />
          <ShareButton r={r} onImage />
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-6 px-5 pb-16 text-center">
          {tagline && <p className="text-xs font-bold uppercase tracking-[0.35em]" style={{ color: d.colors.accent }}>{tagline}</p>}
          <h1 className="sd-h text-5xl font-bold @3xl:text-7xl @5xl:text-8xl">{r.name}</h1>
          {r.description && <p className="max-w-2xl text-lg text-white/85 @3xl:text-xl">{r.description}</p>}
          <HeroActions r={r} menu={menu} />
          <Socials r={r} onImage />
        </div>
      </header>
    );
  }

  if (d.hero.variant === "split") {
    return (
      <header className="mx-auto grid max-w-6xl items-center gap-8 px-5 pb-8 pt-6 @3xl:grid-cols-2 @3xl:gap-12 @3xl:py-16">
        <div className="flex items-center justify-between @3xl:col-span-2">
          <Logo r={r} size="h-14 w-14" />
          <ShareButton r={r} />
        </div>
        {cover && (
          <img {...splitCover} alt="" fetchPriority="high" className="sd-r aspect-[4/3] w-full object-cover shadow-xl @3xl:order-2 @3xl:aspect-[4/5]" />
        )}
        <div className="flex flex-col gap-5">
          {tagline && <p className="sd-accent text-xs font-bold uppercase tracking-[0.3em]">{tagline}</p>}
          <h1 className="sd-h text-5xl font-bold @3xl:text-6xl @5xl:text-7xl">{r.name}</h1>
          {r.description && <p className="sd-muted text-lg leading-relaxed">{r.description}</p>}
          <HeroActions r={r} menu={menu} />
          <Socials r={r} />
        </div>
      </header>
    );
  }

  if (d.hero.variant === "centered") {
    return (
      <header className="px-5 pb-6 pt-6">
        <div className="flex justify-end">
          <ShareButton r={r} />
        </div>
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 py-8 text-center">
          <Logo r={r} size="h-24 w-24 @3xl:h-28 @3xl:w-28" />
          {tagline && <p className="sd-accent text-xs font-bold uppercase tracking-[0.3em]">{tagline}</p>}
          <h1 className="sd-h text-5xl font-bold @3xl:text-7xl">{r.name}</h1>
          {r.description && <p className="sd-muted max-w-xl text-lg">{r.description}</p>}
          <HeroActions r={r} menu={menu} />
          <Socials r={r} />
        </div>
        {cover && (
          <img {...cover} alt="" fetchPriority="high" className="sd-r mx-auto mt-4 aspect-[16/9] w-full max-w-6xl object-cover shadow-xl @3xl:aspect-[21/9]" />
        )}
      </header>
    );
  }

  // minimal
  return (
    <header>
      <div className="sd-surface border-b sd-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <Logo r={r} size="h-11 w-11" />
            <h1 className="sd-h text-xl font-bold">{r.name}</h1>
          </div>
          <ShareButton r={r} />
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 pb-4 pt-12 @3xl:pt-20">
        {tagline && <p className="sd-accent text-xs font-bold uppercase tracking-[0.3em]">{tagline}</p>}
        <p className="sd-h max-w-3xl text-4xl font-bold @3xl:text-6xl">{r.description || r.name}</p>
        <HeroActions r={r} menu={menu} />
      </div>
    </header>
  );
}

/* ---------------- Sections ---------------- */

function Section({ s, r, dark }: { s: DesignSection; r: Content; dark: boolean }) {
  return (
    <section id={s.type} className="sd-section scroll-mt-4 px-5">
      <div className="sd-reveal mx-auto max-w-6xl">
        {s.type === "offers" && <Offers s={s} r={r} />}
        {s.type === "about" && <About s={s} r={r} />}
        {s.type === "menu" && <Menu s={s} r={r} dark={dark} />}
        {s.type === "gallery" && <Gallery s={s} r={r} />}
        {s.type === "contact" && <Contact s={s} r={r} />}
      </div>
    </section>
  );
}

function Heading({ s, center = false }: { s: DesignSection; center?: boolean }) {
  return (
    <div className={`mb-8 flex flex-col gap-2 ${center ? "items-center text-center" : ""}`}>
      <h2 className="sd-h text-3xl font-bold @3xl:text-5xl">{title(s)}</h2>
      <span className="sd-accent-bg h-1 w-12 rounded-full" />
    </div>
  );
}

function Offers({ s, r }: { s: DesignSection; r: Content }) {
  if (s.variant === "cards") {
    return (
      <>
        <Heading s={s} />
        <div className="grid gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
          {r.offers.map((o, i) => {
            const Icon = OFFER_ICONS[o.icon] ?? Tag;
            return (
              <div key={`${o.text}-${i}`} className="sd-surface sd-r flex items-center gap-4 border sd-line p-5">
                <span className="sd-accent-bg flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="font-semibold">{o.text}</p>
              </div>
            );
          })}
        </div>
      </>
    );
  }
  return (
    <div className="sd-accent-bg sd-r flex flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 py-5 text-center">
      <span className="sd-h text-sm font-bold uppercase tracking-[0.25em] opacity-80">{title(s)}</span>
      {r.offers.map((o, i) => {
        const Icon = OFFER_ICONS[o.icon] ?? Tag;
        return (
          <span key={`${o.text}-${i}`} className="inline-flex items-center gap-2 font-semibold">
            <Icon className="h-4 w-4" /> {o.text}
          </span>
        );
      })}
    </div>
  );
}

function About({ s, r }: { s: DesignSection; r: Content }) {
  const photo = r.gallery[0] || r.coverImage;
  if (s.variant === "split" && photo) {
    return (
      <div className="grid items-center gap-8 @3xl:grid-cols-2 @3xl:gap-14">
        <img src={optimizeImage(photo, 900)} alt="" loading="lazy" className="sd-r aspect-[4/3] w-full object-cover" />
        <div>
          <Heading s={s} />
          <p className="sd-muted whitespace-pre-line text-lg leading-relaxed">{r.about}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-4xl text-center">
      <p className="sd-accent mb-6 text-xs font-bold uppercase tracking-[0.3em]">{title(s)}</p>
      <p className="sd-h whitespace-pre-line text-2xl leading-snug @3xl:text-4xl">“{r.about}”</p>
      <p className="sd-muted mt-6 font-semibold">— {r.name}</p>
    </div>
  );
}

/* ----- Menu ----- */

function Price({ item }: { item: MenuItem }) {
  return item.price ? <span className="sd-accent whitespace-nowrap font-bold">{item.price}</span> : null;
}

function Badges({ item }: { item: MenuItem }) {
  if (!item.featured && item.available) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {item.featured && (
        <span className="sd-accent-bg inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold">
          <Star className="h-3 w-3" /> Chef&apos;s pick
        </span>
      )}
      {!item.available && <span className="sd-btn-ghost rounded-full px-2 py-0.5 text-[11px] font-bold">Unavailable</span>}
    </span>
  );
}

/** The layout chosen in the Design Studio is the view guests see first; they can switch. */
const DEFAULT_VIEW: Record<string, MenuView> = { cards: "card", list: "bar", tabs: "bar", grid: "square" };

function Menu({ s, r, dark }: { s: DesignSection; r: Content; dark: boolean }) {
  const categories = useMemo(() => r.menu.filter((c) => c.items.length > 0), [r.menu]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [view, setView] = useMenuView(r.slug, DEFAULT_VIEW[s.variant] ?? "card");

  const q = query.trim().toLowerCase();
  const shown = q
    ? categories
        .map((c) => ({ category: c.category, items: c.items.filter((i) => `${i.name} ${i.description}`.toLowerCase().includes(q)) }))
        .filter((c) => c.items.length > 0)
    : s.variant === "tabs"
      ? [categories[Math.min(active, categories.length - 1)]].filter(Boolean)
      : categories;

  return (
    <>
      <Heading s={s} center />
      <div className="mx-auto mb-8 flex max-w-xl items-center gap-3 sd-surface sd-r border sd-line px-4">
        <Search className="sd-muted h-5 w-5 shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the menu"
          aria-label="Search the menu"
          className="w-full bg-transparent py-3.5 outline-none placeholder:opacity-60"
        />
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
        <OrderToggle dark={dark} />
        <MenuViewSwitcher value={view} onChange={setView} accent="var(--sd-accent)" accentText="var(--sd-accent-text)" dark={dark} />
      </div>

      {s.variant === "tabs" && !q && categories.length > 1 && (
        <div className="no-scrollbar -mx-5 mb-8 flex gap-2 overflow-x-auto px-5 @3xl:justify-center">
          {categories.map((c, i) => (
            <button key={c.category} onClick={() => setActive(i)} aria-pressed={i === active} className="sd-chip shrink-0 px-5 py-2.5 text-sm font-semibold">
              {c.category}
            </button>
          ))}
        </div>
      )}

      {shown.every((c) => c.items.length === 0) && <p className="sd-muted py-8 text-center">No dishes match your search.</p>}

      <div className="flex flex-col gap-12">
        {shown.map((c) =>
          c.items.length === 0 ? null : (
            <div key={c.category}>
              {(s.variant !== "tabs" || q) && <h3 className="sd-h mb-5 text-2xl font-bold @3xl:text-3xl">{c.category}</h3>}
              {view === "bar" ? (
                <MenuList items={c.items} category={c.category} />
              ) : (
                <PhotoAndTextDishes items={c.items} category={c.category} view={view} />
              )}
            </div>
          )
        )}
      </div>
    </>
  );
}

/** Photo dishes in cards or a grid; dishes without a photo follow as clean lines, never empty photo spaces. */
function PhotoAndTextDishes({ items, category, view }: { items: MenuItem[]; category: string; view: "card" | "square" }) {
  const photos = items.filter((i) => i.image);
  const text = items.filter((i) => !i.image);
  return (
    <div className="flex flex-col gap-8">
      {photos.length > 0 && (view === "card" ? <MenuCards items={photos} category={category} /> : <MenuGrid items={photos} category={category} />)}
      {text.length > 0 && <MenuList items={text} category={category} />}
    </div>
  );
}

function MenuCards({ items, category }: { items: MenuItem[]; category: string }) {
  return (
    <div className="grid gap-5 @2xl:grid-cols-2 @5xl:grid-cols-3">
      {items.map((item) => (
        <article key={item.id || item.name} className={`sd-surface sd-r overflow-hidden border sd-line ${item.available ? "" : "opacity-60"}`}>
          {item.image && <img src={optimizeImage(item.image, 700)} alt={item.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />}
          <div className="flex flex-col gap-2 p-5">
            <Badges item={item} />
            <div className="flex items-baseline justify-between gap-3">
              <h4 className="sd-h text-lg font-bold">{item.name}</h4>
              <Price item={item} />
            </div>
            {item.description && <p className="sd-muted text-sm leading-relaxed">{item.description}</p>}
            <AddToOrder item={item} category={category} className="mt-2 self-start" />
          </div>
        </article>
      ))}
    </div>
  );
}

function MenuList({ items, category }: { items: MenuItem[]; category: string }) {
  return (
    <div className="grid gap-x-12 gap-y-6 @4xl:grid-cols-2">
      {items.map((item) => (
        <article key={item.id || item.name} className={`flex gap-4 ${item.available ? "" : "opacity-60"}`}>
          {item.image && <img src={optimizeImage(item.image, 240)} alt={item.name} loading="lazy" className="sd-r-img h-20 w-20 shrink-0 object-cover" />}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-3">
              <h4 className="sd-h text-lg font-bold">{item.name}</h4>
              <span className="sd-leader" />
              <Price item={item} />
            </div>
            {item.description && <p className="sd-muted mt-1 text-sm leading-relaxed">{item.description}</p>}
            <div className="mt-1.5">
              <Badges item={item} />
            </div>
            <AddToOrder item={item} category={category} className="mt-2" />
          </div>
        </article>
      ))}
    </div>
  );
}

function MenuGrid({ items, category }: { items: MenuItem[]; category: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 @3xl:grid-cols-3 @5xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.id || item.name} className={item.available ? "" : "opacity-60"}>
          <img src={optimizeImage(item.image, 500)} alt={item.name} loading="lazy" className="sd-r aspect-square w-full object-cover" />
          <h4 className="sd-h mt-3 font-bold leading-snug">{item.name}</h4>
          <Price item={item} />
          <div className="mt-1">
            <Badges item={item} />
          </div>
          <AddToOrder item={item} category={category} className="mt-2" />
        </article>
      ))}
    </div>
  );
}

/* ----- Gallery & contact ----- */

function Gallery({ s, r }: { s: DesignSection; r: Content }) {
  const photos = r.gallery;
  const img = (src: string, i: number, className: string, width = 800) => (
    <img key={src} src={optimizeImage(src, width)} alt={`${r.name} photo ${i + 1}`} loading="lazy" className={`sd-r-img h-full w-full object-cover ${className}`} />
  );
  return (
    <>
      <Heading s={s} />
      {s.variant === "carousel" && (
        <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2">
          {photos.map((p, i) => (
            <div key={p} className="aspect-[4/5] w-72 shrink-0 snap-center @3xl:w-96">
              {img(p, i, "")}
            </div>
          ))}
        </div>
      )}
      {s.variant === "grid" && (
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-3">
          {photos.map((p, i) => (
            <div key={p} className="aspect-square">
              {img(p, i, "", 600)}
            </div>
          ))}
        </div>
      )}
      {s.variant === "mosaic" && (
        <div className="grid auto-rows-[160px] grid-cols-2 gap-3 @3xl:auto-rows-[220px] @3xl:grid-cols-4">
          {photos.map((p, i) => (
            <div key={p} className={i % 5 === 0 ? "col-span-2 row-span-2" : ""}>
              {img(p, i, "", i % 5 === 0 ? 1200 : 600)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Contact({ s, r }: { s: DesignSection; r: Content }) {
  const details = (
    <div className="flex flex-col gap-5">
      {r.location && (
        <div className="flex items-start gap-3">
          <MapPin className="sd-accent mt-1 h-6 w-6 shrink-0" />
          <p className="text-lg font-semibold">{r.location}</p>
        </div>
      )}
      <Socials r={r} />
      {r.location && (
        <a href={directionsUrl(r.location)} target="_blank" rel="noreferrer" className="sd-btn self-start">
          Get directions <ArrowRight className="h-4 w-4" />
        </a>
      )}
    </div>
  );

  if (s.variant === "map" && r.location) {
    return (
      <>
        <Heading s={s} />
        <div className="sd-surface sd-r grid overflow-hidden border sd-line @3xl:grid-cols-5">
          <iframe title={`Map of ${r.name}`} src={mapEmbedUrl(r.location)} loading="lazy" className="h-72 w-full @3xl:col-span-3 @3xl:h-full @3xl:min-h-[360px]" />
          <div className="p-6 @3xl:col-span-2 @3xl:p-10">{details}</div>
        </div>
      </>
    );
  }
  return (
    <div className="sd-surface sd-r mx-auto max-w-3xl border sd-line p-6 @3xl:p-10">
      <h2 className="sd-h mb-6 text-3xl font-bold">{title(s)}</h2>
      {details}
    </div>
  );
}
