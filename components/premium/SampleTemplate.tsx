"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Globe,
  MapPin,
  Phone,
  Share2,
  Star,
  LayoutList, // Bar Icon
  CreditCard, // Card Icon
  LayoutGrid, // Square Icon
  Search,
  X,
} from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa6";

export default function CamelliaTemplate({ restaurant }: { restaurant: any }) {
  const menu = restaurant.menu || [];
  const gallery = restaurant.gallery || [];
  const offers = restaurant.offers || [];

  // UI States
  const [activeCategory, setActiveCategory] = useState(menu[0]?.category || "");
  const [viewMode, setViewMode] = useState<"bar" | "card" | "square">("card");
  const [searchQuery, setSearchQuery] = useState("");

  const cover = restaurant.coverImage || "/images/hero.png";
  const logo = restaurant.logo || "/images/logo.jpg";

  // Search logic: Filters items across all categories
  const filteredMenu = useMemo(() => {
    if (!searchQuery) return menu;
    return menu.map((cat: any) => ({
      ...cat,
      items: cat.items.filter((item: any) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    })).filter((cat: any) => cat.items.length > 0);
  }, [menu, searchQuery]);

  const sharePage = async () => {
    if (navigator.share) {
      await navigator.share({
        title: restaurant.name,
        text: `Explore ${restaurant.name}`,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard");
    }
  };

  const directionsUrl = restaurant.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(restaurant.location)}`
    : "";

  return (
    <main className="min-h-screen bg-white text-zinc-900 selection:bg-red-900 selection:text-white font-sans">
      
      {/* HERO SECTION - Optimized for Mobile visibility */}
      <section className="relative min-h-[85vh] w-full overflow-hidden flex flex-col">
        <img
          src={cover}
          alt={restaurant.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" /> 
        
        <nav className="relative z-20 mx-auto w-full max-w-7xl flex items-center justify-between px-6 py-6 md:py-8">
          <div className="flex items-center gap-3 md:gap-4">
            <img
              src={logo}
              alt={restaurant.name}
              className="h-12 w-12 md:h-14 md:w-14 rounded-full border-2 border-white object-cover shadow-xl"
            />
            <div className="text-white">
              <p className="text-[9px] md:text-[10px] uppercase tracking-[0.5em] opacity-80">ESTABLISHED</p>
              <p className="font-serif text-lg md:text-xl font-medium tracking-tight">{restaurant.name}</p>
            </div>
          </div>

          <button
            onClick={sharePage}
            className="flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md transition-all hover:bg-white hover:text-black"
          >
            <Share2 className="h-3 w-3" />
            <span className="hidden xs:inline">Share</span>
          </button>
        </nav>

        <div className="relative z-10 mx-auto flex flex-1 flex-col items-center justify-center px-6 text-center text-white pb-32">
          <span className="mb-4 inline-block h-px w-12 bg-red-600"></span>
          <p className="mb-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.6em]">
            The Art of Gastronomy
          </p>

          <h1 className="font-serif text-5xl md:text-8xl font-light leading-tight tracking-tight max-w-4xl">
            {restaurant.name}
          </h1>

          {restaurant.description && (
            <p className="mt-6 md:mt-8 max-w-2xl font-light leading-relaxed opacity-95 text-sm md:text-xl">
              {restaurant.description}
            </p>
          )}

          {/* Explicit Z-Index and Margin to stay clear of Offers card */}
          <div className="mt-10 md:mt-12 flex flex-wrap justify-center gap-4 relative z-30">
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="bg-red-900 border border-red-900 px-6 md:px-10 py-3 md:py-4 text-xs md:text-sm font-bold uppercase tracking-widest text-white transition-all active:scale-95 shadow-xl"
              >
                Reserve a Table
              </a>
            )}
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="border border-white px-6 md:px-10 py-3 md:py-4 text-xs md:text-sm font-bold uppercase tracking-widest text-white backdrop-blur-sm transition-all hover:bg-white hover:text-black active:scale-95 shadow-xl"
              >
                Find Us
              </a>
            )}
          </div>
        </div>
      </section>

      {/* OFFERS - Shifted properly so buttons above are accessible */}
      {offers.length > 0 && (
        <section className="relative z-20 -mt-16 mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid gap-px bg-zinc-200 shadow-2xl sm:grid-cols-3 overflow-hidden rounded-sm">
            {offers.slice(0, 3).map((offer: any, index: number) => (
              <div
                key={index}
                className="group bg-white p-8 md:p-12 text-center transition-colors hover:bg-zinc-50"
              >
                <Star className="mx-auto mb-4 h-5 w-5 text-red-900" />
                <p className="font-serif text-base md:text-lg italic text-zinc-800 group-hover:text-red-900">
                  {typeof offer === "string" ? offer : offer.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ABOUT SECTION - Provides natural spacing before menu */}
      {restaurant.about && (
        <section className="mx-auto max-w-5xl px-6 py-20 md:py-32 text-center">
          <p className="mb-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] text-red-900">
            Our Heritage
          </p>
          <h2 className="mb-8 md:mb-10 font-serif text-3xl md:text-6xl font-light leading-tight text-zinc-900">
            A tradition of excellence <br className="hidden md:block" /> in every ingredient.
          </h2>
          <div className="mx-auto h-px w-16 bg-zinc-200 mb-8 md:mb-10"></div>
          <p className="mx-auto max-w-3xl font-light leading-relaxed text-zinc-600 text-sm md:text-xl">
            {restaurant.about}
          </p>
        </section>
      )}

      {/* MENU NAVIGATION - Mobile Focused (Sticky) */}
      <div className="sticky top-0 z-40 w-full border-y border-zinc-100 bg-white/95 backdrop-blur-lg mt-8 md:mt-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
            
            {/* Search Bar - Full width on mobile */}
            <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input 
                    type="text" 
                    placeholder="Search menu items..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-full border border-zinc-200 bg-zinc-50 px-12 py-3 text-sm transition-all focus:border-red-900 focus:outline-none focus:ring-1 focus:ring-red-900"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2">
                        <X className="h-4 w-4 text-zinc-400 hover:text-zinc-900" />
                    </button>
                )}
            </div>

            {/* View Mode Switcher - Centered on mobile */}
            <div className="flex items-center justify-center gap-2 rounded-full border border-zinc-100 bg-zinc-100/50 p-1 self-center">
              {[
                { id: "bar", icon: LayoutList, label: "Bar" },
                { id: "card", icon: CreditCard, label: "Card" },
                { id: "square", icon: LayoutGrid, label: "Square" },
              ].map((mode) => (
                <button 
                  key={mode.id}
                  onClick={() => setViewMode(mode.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${viewMode === mode.id ? 'bg-red-900 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  <mode.icon size={16} />
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category Slider - Mobile Swipeable */}
          {!searchQuery && (
            <div className="no-scrollbar flex w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                <div className="flex items-center gap-6 md:gap-10 border-t border-zinc-50 pt-3 mx-auto">
                {menu.map((cat: any) => (
                    <button
                    key={cat.category}
                    onClick={() => setActiveCategory(cat.category)}
                    className={`whitespace-nowrap text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] transition-all pb-2 border-b-2 ${
                        activeCategory === cat.category 
                        ? "text-red-900 border-red-900" 
                        : "text-zinc-400 hover:text-zinc-600 border-transparent"
                    }`}
                    >
                    {cat.category}
                    </button>
                ))}
                </div>
            </div>
          )}
        </div>
      </div>

      {/* SIGNATURE MENU CONTENT */}
      <section className="bg-zinc-50 px-4 md:px-6 py-12 md:py-20 min-h-[60vh]">
        <div className="mx-auto max-w-6xl">
          {filteredMenu.length === 0 ? (
            <div className="text-center py-20">
                <p className="font-serif text-xl text-zinc-400 italic">No matches found for "{searchQuery}"</p>
            </div>
          ) : (
            filteredMenu.filter((cat: any) => searchQuery || cat.category === activeCategory).map((cat: any, index: number) => (
                <div key={index} className="mb-16 md:mb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  
                  <div className="mb-8 md:mb-12 text-center">
                    <h3 className="font-serif text-2xl md:text-4xl font-light italic text-red-950 uppercase tracking-widest">
                      {cat.category}
                    </h3>
                  </div>
    
                  {/* VIEW: BAR (Classic Menu List with Images) */}
                  {viewMode === "bar" && (
                    <div className="mx-auto max-w-4xl space-y-6">
                      {cat.items.map((item: any, i: number) => (
                        <div key={i} className="flex items-start md:items-center gap-4 group border-b border-zinc-200 pb-6 last:border-0 transition-colors">
                          {item.image && (
                            <div className="h-16 w-16 md:h-20 md:w-20 flex-shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm">
                                <img src={item.image} className="h-full w-full object-cover" alt={item.name} />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-baseline justify-between gap-4">
                              <h4 className="font-serif text-base md:text-xl font-medium group-hover:text-red-900 transition-colors leading-tight">
                                {item.name}
                              </h4>
                              <div className="flex-1 border-b border-dotted border-zinc-300 mx-2" />
                              <span className="font-serif font-bold text-red-900 text-sm md:text-lg">{item.price}</span>
                            </div>
                            {item.description && (
                              <p className="mt-1 text-[11px] md:text-sm font-light italic text-zinc-500 leading-relaxed">{item.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
    
                  {/* VIEW: CARD (Modern Luxury Grid) */}
                  {viewMode === "card" && (
                    <div className="grid gap-6 md:gap-10 sm:grid-cols-2">
                      {cat.items.map((item: any, i: number) => (
                        <div key={i} className="flex flex-col bg-white border border-zinc-100 p-3 md:p-4 shadow-sm transition-all hover:shadow-xl group">
                          {item.image && (
                            <div className="aspect-[16/9] overflow-hidden mb-4">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                            </div>
                          )}
                          <div className="flex items-baseline justify-between">
                            <h4 className="font-serif text-lg md:text-2xl font-medium tracking-tight">
                              {item.name}
                            </h4>
                            <p className="font-serif font-bold text-red-900">
                              {item.price}
                            </p>
                          </div>
                          {item.description && (
                            <p className="mt-2 md:mt-3 text-[11px] md:text-sm font-light leading-relaxed text-zinc-500">
                              {item.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
    
                  {/* VIEW: SQUARE (No-Description Visual Grid) */}
                  {viewMode === "square" && (
                    <div className="grid gap-3 md:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                       {cat.items.map((item: any, i: number) => (
                        <div key={i} className="relative aspect-square overflow-hidden group bg-white border border-zinc-100 shadow-sm transition-all hover:-translate-y-1">
                          {item.image ? (
                            <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center p-4 text-center bg-zinc-50">
                               <h4 className="font-serif text-[11px] md:text-sm italic">{item.name}</h4>
                            </div>
                          )}
                          {/* Permanent clear text overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-3 md:p-4">
                             <h4 className="text-white font-serif text-sm md:text-lg leading-tight">{item.name}</h4>
                             <p className="text-red-300 font-bold mt-1 text-xs md:text-sm">{item.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      </section>

      {/* GALLERY - High Clarity Atmosphere */}
      {gallery.length > 0 && (
        <section className="bg-white py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-12 md:mb-16 text-center">
              <p className="mb-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] text-red-900">
                Visuals
              </p>
              <h2 className="font-serif text-3xl md:text-5xl font-light">The Atmosphere</h2>
            </div>

            <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3 md:gap-6 md:space-y-6">
              {gallery.map((img: string, i: number) => (
                <div key={i} className="overflow-hidden shadow-sm transition-all hover:shadow-2xl active:scale-[0.98]">
                  <img
                    src={img}
                    alt="Gallery"
                    className="w-full object-cover rounded-sm brightness-105 contrast-[1.02]"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LOCATION & CONTACT - Mobile First Grid */}
      {restaurant.location && (
        <section className="border-t border-zinc-100 bg-zinc-50 px-6 py-20 md:py-28 text-zinc-900">
          <div className="mx-auto grid max-w-7xl gap-12 md:gap-16 lg:grid-cols-2 lg:items-center">
            <div className="order-2 lg:order-1">
              <p className="mb-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] text-red-900">
                Visit Us
              </p>
              <h2 className="font-serif text-3xl md:text-5xl font-light leading-tight">
                Where elegance <br className="hidden md:block"/> meets the city.
              </h2>
              <p className="mt-6 md:mt-8 font-serif text-xl md:text-2xl italic text-zinc-600">
                {restaurant.location}
              </p>

              <div className="mt-8 md:mt-12 flex flex-col gap-5 md:gap-6">
                {restaurant.phone && (
                    <a href={`tel:${restaurant.phone}`} className="flex items-center gap-4 group">
                        <Phone className="h-5 w-5 text-red-900 group-hover:scale-110 transition-transform" />
                        <span className="font-medium text-sm md:text-base">{restaurant.phone}</span>
                    </a>
                )}
                {directionsUrl && (
                    <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 font-bold uppercase tracking-widest text-red-900 hover:text-red-950 text-xs md:text-sm"
                    >
                    Get Directions
                    <ArrowRight className="h-4 w-4" />
                    </a>
                )}
              </div>
            </div>

            <div className="order-1 lg:order-2">
                <div className="relative aspect-square w-full overflow-hidden shadow-2xl rounded-sm transition-all duration-700 lg:aspect-video border border-white">
                    <iframe
                    src={`https://www.google.com/maps?q=${encodeURIComponent(restaurant.location)}&output=embed`}
                    loading="lazy"
                    className="h-full w-full border-0 brightness-[0.9] contrast-[1.1]"
                    />
                </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA / SOCIALS - Centered for Impact */}
      <section className="bg-white px-6 py-24 md:py-32 text-center border-t border-zinc-100">
        <div className="mx-auto max-w-2xl">
            <Clock className="mx-auto mb-6 h-8 md:h-10 w-8 md:w-10 text-red-900/30" />
            <h2 className="font-serif text-3xl md:text-5xl font-light italic leading-tight">
                Experience the fine art <br className="hidden md:block" /> of {restaurant.name}
            </h2>
            <p className="mt-6 text-sm md:text-base font-light text-zinc-500">For inquiries, celebrations, and private events, please contact our concierge team.</p>

            <div className="mt-10 md:mt-12 flex flex-col sm:flex-row justify-center gap-4">
            {restaurant.whatsapp && (
                <a
                href={`https://wa.me/${restaurant.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 border border-zinc-200 px-8 py-4 text-[10px] md:text-xs font-bold uppercase tracking-widest text-zinc-900 transition-all hover:bg-zinc-900 hover:text-white"
                >
                <FaWhatsapp className="h-4 w-4" />
                WhatsApp Concierge
                </a>
            )}

            {restaurant.website && (
                <a
                href={restaurant.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 bg-red-900 px-8 py-4 text-[10px] md:text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-red-950"
                >
                <Globe className="h-4 w-4" />
                Official Website
                </a>
            )}
            </div>

            <div className="mt-16 flex justify-center gap-8 md:gap-10 text-xl md:text-2xl text-zinc-400">
            {restaurant.social?.instagram && (
                <a href={restaurant.social.instagram} target="_blank" rel="noreferrer" className="hover:text-red-900 transition-colors">
                <FaInstagram />
                </a>
            )}
            {restaurant.social?.facebook && (
                <a href={restaurant.social.facebook} target="_blank" rel="noreferrer" className="hover:text-red-900 transition-colors">
                <FaFacebook />
                </a>
            )}
            {restaurant.social?.tiktok && (
                <a href={restaurant.social.tiktok} target="_blank" rel="noreferrer" className="hover:text-red-900 transition-colors">
                <FaTiktok />
                </a>
            )}
            </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-zinc-50 px-6 py-12 text-center border-t border-zinc-100">
        <p className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] text-zinc-400">
          Managed with distinction by{" "}
          <Link href="/" className="font-bold text-red-900 hover:underline">
            ScanDish Premium
          </Link>
        </p>
      </footer>

      {/* Internal CSS for hiding scrollbar */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </main>
  );
}