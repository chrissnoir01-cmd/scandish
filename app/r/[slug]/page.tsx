"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "../../../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { FaInstagram, FaFacebook, FaTiktok, FaWhatsapp } from "react-icons/fa6";
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
} from "lucide-react";

export default function RestaurantPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [restaurant, setRestaurant] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Overview");
  const [searchQuery, setSearchQuery] = useState("");
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

      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-20 md:pt-24 pb-12">
        {/* 2. BENTO GRID: About */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {restaurant.about && (
            <div
              className="lg:col-span-2 rounded-[2rem] p-8 md:p-12 relative overflow-hidden shadow-[0_4px_24px_rgba(240,140,108,0.08)] border border-[#f0e0d8]"
              style={{ backgroundColor: "#fff" }}
            >
              <div
                className="absolute inset-0 opacity-5"
                style={{ backgroundColor: theme.primaryColor }}
              />
              <Quote
                className="absolute top-8 right-8 w-32 h-32 opacity-5 rotate-12"
                style={{ color: theme.primaryColor }}
              />
              <div className="relative z-10">
                <h2
                  className="text-sm font-bold tracking-widest uppercase mb-6"
                  style={{ color: theme.primaryColor }}
                >
                  Our Story
                </h2>
                <p
                  className="text-xl md:text-3xl leading-relaxed font-medium"
                  style={{ color: theme.secondaryColor }}
                >
                  {restaurant.about}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 3. MENU SECTION */}
      {categories.length > 0 && (
        <section className="bg-white py-16 md:py-24 border-y border-[#f0e0d8] shadow-sm">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="text-center mb-10">
              <h2
                className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
                style={{ color: theme.secondaryColor }}
              >
                The Menu
              </h2>
              <p className="text-lg text-gray-500 font-medium">
                Curated selections for every taste
              </p>
            </div>

            <div className="max-w-md mx-auto mb-10 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-5 py-3.5 rounded-full border border-[#f0e0d8] bg-[#fff8f5] text-base font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300"
                style={{ focusRingColor: theme.primaryColor } as any}
              />
            </div>

            <div className="flex gap-6 overflow-x-auto pb-4 mb-12 no-scrollbar border-b border-gray-100 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 md:justify-center">
              {categoryNames.map((category: string) => {
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className="relative pb-4 text-lg font-semibold whitespace-nowrap transition-colors duration-300 snap-start"
                    style={{
                      color: isActive ? theme.secondaryColor : "#9ca3af",
                    }}
                  >
                    {category}
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                        style={{ backgroundColor: theme.primaryColor }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
 {/* Menu Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {displayedItems.map((item, index) => (
            <div
              key={index}
              className="group flex flex-col sm:flex-row bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Image Container - 4:3 on mobile, square on desktop */}
              <div className="w-full sm:w-48 aspect-[4/3] sm:aspect-square overflow-hidden shrink-0 bg-gray-50 relative">
                <img
                  src={item.image || '/images/food-placeholder.jpg'}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Subtle gradient overlay for image depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* Content Container */}
              <div className="p-5 sm:p-6 flex flex-col flex-1 justify-center">
                <div className="flex justify-between items-start gap-4 mb-2">
                  <h3
                    className="text-lg lg:text-xl font-bold leading-tight"
                    style={{
                      color: theme.secondaryColor,
                    }}
                  >
                    {item.name}
                  </h3>
                  <span
                    className="text-sm font-bold px-3 py-1.5 rounded-full whitespace-nowrap shrink-0"
                    style={{
                      color: theme.primaryColor,
                      backgroundColor: `${theme.primaryColor}15`, // 15 is hex for ~8% opacity
                    }}
                  >
                    {item.price}
                  </span>
                </div>

                {item.description && (
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mt-1">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Empty State */}
          {displayedItems.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-gray-100 border-dashed">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🍽️</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No dishes found
              </h3>
              <p className="text-gray-500">
                Try selecting a different category.
              </p>
            </div>
          )}
        </div>
          </div>
        </section>
      )}

      {offers.length > 0 && (
            <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="rounded-[0rem] bg-white p-8 shadow-[0_4px_24px_rgba(240,140,108,0.08)] border border-[#f0e0d8] h-full flex flex-col">
                <h2
                  className="text-sm font-bold tracking-widest uppercase mb-6"
                  style={{ color: theme.primaryColor }}
                >
                  Highlights
                </h2>
                <div className="flex flex-col gap-3 flex-1 justify-center">
                  {offers.map((offer: Record<string, any> | string, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-[#fff8f5] border border-[#f0e0d8] transition-transform duration-300 hover:-translate-y-1"
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: theme.primaryColor }}
                      />
                      <span
                        className="font-semibold text-lg"
                        style={{ color: theme.secondaryColor }}
                      >
                        {typeof offer === "string" ? offer : offer.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-16 md:pt-24">
        {/* 4. GALLERY */}
        {restaurant.gallery?.length > 0 && (
          <section className="mb-16 md:mb-24">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <h2
                  className="text-3xl md:text-4xl font-bold tracking-tight"
                  style={{ color: theme.secondaryColor }}
                >
                  Atmosphere
                </h2>
              </div>
            </div>

            <div className="relative -mx-4 px-4 md:mx-0 md:px-0">
              <div className="flex gap-4 md:gap-6 overflow-x-auto pb-8 pt-4 snap-x snap-mandatory no-scrollbar">
                {restaurant.gallery.map((img: string, index: number) => (
                  <div
                    key={index}
                    className="relative shrink-0 w-72 md:w-96 h-56 md:h-72 rounded-[2rem] overflow-hidden shadow-md snap-center group cursor-pointer"
                  >
                    <img
                      src={img}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      alt={`Gallery ${index + 1}`}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <ZoomIn className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-50 group-hover:scale-100" />
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="absolute top-0 bottom-8 right-0 w-12 pointer-events-none hidden md:block"
                style={{
                  backgroundImage: `linear-gradient(to left, ${theme.backgroundColor}, transparent)`,
                }}
              />
            </div>
          </section>
        )}

        {restaurant.whatsapp && (
  <a
    href={`https://wa.me/${restaurant.whatsapp}`}
    target="_blank"
    rel="noreferrer"
    className="fixed bottom-6 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-2xl animate-[shake_1.5s_ease-in-out_infinite] hover:scale-110 transition-transform"
    title="Chat on WhatsApp"
  >
    <FaWhatsapp className="w-8 h-8" />
  </a>
)}

        {/* 5. FIND US */}
        <section className="bg-white rounded-[2.5rem] border border-[#f0e0d8] shadow-[0_4px_24px_rgba(240,140,108,0.08)] overflow-hidden">
          {restaurant.location && (
            <div className="p-2">
              <div className="rounded-[2rem] overflow-hidden border border-[#f0e0d8] relative h-80 md:h-[28rem] group">
                <iframe
                  src={mapEmbedUrl}
                  className="w-full h-full filter grayscale-[10%] contrast-[1.05] group-hover:grayscale-0 transition-all duration-500"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              <div className="p-6 md:p-10 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
                <div className="flex items-start md:items-center gap-4">
                  <div
                    className="p-4 rounded-full bg-[#fff8f5] shrink-0"
                    style={{ color: theme.primaryColor }}
                  >
                    <MapPin className="w-8 h-8" />
                  </div>
                  <div>
                    <h3
                      className="text-sm font-bold tracking-widest uppercase mb-1"
                      style={{ color: theme.primaryColor }}
                    >
                      Location
                    </h3>
                    <p
                      className="font-bold text-xl md:text-2xl tracking-tight"
                      style={{ color: theme.secondaryColor }}
                    >
                      {restaurant.location}
                    </p>
                  </div>
                </div>

                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-3 rounded-full px-8 py-4 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 w-full md:w-auto text-lg"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <span>Get Directions</span>
                  <ArrowRight className="w-6 h-6" />
                </a>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="text-center py-8 mt-6">
        <p className="text-sm text-gray-400 font-medium">
          Powered by{" "}
          <span style={{ color: theme.primaryColor }} className="font-semibold">
            ScanDish
          </span>{" "}
          · Smart QR Scan Experience
        </p>
      </div>

      
    </main>
  );
}