"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "../../../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { FaInstagram, FaFacebook, FaTiktok, FaWhatsapp } from "react-icons/fa6";
import Link from "next/link";
import {
  Phone,
  MessageCircle,
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
  ChevronDown,
  Check,
} from "lucide-react";

export default function RestaurantPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [restaurant, setRestaurant] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState<"bar" | "card" | "square">("card");
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [company, setCompany] = useState<any | null>(null);

  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        const q = query(collection(db, "restaurants"), where("slug", "==", slug));
        const snapshot = await getDocs(q);
 
        if (snapshot.empty) {
          setNotFoundState(true);
          setLoading(false);
          return;
        }

        const data = snapshot.docs[0].data();
        setRestaurant(data);

// fetch company
if (data.companyId) {
  const companyQuery = query(
    collection(db, "companies"),
    where("__name__", "==", data.companyId)
  );

  const companySnap = await getDocs(companyQuery);

  if (!companySnap.empty) {
    setCompany(companySnap.docs[0].data());
  }
}
      } catch (error) {
        console.error(error);
        setNotFoundState(true);
      } finally {
        setLoading(false);
      }
    };

    if (slug) loadRestaurant();
  }, [slug]);

  const categories = restaurant?.menu || [];
  const offers = restaurant?.offers || [];

  const categoryNames = useMemo(() => {
    return ["Overview", ...categories.map((cat: Record<string, any>) => cat.category)];
  }, [categories]);

  const overviewItems = useMemo(() => {
    return categories.map((cat: Record<string, any>) => cat.items?.[0]).filter(Boolean);
  }, [categories]);

  const filteredByCategory =
    activeCategory === "Overview"
      ? overviewItems
      : categories.find((cat: Record<string, any>) => cat.category === activeCategory)?.items || [];

  const displayedItems = searchQuery.trim()
    ? filteredByCategory.filter(
        (item: Record<string, any>) =>
          item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredByCategory;

  const theme = {
    primaryColor: restaurant?.theme?.primaryColor || "#f08c6c",
    secondaryColor: restaurant?.theme?.secondaryColor || "#111827",
    backgroundColor: restaurant?.theme?.backgroundColor || "#fff8f5",
  };

  const sharePage = async () => {
  const shareUrl = window.location.href;
  const shareTitle = restaurant?.name || "Restaurant Page";

  try {
    if (navigator.share) {
      await navigator.share({
        title: shareTitle,
        text: `Check out ${shareTitle} on ScanDish`,
        url: shareUrl,
      });
      return;
    }

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareUrl);
      alert("Page link copied");
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = shareUrl;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      alert("Page link copied");
    } catch (err) {
      alert("Copy failed. Please copy this link manually: " + shareUrl);
    }

    document.body.removeChild(textArea);
  } catch (error) {
    console.error(error);
    alert("Sharing not supported on this device.");
  }
};

const isCompanyActive = company?.status === "active";

const isWithinGracePeriod = (() => {
  if (!company?.subscriptionEnd) return false;

  const end = new Date(company.subscriptionEnd);
  const today = new Date();

  const diff = (today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24);

  return diff <= 10; // 🔥 10 DAYS BONUS
})();

const isValid = isCompanyActive && (isWithinGracePeriod || new Date(company?.subscriptionEnd) >= new Date());

  const normalizeWebsiteUrl = (value: string) => {
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    return `https://${value}`;
  };

  const normalizeInstagramUrl = (value: string) => {
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    return `https://instagram.com/${value.replace(/^@/, "")}`;
  };

  const normalizeFacebookUrl = (value: string) => {
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    return `https://facebook.com/${value}`;
  };

  const normalizeTikTokUrl = (value: string) => {
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    const clean = value.startsWith("@") ? value : `@${value}`;
    return `https://tiktok.com/${clean}`;
  };

  const mapEmbedUrl = restaurant?.location
    ? `https://www.google.com/maps?q=${encodeURIComponent(
        restaurant.location
      )}&output=embed`
    : "";

  const directionsUrl = restaurant?.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        restaurant.location
      )}`
    : "";

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fff8f5] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full border-4 border-[#f3d8cf] border-t-[#f08c6c] animate-spin" />
          <p className="mt-4 text-gray-600 font-medium">ScanDish Loading...</p>
        </div>
      </main>
    );
  }

  if (notFoundState || !restaurant || !isValid) {
    return (
      <main className="min-h-screen bg-[#fff8f5] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-[#f2ddd6] rounded-3xl shadow-sm p-8 text-center">
          <div className="text-5xl mb-4">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-900">page not found</h1>
          <p className="mt-3 text-gray-600">
            The page you are looking for may have been removed or the QR link is incorrect.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen font-sans pb-12 transition-colors duration-500"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      {/* 1. IMMERSIVE HERO */}
      <section className="relative w-full h-[70vh] min-h-[500px] max-h-[800px] flex flex-col items-center justify-center text-center px-4">
        <div className="absolute inset-0 z-0">
          <img
            src={restaurant.coverImage || "/images/kigali-grill.jpg"}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
          <div
            className="absolute inset-0 opacity-30 mix-blend-multiply"
            style={{ backgroundColor: theme.primaryColor }}
          />
        </div>

        {restaurant.logo && (
          <div className="absolute top-6 left-6 z-20">
            <img
              src={restaurant.logo}
              alt={`${restaurant.name} logo`}
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border-1 border-white/50 shadow-lg bg-white"
            />
          </div>
        )}

        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={sharePage}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-white/20 transition-all duration-300"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto mt-12">
          <h1 className="text-white text-5xl md:text-7xl font-bold tracking-tight leading-tight drop-shadow-xl mb-6">
            {restaurant.name}
          </h1>
          {restaurant.description && (
            <p className="text-white/90 text-lg md:text-2xl font-medium max-w-2xl mx-auto drop-shadow-md leading-relaxed">
              {restaurant.description}
            </p>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 translate-y-1/2 z-30 px-4">
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 max-w-3xl mx-auto">
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-all duration-300 group"
                title="Call Us"
              >
                <Phone
                  className="w-7 h-7 md:w-5 md:h-8 transition-transform group-hover:scale-110"
                  style={{ color: theme.primaryColor }}
                />
              </a>
            )}

            {restaurant.whatsapp && (
              <a
                href={`https://wa.me/${restaurant.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-all duration-300 group"
                title="WhatsApp"
              >
                <FaWhatsapp
                  className="w-7 h-7 md:w-5 md:h-8 transition-transform group-hover:scale-110"
                  style={{ color: theme.primaryColor }}
                />
              </a>
            )}

            {restaurant.website && (
              <a
                href={normalizeWebsiteUrl(restaurant.website)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-all duration-300 group"
                title="Website"
              >
                <Globe
                  className="w-7 h-7 md:w-5 md:h-8 transition-transform group-hover:scale-110"
                  style={{ color: theme.primaryColor }}
                />
              </a>
            )}

            {restaurant.social?.instagram && (
              <a
                href={normalizeInstagramUrl(restaurant.social.instagram)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-all duration-300 group"
                title="Instagram"
              >
                <FaInstagram
  className="w-7 h-7 md:w-5 md:h-8 transition-transform group-hover:scale-110"
  style={{ color: theme.primaryColor }}
/>
              </a>
            )}

            {restaurant.social?.facebook && (
              <a
                href={normalizeFacebookUrl(restaurant.social.facebook)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-all duration-300 group"
                title="Facebook"
              >
                <FaFacebook
  className="w-7 h-7 md:w-5 md:h-8 transition-transform group-hover:scale-110"
  style={{ color: theme.primaryColor }}
/>
              </a>
            )}

            {restaurant.social?.tiktok && (
              <a
                href={normalizeTikTokUrl(restaurant.social.tiktok)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-all duration-300 group"
                title="TikTok"
              >
                <FaTiktok
  className="w-7 h-7 md:w-5 md:h-8 transition-transform group-hover:scale-110"
  style={{ color: theme.primaryColor }}
/>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* 2. OFFERS & ABOUT SECTION */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-14 pb-16">
        
        {/* OFFERS BAR */}
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
                {offers.map((offer: any, index: number) => {
                  const text = typeof offer === "string" ? offer : offer.text;
                  const icon = typeof offer === "string" ? "✨" : offer.icon;
                  return (
                    <div key={index} className="inline-flex items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: theme.primaryColor }}>{icon}</span>
                        <span className="text-sm md:text-base font-bold" style={{ color: theme.secondaryColor }}>{text}</span>
                      </div>
                      {index !== offers.length - 1 && <span className="mx-3 text-lg font-light opacity-20" style={{ color: theme.secondaryColor }}>,</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* BENTO ABOUT */}
        {restaurant.about && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 rounded-[2.5rem] p-8 md:p-14 relative overflow-hidden shadow-sm border border-[#f0e0d8]/60 bg-white">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundColor: theme.primaryColor }} />
              <Quote className="absolute -top-4 -right-4 w-48 h-48 opacity-[0.03] -rotate-12 pointer-events-none" style={{ color: theme.primaryColor }} />
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <h2 className="text-sm font-black tracking-[0.2em] uppercase" style={{ color: theme.primaryColor }}>Our Story</h2>
                  <div className="h-px w-12 bg-[#f0e0d8]" />
                </div>
                <p className="text-2xl md:text-4xl leading-[1.3] font-medium tracking-tight" style={{ color: theme.secondaryColor }}>
                  {restaurant.about}
                </p>
                <div className="mt-10 w-16 h-1.5 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
              </div>
            </div>

            {/* Side Image from Gallery */}
            <div 
              className="hidden lg:flex flex-col justify-end p-8 rounded-[2.5rem] border border-[#f0e0d8]/60 bg-cover bg-center relative overflow-hidden"
              style={{ backgroundImage: `url('${restaurant.gallery?.[0] || restaurant.coverImage}')` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="relative z-10">
                <p className="text-white font-bold text-lg">Quality Ingredients</p>
                <p className="text-white/80 text-sm">Prepared with care</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. MENU SECTION */}
      {categories.length > 0 && (
        <section className="bg-[#fffcfb] py-16 md:py-24 border-y border-[#f0e0d8]/40 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-3" style={{ color: theme.secondaryColor }}>The Menu</h2>
              <p className="text-gray-500 font-medium italic">Enjoy a curated selection of vibrant dishes.</p>
            </div>

            {/* Search + Style Switcher */}
            <div className="max-w-2xl mx-auto mb-10 flex items-center gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-gray-600 transition-colors" />
                <input
                  type="text"
                  placeholder="Search our menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl border border-[#f0e0d8] bg-white text-base font-medium shadow-sm focus:ring-2 focus:outline-none transition-all"
                  style={{ '--tw-ring-color': theme.primaryColor } as any}
                />
              </div>

              <div className="relative">
                <button onClick={() => setShowStylePicker(!showStylePicker)} className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#f0e0d8] bg-white shadow-sm" style={{ color: theme.primaryColor }}>
                  {menuStyle === "bar" && <Rows3 className="w-6 h-6" />}
                  {menuStyle === "card" && <PanelTop className="w-6 h-6" />}
                  {menuStyle === "square" && <LayoutGrid className="w-6 h-6" />}
                </button>
                {showStylePicker && (
                  <div className="absolute right-0 top-16 z-40 w-48 rounded-2xl border border-[#f0e0d8] bg-white p-2 shadow-xl animate-in fade-in zoom-in duration-150">
                    {["bar", "card", "square"].map((s: any) => (
                      <button key={s} onClick={() => {setMenuStyle(s); setShowStylePicker(false)}} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-[#fff8f5]">
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
              {categoryNames.map((category: string) => (
                <button key={category} onClick={() => setActiveCategory(category)} className="relative pb-4 text-lg font-bold whitespace-nowrap transition-all" style={{ color: activeCategory === category ? theme.secondaryColor : "#9ca3af" }}>
                  {category}
                  {activeCategory === category && <span className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full" style={{ backgroundColor: theme.primaryColor }} />}
                </button>
              ))}
            </div>

            {/* MENU ITEMS GRID */}
            <div className="transition-all duration-300">
              {menuStyle === "card" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {displayedItems.map((item: any, i: number) => (
                    <div key={i} className="group bg-white rounded-3xl overflow-hidden border border-[#f0e0d8]/50 shadow-sm hover:shadow-md transition-all">
                      <div className="aspect-[4/3] overflow-hidden">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      </div>
                      <div className="p-6">
                        <div className="flex justify-between items-baseline gap-4 mb-2">
                          <h3 className="text-xl font-bold truncate" style={{ color: theme.secondaryColor }}>{item.name}</h3>
                          <p className="text-lg font-black shrink-0" style={{ color: theme.primaryColor }}>{item.price}</p>
                        </div>
                        <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 italic">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {menuStyle === "bar" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12">
                  {displayedItems.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-5 py-5 group border-b border-gray-50 last:border-0">
                      <div className="relative shrink-0 w-28 md:w-36 aspect-[4/3] rounded-xl overflow-hidden shadow-sm">
                        <img src={item.image} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <h3 className="font-bold text-lg truncate" style={{ color: theme.secondaryColor }}>{item.name}</h3>
                          <div className="flex-1 border-b border-dotted border-gray-200 mb-1 hidden sm:block" />
                          <p className="font-bold text-lg shrink-0" style={{ color: theme.primaryColor }}>{item.price}</p>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1 italic">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {menuStyle === "square" && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {displayedItems.map((item: any, i: number) => (
                    <div key={i} className="group cursor-pointer">
                      <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-3 shadow-sm border border-gray-100">
                        <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <h3 className="font-bold text-base line-clamp-1" style={{ color: theme.secondaryColor }}>{item.name}</h3>
                      <p className="text-sm font-bold mt-0.5" style={{ color: theme.primaryColor }}>{item.price}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 4. GALLERY & ATMOSPHERE */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-24">
        {restaurant.gallery?.length > 0 && (
          <div className="mb-24">
            <h2 className="text-3xl md:text-4xl font-bold mb-8" style={{ color: theme.secondaryColor }}>Atmosphere</h2>
            <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar snap-x snap-mandatory">
              {restaurant.gallery.map((img: string, index: number) => (
                <div key={index} className="shrink-0 w-72 md:w-96 h-72 rounded-[2.5rem] overflow-hidden shadow-md snap-center group relative">
                  <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Gallery" />
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
                <iframe src={mapEmbedUrl} className="w-full h-full grayscale-[20%] hover:grayscale-0 transition-all duration-700" loading="lazy" />
              </div>
              <div className="p-6 md:p-10 flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-full bg-[#fff8f5] shrink-0" style={{ color: theme.primaryColor }}>
                    <MapPin className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-widest uppercase mb-1" style={{ color: theme.primaryColor }}>Location</h3>
                    <p className="font-bold text-xl md:text-2xl tracking-tight" style={{ color: theme.secondaryColor }}>{restaurant.location}</p>
                  </div>
                </div>
                <a href={directionsUrl} target="_blank" className="inline-flex items-center justify-center gap-3 rounded-full px-8 py-4 text-white font-bold shadow-lg hover:-translate-y-1 transition-all w-full md:w-auto" style={{ backgroundColor: theme.primaryColor }}>
                  <span>Get Directions</span>
                  <ArrowRight className="w-6 h-6" />
                </a>
              </div>
            </div>
          </section>
        )}
      </section>

      {/* WHATSAPP FLOAT */}
      {restaurant.whatsapp && (
        <a href={`https://wa.me/${restaurant.whatsapp}`} target="_blank" className="fixed bottom-6 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-2xl hover:scale-110 transition-transform animate-pulse">
          <FaWhatsapp className="w-8 h-8" />
        </a>
      )}

     {/* FOOTER */}
<footer className="text-center py-8 px-4">
  <div className="max-w-xs mx-auto mb-2 h-px opacity-10" style={{ backgroundColor: theme.secondaryColor }} />
  <p className="text-xs md:text-sm text-gray-400 font-medium tracking-wide">
    Powered by{" "}
    <Link 
      href="/" 
      className="font-black hover:opacity-70 transition-all duration-300"
      style={{ color: theme.primaryColor }}
    >
      ScanDish
    </Link>{" "}
    <span className="mx-1">·</span> Smart QR Experience
  </p>
  
  {/* New UI Function: Quick Scroll to Top button */}
  <button 
    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 hover:text-gray-500 transition-colors"
  >
    Back to top ↑
  </button>
</footer>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </main>
  );
}