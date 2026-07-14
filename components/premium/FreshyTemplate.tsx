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
  LayoutList,
  CreditCard,
  LayoutGrid,
  Search,
  X,
  Leaf,
  ShoppingBag,
} from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa6";

export default function FreshMarketTemplate({ restaurant }: { restaurant: any }) {
  const menu = restaurant.menu || [];
  const gallery = restaurant.gallery || [];
  const offers = restaurant.offers || [];

  const [activeCategory, setActiveCategory] = useState(menu[0]?.category || "");
  const [viewMode, setViewMode] = useState<"bar" | "card" | "square">("card");
  const [searchQuery, setSearchQuery] = useState("");

  const cover = restaurant.coverImage || "/images/hero.png";
  const logo = restaurant.logo || "/images/logo.jpg";

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
        text: `Fresh finds at ${restaurant.name}`,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied!");
    }
  };

  const directionsUrl = restaurant.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(restaurant.location)}`
    : "";

  return (
    <main className="min-h-screen bg-[#FCFDF2] text-stone-800 selection:bg-lime-300 selection:text-green-900 font-sans">
      
      {/* HERO SECTION - Fresh & Organic Feel */}
      <section className="relative h-[70vh] md:h-[80vh] w-full overflow-hidden p-4 md:p-6">
        <div className="relative h-full w-full overflow-hidden rounded-[2rem] md:rounded-[3rem] shadow-2xl">
            <img
            src={cover}
            alt={restaurant.name}
            className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" /> 
            
            <nav className="relative z-20 flex items-center justify-between px-6 py-6">
            <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md p-2 pr-6 rounded-full shadow-lg">
                <img
                src={logo}
                alt={restaurant.name}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-lime-400"
                />
                <div>
                <p className="font-bold text-sm tracking-tight text-green-900">{restaurant.name}</p>
                <p className="text-[10px] uppercase font-bold text-lime-600 tracking-wider">Fresh Market</p>
                </div>
            </div>

            <button
                onClick={sharePage}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-green-800 shadow-lg transition-transform active:scale-90"
            >
                <Share2 className="h-4 w-4" />
            </button>
            </nav>

            <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white pb-20">
            <div className="mb-4 flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-950">
                <Leaf className="h-3 w-3" />
                Naturally Sourced
            </div>

            <h1 className="max-w-4xl text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter">
                {restaurant.name}
            </h1>

            {restaurant.description && (
                <p className="mt-4 max-w-xl font-medium text-white/90 text-sm md:text-lg">
                {restaurant.description}
                </p>
            )}

            <div className="mt-8 flex flex-wrap justify-center gap-3">
                {restaurant.phone && (
                <a
                    href={`tel:${restaurant.phone}`}
                    className="group flex items-center gap-2 rounded-full bg-white px-8 py-4 text-xs font-black uppercase tracking-widest text-green-900 transition-all hover:bg-yellow-400 active:scale-95 shadow-xl"
                >
                    <ShoppingBag className="h-4 w-4" />
                    Order Now
                </a>
                )}
                {directionsUrl && (
                <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border-2 border-white/50 backdrop-blur-md px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-white hover:text-green-900 active:scale-95"
                >
                    Visit Store
                </a>
                )}
            </div>
            </div>
        </div>
      </section>

      {/* OFFERS - Friendly Floating Badges */}
      {offers.length > 0 && (
        <section className="relative z-20 -mt-10 mx-auto max-w-5xl px-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {offers.slice(0, 3).map((offer: any, index: number) => (
              <div
                key={index}
                className="flex items-center gap-4 bg-yellow-50 border-2 border-yellow-200 p-6 rounded-2xl shadow-sm transition-transform hover:-rotate-1"
              >
                <div className="bg-yellow-400 p-2 rounded-lg">
                    <Star className="h-5 w-5 text-yellow-900" />
                </div>
                <p className="font-bold text-sm text-yellow-900 leading-tight">
                  {typeof offer === "string" ? offer : offer.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ABOUT SECTION - Clean & Minimal */}
      {restaurant.about && (
        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <div className="inline-block px-4 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
            Our Story
          </div>
          <h2 className="mb-6 text-3xl md:text-5xl font-black text-green-900 tracking-tight">
            Freshness you can <span className="text-lime-600 underline decoration-yellow-400 decoration-4">taste</span>.
          </h2>
          <p className="mx-auto max-w-2xl font-medium leading-relaxed text-stone-500 text-base md:text-lg">
            {restaurant.about}
          </p>
        </section>
      )}

      {/* STICKY MENU NAV - Rounded Pill Design */}
      <div className="sticky top-4 z-40 mx-auto w-[95%] max-w-6xl overflow-hidden rounded-3xl border border-stone-200 bg-white/80 backdrop-blur-xl shadow-xl mb-12">
        <div className="px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            
            {/* Search Bar */}
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input 
                    type="text" 
                    placeholder="Search fresh items..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border-none bg-stone-100 px-12 py-3 text-sm font-medium focus:ring-2 focus:ring-lime-400 transition-all"
                />
            </div>

            {/* View Switcher */}
            <div className="flex items-center justify-between gap-1 bg-stone-100 p-1 rounded-2xl">
              {[
                { id: "bar", icon: LayoutList },
                { id: "card", icon: CreditCard },
                { id: "square", icon: LayoutGrid },
              ].map((mode) => (
                <button 
                  key={mode.id}
                  onClick={() => setViewMode(mode.id as any)}
                  className={`p-2 px-4 rounded-xl transition-all ${viewMode === mode.id ? 'bg-white text-green-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  <mode.icon size={18} />
                </button>
              ))}
            </div>
          </div>

          {!searchQuery && (
            <div className="no-scrollbar mt-3 flex w-full overflow-x-auto gap-2 pb-1">
                {menu.map((cat: any) => (
                    <button
                        key={cat.category}
                        onClick={() => setActiveCategory(cat.category)}
                        className={`whitespace-nowrap px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ${
                            activeCategory === cat.category 
                            ? "bg-green-600 text-white shadow-md shadow-green-200" 
                            : "bg-white text-stone-500 border border-stone-100 hover:bg-stone-50"
                        }`}
                    >
                        {cat.category}
                    </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* MENU CONTENT - Vibrant Display */}
      <section className="px-4 md:px-6 pb-20 min-h-[50vh]">
        <div className="mx-auto max-w-6xl">
          {filteredMenu.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-stone-200">
                <p className="font-bold text-stone-400">No fresh finds match your search.</p>
            </div>
          ) : (
            filteredMenu.filter((cat: any) => searchQuery || cat.category === activeCategory).map((cat: any, index: number) => (
                <div key={index} className="mb-12 animate-in fade-in zoom-in-95 duration-500">
                  
                  <h3 className="mb-8 text-center text-xl font-black uppercase tracking-[0.3em] text-lime-700 flex items-center justify-center gap-4">
                    <span className="h-[2px] w-8 bg-lime-200" />
                    {cat.category}
                    <span className="h-[2px] w-8 bg-lime-200" />
                  </h3>
    
                  {/* VIEW: BAR (List) */}
                  {viewMode === "bar" && (
                    <div className="grid gap-3">
                      {cat.items.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-stone-100 hover:border-lime-300 transition-colors group">
                          {item.image && (
                            <img src={item.image} className="h-16 w-16 rounded-xl object-cover" alt={item.name} />
                          )}
                          <div className="flex-1 min-w-0">
                             <div className="flex items-center justify-between">
                                <h4 className="font-bold text-stone-800 truncate">{item.name}</h4>
                                <span className="font-black text-green-700 bg-green-50 px-3 py-1 rounded-lg text-sm">{item.price}</span>
                             </div>
                             <p className="text-xs text-stone-400 line-clamp-1">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
    
                  {/* VIEW: CARD (Market Grid) */}
                  {viewMode === "card" && (
                    <div className="grid gap-6 sm:grid-cols-2">
                      {cat.items.map((item: any, i: number) => (
                        <div key={i} className="overflow-hidden bg-white rounded-[2rem] border border-stone-100 transition-all hover:shadow-xl hover:shadow-lime-100/50 group">
                          {item.image && (
                            <div className="aspect-[16/10] overflow-hidden m-3 rounded-[1.5rem]">
                              <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            </div>
                          )}
                          <div className="p-6 pt-2">
                            <div className="flex items-start justify-between gap-4">
                              <h4 className="text-xl font-black text-stone-800 leading-tight">{item.name}</h4>
                              <div className="bg-yellow-400 text-yellow-950 font-black px-3 py-1 rounded-xl text-sm whitespace-nowrap shadow-sm">{item.price}</div>
                            </div>
                            {item.description && (
                              <p className="mt-3 text-sm font-medium text-stone-500 leading-relaxed">{item.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
    
                  {/* VIEW: SQUARE (Visual Grid) */}
                  {viewMode === "square" && (
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                       {cat.items.map((item: any, i: number) => (
                        <div key={i} className="group relative aspect-square overflow-hidden rounded-[2rem] bg-white border border-stone-100">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          ) : (
                            <div className="flex h-full items-center justify-center p-4 text-center bg-lime-50 text-lime-700 font-bold text-xs uppercase">{item.name}</div>
                          )}
                          <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg">
                             <h4 className="font-bold text-stone-800 text-xs truncate">{item.name}</h4>
                             <p className="text-green-600 font-black text-[10px] mt-0.5">{item.price}</p>
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

      {/* GALLERY - Bright Grid */}
      {gallery.length > 0 && (
        <section className="bg-stone-100 py-20 rounded-[3rem] mx-4">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-12 text-center">
              <span className="text-lime-600 font-black tracking-widest uppercase text-xs">Insta-Fresh</span>
              <h2 className="text-3xl md:text-5xl font-black text-green-900 mt-2">Market Vibes</h2>
            </div>
            <div className="columns-2 gap-4 space-y-4 lg:columns-3">
              {gallery.map((img: string, i: number) => (
                <img key={i} src={img} alt="Gallery" className="w-full rounded-3xl shadow-sm hover:scale-[1.02] transition-transform cursor-pointer" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LOCATION - Maps & Contact */}
      {restaurant.location && (
        <section className="px-6 py-24">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:items-center bg-white p-6 md:p-12 rounded-[3rem] border border-stone-100 shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-lime-600 font-black text-xs uppercase tracking-widest mb-4">
                <MapPin className="h-4 w-4" /> Find Us
              </div>
              <h2 className="text-4xl font-black text-green-900 leading-[1.1]">
                Locally sourced, <br/> daily delivered.
              </h2>
              <p className="mt-6 text-xl font-bold text-stone-500">
                {restaurant.location}
              </p>

              <div className="mt-10 flex flex-col gap-4">
                {restaurant.phone && (
                    <a href={`tel:${restaurant.phone}`} className="flex items-center gap-4 p-4 rounded-2xl bg-stone-50 hover:bg-lime-50 transition-colors group">
                        <div className="bg-white p-2 rounded-lg shadow-sm group-hover:text-lime-600">
                            <Phone className="h-5 w-5" />
                        </div>
                        <span className="font-black text-green-900">{restaurant.phone}</span>
                    </a>
                )}
                {directionsUrl && (
                    <a href={directionsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-black text-sm uppercase tracking-wider text-lime-600 hover:text-lime-700 px-4">
                        Get Directions <ArrowRight className="h-4 w-4" />
                    </a>
                )}
              </div>
            </div>

            <div className="relative aspect-square md:aspect-video overflow-hidden rounded-[2.5rem] shadow-inner border-8 border-stone-50">
                <iframe
                    src={`https://www.google.com/maps?q=${encodeURIComponent(restaurant.location)}&output=embed`}
                    loading="lazy"
                    className="h-full w-full border-0 grayscale-[0.2] contrast-[1.1]"
                />
            </div>
          </div>
        </section>
      )}

      {/* CTA & SOCIALS */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl bg-yellow-400 p-12 rounded-[4rem] shadow-2xl rotate-1">
            <Clock className="mx-auto mb-6 h-10 w-10 text-yellow-950" />
            <h2 className="text-4xl md:text-5xl font-black text-yellow-950 leading-none tracking-tighter">
                Keep it fresh, <br /> keep it healthy.
            </h2>
            
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            {restaurant.whatsapp && (
                <a
                href={`https://wa.me/${restaurant.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-full bg-green-900 px-8 py-4 text-xs font-black uppercase text-white shadow-lg hover:bg-green-800 transition-all active:scale-95"
                >
                <FaWhatsapp className="h-4 w-4" />
                Chat with Us
                </a>
            )}

            {restaurant.website && (
                <a
                href={restaurant.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-xs font-black uppercase text-yellow-950 shadow-lg hover:bg-yellow-50 transition-all active:scale-95"
                >
                <Globe className="h-4 w-4" />
                Visit Website
                </a>
            )}
            </div>

            <div className="mt-12 flex justify-center gap-6 text-2xl text-yellow-950/60">
                {restaurant.social?.instagram && (
                    <a href={restaurant.social.instagram} target="_blank" rel="noreferrer" className="hover:text-yellow-950 transition-colors"><FaInstagram /></a>
                )}
                {restaurant.social?.facebook && (
                    <a href={restaurant.social.facebook} target="_blank" rel="noreferrer" className="hover:text-yellow-950 transition-colors"><FaFacebook /></a>
                )}
                {restaurant.social?.tiktok && (
                    <a href={restaurant.social.tiktok} target="_blank" rel="noreferrer" className="hover:text-yellow-950 transition-colors"><FaTiktok /></a>
                )}
            </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pb-12 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-400 flex items-center justify-center gap-2">
          Powering Fresh Markets <span className="text-lime-600">●</span> 
          <Link href="/" className="text-green-900 hover:underline">ScanDish Fresh</Link>
        </p>
      </footer>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </main>
  );
}