"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FaInstagram, FaFacebook, FaTiktok, FaWhatsapp } from "react-icons/fa6";
import {
  Phone,
  Globe,
  MapPin,
  ArrowRight,
  Quote,
  Share2,
  ZoomIn,
  Search,
  LayoutGrid,
  Rows3,
  PanelTop,
  Check,
  Wifi,
  Truck,
  Car,
  Music,
  Coffee,
  Tag,
  Flame,
  type LucideIcon,
} from "lucide-react";
import type { MenuItem, PublicRestaurant } from "@/lib/types";
import {
  directionsUrl,
  facebookUrl,
  instagramUrl,
  mapEmbedUrl,
  optimizeImage,
  phoneUrl,
  sharePage,
  tiktokUrl,
  websiteUrl,
  whatsappUrl,
} from "@/lib/links";

type MenuStyle = "bar" | "card" | "square";

const OFFER_ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  truck: Truck,
  car: Car,
  music: Music,
  coffee: Coffee,
  tag: Tag,
  flame: Flame,
  phone: Phone,
};

const imagesFirst = (a: MenuItem, b: MenuItem) => Number(Boolean(b.image)) - Number(Boolean(a.image));

const CONTACT_BUTTON =
  "flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-all duration-300 group";
const CONTACT_ICON = "w-7 h-7 md:w-5 md:h-8 transition-transform group-hover:scale-110";

export default function StandardTemplate({ restaurant }: { restaurant: PublicRestaurant }) {
  const [activeCategory, setActiveCategory] = useState("Overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState<MenuStyle>("card");
  const [showStylePicker, setShowStylePicker] = useState(false);

  const { menu: categories, offers, theme } = restaurant;

  const categoryNames = useMemo(() => ["Overview", ...categories.map((c) => c.category)], [categories]);

  const displayedItems = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    if (search) {
      return categories
        .flatMap((c) => c.items)
        .filter((i) => i.name.toLowerCase().includes(search) || i.description.toLowerCase().includes(search))
        .sort(imagesFirst);
    }
    const items =
      activeCategory === "Overview"
        ? categories.map((c) => c.items[0]).filter(Boolean)
        : categories.find((c) => c.category === activeCategory)?.items ?? [];
    return [...items].sort(imagesFirst);
  }, [searchQuery, activeCategory, categories]);

  const contacts: { href: string; title: string; Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; external?: boolean }[] = [
    { href: phoneUrl(restaurant.phone), title: "Call Us", Icon: Phone },
    { href: whatsappUrl(restaurant.whatsapp), title: "WhatsApp", Icon: FaWhatsapp, external: true },
    { href: websiteUrl(restaurant.website), title: "Website", Icon: Globe, external: true },
    { href: instagramUrl(restaurant.social.instagram), title: "Instagram", Icon: FaInstagram, external: true },
    { href: facebookUrl(restaurant.social.facebook), title: "Facebook", Icon: FaFacebook, external: true },
    { href: tiktokUrl(restaurant.social.tiktok), title: "TikTok", Icon: FaTiktok, external: true },
  ].filter((c) => c.href);

  const whatsapp = whatsappUrl(restaurant.whatsapp);
  const sideImage = restaurant.gallery[0] || restaurant.coverImage;

  return (
    <main className="min-h-screen font-sans pb-12 transition-colors duration-500" style={{ backgroundColor: theme.backgroundColor }}>
      {/* 1. IMMERSIVE HERO */}
      <section className="relative w-full h-[55vh] min-h-[360px] md:h-[65vh] md:min-h-[450px] flex flex-col items-center justify-center text-center px-4">
        <div className="absolute inset-0 z-0">
          <img
            src={restaurant.coverImage ? optimizeImage(restaurant.coverImage, 1400) : "/images/kigali-grill.jpg"}
            alt={restaurant.name}
            fetchPriority="high"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-black/55" />
          <div className="absolute inset-0 opacity-10 mix-blend-multiply" style={{ backgroundColor: theme.primaryColor }} />
        </div>

        {restaurant.logo && (
          <div className="absolute top-6 left-6 z-20">
            <img
              src={optimizeImage(restaurant.logo, 200)}
              alt={`${restaurant.name} logo`}
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border border-white/50 shadow-lg bg-white"
            />
          </div>
        )}

        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={() => sharePage(restaurant.name, `Check out ${restaurant.name} on ScanDish`)}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-white/20 transition-all duration-300"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto mt-12">
          <h1 className="text-white text-5xl md:text-7xl font-bold tracking-tight leading-tight drop-shadow-xl mb-6">{restaurant.name}</h1>
          {restaurant.description && (
            <p className="text-white/90 text-lg md:text-2xl font-medium max-w-2xl mx-auto drop-shadow-md leading-relaxed">
              {restaurant.description}
            </p>
          )}
        </div>

        {contacts.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 translate-y-1/2 z-30 px-4">
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 max-w-3xl mx-auto">
              {contacts.map(({ href, title, Icon, external }) => (
                <a
                  key={title}
                  href={href}
                  title={title}
                  aria-label={title}
                  {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                  className={CONTACT_BUTTON}
                >
                  <Icon className={CONTACT_ICON} style={{ color: theme.primaryColor }} />
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 2. OFFERS & ABOUT SECTION */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-14 pb-16">
        {offers.length > 0 && (
          <div className="mb-20">
            <div className="flex flex-wrap items-center justify-center gap-y-3">
              <div className="flex items-center gap-2 mr-4 shrink-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: theme.primaryColor }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: theme.primaryColor }} />
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Offers:</span>
              </div>

              <div className="flex flex-wrap items-center justify-center">
                {offers.map((offer, index) => {
                  const Icon = OFFER_ICONS[offer.icon] ?? Tag;
                  return (
                    <div key={`${offer.text}-${index}`} className="inline-flex items-center">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" style={{ color: theme.primaryColor }} />
                        <span className="text-sm md:text-base font-bold" style={{ color: theme.secondaryColor }}>
                          {offer.text}
                        </span>
                      </div>
                      {index !== offers.length - 1 && (
                        <span className="mx-3 text-lg font-light opacity-20" style={{ color: theme.secondaryColor }}>
                          ,
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {restaurant.about && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 rounded-[2.5rem] p-8 md:p-14 relative overflow-hidden shadow-sm border border-[#f0e0d8]/60 bg-white">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundColor: theme.primaryColor }} />
              <Quote className="absolute -top-4 -right-4 w-48 h-48 opacity-[0.03] -rotate-12 pointer-events-none" style={{ color: theme.primaryColor }} />
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <h2 className="text-sm font-black tracking-[0.2em] uppercase" style={{ color: theme.primaryColor }}>
                    Our Story
                  </h2>
                  <div className="h-px w-12 bg-[#f0e0d8]" />
                </div>
                <p className="text-2xl md:text-4xl leading-[1.3] font-medium tracking-tight" style={{ color: theme.secondaryColor }}>
                  {restaurant.about}
                </p>
                <div className="mt-10 w-16 h-1.5 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
              </div>
            </div>

            {sideImage && (
              <div
                className="hidden lg:flex flex-col justify-end p-8 rounded-[2.5rem] border border-[#f0e0d8]/60 bg-cover bg-center relative overflow-hidden"
                style={{ backgroundImage: `url("${optimizeImage(sideImage, 800)}")` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="relative z-10">
                  <p className="text-white font-bold text-lg">Quality Ingredients</p>
                  <p className="text-white/80 text-sm">Prepared with care</p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. MENU SECTION */}
      {categories.length > 0 && (
        <section className="bg-[#fffcfb] py-16 md:py-24 border-y border-[#f0e0d8]/40 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-3" style={{ color: theme.secondaryColor }}>
                The Menu
              </h2>
              <p className="text-gray-500 font-medium italic">Enjoy a curated selection of vibrant dishes.</p>
            </div>

            {/* Search + Style Switcher */}
            <div className="max-w-2xl mx-auto mb-10 flex items-center gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-gray-600 transition-colors" />
                <input
                  type="search"
                  aria-label="Search the menu"
                  placeholder="Search our menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl border border-[#f0e0d8] bg-white text-base font-medium shadow-sm focus:ring-2 focus:outline-none transition-all"
                  style={{ "--tw-ring-color": theme.primaryColor } as React.CSSProperties}
                />
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowStylePicker(!showStylePicker)}
                  aria-label="Change menu layout"
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#f0e0d8] bg-white shadow-sm"
                  style={{ color: theme.primaryColor }}
                >
                  {menuStyle === "bar" && <Rows3 className="w-6 h-6" />}
                  {menuStyle === "card" && <PanelTop className="w-6 h-6" />}
                  {menuStyle === "square" && <LayoutGrid className="w-6 h-6" />}
                </button>
                {showStylePicker && (
                  <div className="absolute right-0 top-16 z-40 w-48 rounded-2xl border border-[#f0e0d8] bg-white p-2 shadow-xl">
                    {(["bar", "card", "square"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setMenuStyle(s);
                          setShowStylePicker(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-[#fff8f5]"
                      >
                        <span className="capitalize">{s} View</span>
                        {menuStyle === s && <Check className="ml-auto w-4 h-4" style={{ color: theme.primaryColor }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Categories */}
            <div className="flex gap-8 overflow-x-auto pb-px mb-10 no-scrollbar border-b border-gray-100">
              {categoryNames.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className="relative pb-4 text-lg font-bold whitespace-nowrap transition-all"
                  style={{ color: activeCategory === category ? theme.secondaryColor : "#9ca3af" }}
                >
                  {category}
                  {activeCategory === category && (
                    <span className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full" style={{ backgroundColor: theme.primaryColor }} />
                  )}
                </button>
              ))}
            </div>

            {displayedItems.length === 0 && (
              <p className="py-10 text-center text-gray-400 font-medium">No dishes match your search.</p>
            )}

            {menuStyle === "card" && (
              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {displayedItems
                    .filter((item) => item.image)
                    .map((item) => (
                      <div
                        key={item.id || item.name}
                        className="group bg-white rounded-3xl overflow-hidden border border-[#f0e0d8]/50 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="aspect-[4/3] overflow-hidden">
                          <img
                            src={optimizeImage(item.image, 600)}
                            loading="lazy"
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        </div>
                        <div className="p-6">
                          <div className="flex justify-between gap-4 mb-2">
                            <h3 className="text-xl font-bold" style={{ color: theme.secondaryColor }}>
                              {item.name}
                            </h3>
                            <p className="font-black text-lg" style={{ color: theme.primaryColor }}>
                              {item.price}
                            </p>
                          </div>
                          {item.description && <p className="italic text-gray-500">{item.description}</p>}
                        </div>
                      </div>
                    ))}
                </div>

                {displayedItems.some((item) => !item.image) && (
                  <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#f0e0d8]/40">
                    <div className="space-y-5">
                      {displayedItems
                        .filter((item) => !item.image)
                        .map((item) => (
                          <div key={item.id || item.name} className="pb-4 border-b border-gray-100 last:border-0">
                            <div className="flex items-baseline gap-3">
                              <h3 className="font-bold text-lg" style={{ color: theme.secondaryColor }}>
                                {item.name}
                              </h3>
                              <div className="flex-1 border-b border-dotted border-gray-300" />
                              <span className="italic font-semibold whitespace-nowrap" style={{ color: theme.primaryColor }}>
                                {item.price}
                              </span>
                            </div>
                            {item.description && <p className="mt-2 italic text-gray-600 leading-relaxed">{item.description}</p>}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {menuStyle === "bar" && (
              <div className="space-y-6">
                {displayedItems.map((item) => (
                  <div key={item.id || item.name} className="flex gap-5 pb-5 border-b border-gray-100">
                    {item.image && (
                      <div className="w-28 aspect-[4/3] rounded-xl overflow-hidden shrink-0">
                        <img src={optimizeImage(item.image, 300)} loading="lazy" alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex gap-3 items-baseline">
                        <h3 className="font-bold" style={{ color: theme.secondaryColor }}>
                          {item.name}
                        </h3>
                        <div className="flex-1 border-b border-dotted border-gray-300" />
                        <span className="font-semibold" style={{ color: theme.primaryColor }}>
                          {item.price}
                        </span>
                      </div>
                      {item.description && <p className="italic text-gray-500 mt-1">{item.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {menuStyle === "square" && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {displayedItems
                  .filter((item) => item.image)
                  .map((item) => (
                    <div key={item.id || item.name}>
                      <div className="aspect-[4/3] rounded-2xl overflow-hidden">
                        <img src={optimizeImage(item.image, 500)} loading="lazy" alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <h3 className="font-bold mt-3" style={{ color: theme.secondaryColor }}>
                        {item.name}
                      </h3>
                      <p className="font-bold" style={{ color: theme.primaryColor }}>
                        {item.price}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. GALLERY & ATMOSPHERE */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-24">
        {restaurant.gallery.length > 0 && (
          <div className="mb-24">
            <h2 className="text-3xl md:text-4xl font-bold mb-8" style={{ color: theme.secondaryColor }}>
              Atmosphere
            </h2>
            <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar snap-x snap-mandatory">
              {restaurant.gallery.map((img, index) => (
                <div key={img} className="shrink-0 w-72 md:w-96 h-72 rounded-[2.5rem] overflow-hidden shadow-md snap-center group relative">
                  <img
                    src={optimizeImage(img, 700)}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    alt={`${restaurant.name} photo ${index + 1}`}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                    <ZoomIn className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. LOCATION & DIRECTIONS */}
        {restaurant.location && (
          <section className="bg-white rounded-[2.5rem] border border-[#f0e0d8] shadow-sm overflow-hidden mb-12">
            <div className="p-2">
              <div className="rounded-[2rem] overflow-hidden border border-[#f0e0d8] h-80 md:h-[28rem]">
                <iframe
                  title={`Map of ${restaurant.name}`}
                  src={mapEmbedUrl(restaurant.location)}
                  className="w-full h-full grayscale-[20%] hover:grayscale-0 transition-all duration-700"
                  loading="lazy"
                />
              </div>
              <div className="p-6 md:p-10 flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-full bg-[#fff8f5] shrink-0" style={{ color: theme.primaryColor }}>
                    <MapPin className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-widest uppercase mb-1" style={{ color: theme.primaryColor }}>
                      Location
                    </h3>
                    <p className="font-bold text-xl md:text-2xl tracking-tight" style={{ color: theme.secondaryColor }}>
                      {restaurant.location}
                    </p>
                  </div>
                </div>
                <a
                  href={directionsUrl(restaurant.location)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-3 rounded-full px-8 py-4 text-white font-bold shadow-lg hover:-translate-y-1 transition-all w-full md:w-auto"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <span>Get Directions</span>
                  <ArrowRight className="w-6 h-6" />
                </a>
              </div>
            </div>
          </section>
        )}
      </section>

      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat on WhatsApp"
          className="fixed bottom-6 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-2xl hover:scale-110 transition-transform animate-pulse"
        >
          <FaWhatsapp className="w-8 h-8" />
        </a>
      )}

      <footer className="text-center py-8 px-4">
        <div className="max-w-xs mx-auto mb-2 h-px opacity-10" style={{ backgroundColor: theme.secondaryColor }} />
        <p className="text-xs md:text-sm text-gray-400 font-medium tracking-wide">
          Powered by{" "}
          <Link href="/" className="font-black hover:opacity-70 transition-all duration-300" style={{ color: theme.primaryColor }}>
            ScanDish
          </Link>{" "}
          <span className="mx-1">Â·</span> Smart QR Experience
        </p>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 hover:text-gray-500 transition-colors"
        >
          Back to top â†‘
        </button>
      </footer>
    </main>
  );
}
