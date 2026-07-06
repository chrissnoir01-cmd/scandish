"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Globe,
  MapPin,
  Phone,
  Share2,
  Utensils,
  ChevronDown,
  Award,
  Clock,
  Compass,
} from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa6";

export default function SampleTemplatePremium({ restaurant }: { restaurant: any }) {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // --- Logic & Utilities ---
  const optimizeImage = (url: string, width = 1200) => {
    if (!url) return "";
    if (!url.includes("res.cloudinary.com")) return url;
    return url.replace("/upload/", `/upload/f_auto,q_auto,dpr_auto,w_${width}/`);
  };

  const sharePage = async () => {
    if (navigator.share) {
      await navigator.share({
        title: restaurant.name,
        text: `Discover ${restaurant.name} on ScanDish`,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard");
    }
  };

  const menu = restaurant.menu || [];
  const gallery = restaurant.gallery || [];
  const offers = restaurant.offers || [];
  
  const allCategories = ["All", ...menu.map((cat: any) => cat.category)];

  const filteredMenu = useMemo(() => {
    if (activeCategory === "All") return menu;
    return menu.filter((cat: any) => cat.category === activeCategory);
  }, [activeCategory, menu]);

  const directionsUrl = restaurant.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(restaurant.location)}`
    : "";

  return (
    <main className="min-h-screen bg-[#fdfcf6] text-[#064e3b] selection:bg-[#064e3b] selection:text-white">
      
      {/* 1. EDITORIAL NAVIGATION */}
      <nav className="fixed top-0 z-50 w-full border-b border-[#064e3b]/5 bg-[#fdfcf6]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <img
              src={restaurant.logo || "/images/logo.jpg"}
              alt="logo"
              className="h-10 w-10 rounded-full object-cover border border-[#064e3b]/10"
            />
            <div className="hidden sm:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] leading-none text-[#c5a358]">
                Premium Collection
              </p>
              <h2 className="text-sm font-black uppercase tracking-tighter">{restaurant.name}</h2>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={sharePage}
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest hover:opacity-60 transition-opacity"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
            <a 
              href={`tel:${restaurant.phone}`}
              className="hidden md:block rounded-full bg-[#064e3b] px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#c5a358] transition-colors"
            >
              Reservation
            </a>
          </div>
        </div>
      </nav>

      {/* 2. IMMERSIVE HERO */}
      <section className="relative flex h-screen items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <img
            src={optimizeImage(restaurant.coverImage || gallery[0])}
            alt="Hero"
            className="h-full w-full object-cover brightness-[0.85] contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#fdfcf6] via-transparent to-black/20" />
        </div>

        <div className="relative z-10 text-center px-6">
          <span className="mb-6 inline-block text-[11px] font-bold uppercase tracking-[0.6em] text-white/90">
            A New Standard of Taste
          </span>
          <h1 className="mb-8 font-serif text-7xl font-light tracking-tighter text-white md:text-[10rem] leading-[0.9]">
            {restaurant.name}
          </h1>
          <div className="mx-auto h-px w-24 bg-[#c5a358] mb-8" />
          <p className="mx-auto max-w-2xl text-lg font-light italic text-white/90 md:text-2xl drop-shadow-sm">
            {restaurant.description}
          </p>
          
          <div className="mt-12 flex flex-wrap justify-center gap-5">
            <a href="#menu" className="group rounded-full bg-[#064e3b] px-12 py-5 text-[11px] font-bold uppercase tracking-widest text-white shadow-2xl transition-all hover:scale-105">
              Explore The Menu
            </a>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-40">
          <ChevronDown className="h-8 w-8 text-[#064e3b]" />
        </div>
      </section>

      {/* 3. PHILOSOPHY / ABOUT */}
      {restaurant.about && (
        <section className="mx-auto max-w-7xl px-6 py-32">
          <div className="grid gap-20 lg:grid-cols-2 items-center">
            <div className="relative group">
              <div className="absolute -left-4 -top-4 h-32 w-32 border-l-2 border-t-2 border-[#c5a358]/30" />
              <img 
                src={optimizeImage(gallery[1] || restaurant.coverImage, 800)} 
                className="h-[600px] w-full rounded-2xl object-cover shadow-2xl grayscale hover:grayscale-0 transition-all duration-1000" 
                alt="Atmosphere" 
              />
              <div className="absolute -bottom-10 -right-10 hidden xl:block">
                 <div className="bg-[#c5a358] p-12 rounded-full text-white">
                    <Award className="w-12 h-12" />
                 </div>
              </div>
            </div>
            <div>
              <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.5em] text-[#c5a358]">The Heritage</p>
              <h2 className="mb-10 font-serif text-5xl leading-tight md:text-7xl">
                Where nature <br/><span className="italic">meets</span> the plate.
              </h2>
              <p className="text-xl leading-relaxed text-[#064e3b]/70 font-light">
                {restaurant.about}
              </p>
              <div className="mt-12 flex gap-12 border-t border-[#064e3b]/10 pt-12">
                 <div>
                    <h4 className="text-3xl font-serif">100%</h4>
                    <p className="text-[10px] uppercase tracking-widest opacity-50">Local Sourcing</p>
                 </div>
                 <div>
                    <h4 className="text-3xl font-serif">24/7</h4>
                    <p className="text-[10px] uppercase tracking-widest opacity-50">Fresh Arrival</p>
                 </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. REFINED MENU SECTION */}
      <section id="menu" className="bg-[#064e3b] py-32 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-24 text-center">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.6em] text-[#c5a358]">Our Collection</p>
            <h2 className="font-serif text-6xl md:text-9xl mb-12">La Carte</h2>
            
            {/* Elegant Filter */}
            <div className="flex flex-wrap justify-center gap-8 border-b border-white/10 pb-10">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-[11px] font-bold uppercase tracking-[0.3em] transition-all relative ${
                    activeCategory === cat ? "text-[#c5a358]" : "text-white/30 hover:text-white"
                  }`}
                >
                  {cat}
                  {activeCategory === cat && <span className="absolute -bottom-10 left-0 w-full h-0.5 bg-[#c5a358]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-40">
            {filteredMenu.map((cat: any, idx: number) => (
              <div key={idx} className="group">
                <div className="mb-16 flex items-center gap-8">
                  <span className="text-[#c5a358] font-serif text-3xl italic">0{idx + 1}</span>
                  <h3 className="font-serif text-4xl tracking-widest uppercase">{cat.category}</h3>
                  <div className="h-px flex-1 bg-white/10 transition-all group-hover:bg-[#c5a358]/30" />
                </div>

                <div className="grid gap-x-24 gap-y-16 lg:grid-cols-2">
                  {(cat.items || []).map((item: any, i: number) => (
                    <div key={i} className="flex gap-8 group/item">
                      {item.image && (
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-white/10 grayscale group-hover/item:grayscale-0 transition-all duration-500">
                          <img 
                            src={optimizeImage(item.image, 200)} 
                            className="h-full w-full object-cover" 
                            alt={item.name} 
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-2">
                          <h4 className="text-xl font-medium tracking-wide">{item.name}</h4>
                          <span className="font-serif text-xl text-[#c5a358]">{item.price}</span>
                        </div>
                        {item.description && (
                          <p className="mt-3 text-sm leading-relaxed text-white/40 italic font-light">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. MASONRY GALLERY */}
      {gallery.length > 0 && (
        <section className="py-32 px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
               <div>
                  <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.5em] text-[#c5a358]">Gallery</p>
                  <h2 className="font-serif text-5xl md:text-7xl">The Vibe.</h2>
               </div>
               <p className="max-w-md text-[#064e3b]/60 italic font-light text-lg">
                 A visual journey through our kitchen and the heart of our dining room.
               </p>
            </div>
            <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
              {gallery.map((img: string, i: number) => (
                <div key={i} className="overflow-hidden rounded-3xl break-inside-avoid shadow-xl transition-transform duration-500 hover:scale-[1.02]">
                  <img 
                    src={optimizeImage(img, 800)} 
                    alt="Gallery" 
                    className="w-full object-cover" 
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. LOCATION & DIRECTIONS */}
      <section className="bg-white px-6 py-32 text-[#064e3b]">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.5em] text-[#c5a358]">Visit Us</p>
              <h2 className="mb-8 font-serif text-5xl md:text-7xl">Join us at <br/>the <span className="italic">table</span>.</h2>
              
              <div className="space-y-10">
                <div className="flex items-start gap-5">
                  <MapPin className="mt-1 h-6 w-6 text-[#c5a358]" />
                  <p className="text-2xl font-light">{restaurant.location}</p>
                </div>
                {restaurant.phone && (
                  <div className="flex items-center gap-5">
                    <Phone className="h-6 w-6 text-[#c5a358]" />
                    <p className="text-2xl font-light">{restaurant.phone}</p>
                  </div>
                )}
                <div className="flex items-center gap-5">
                  <Clock className="h-6 w-6 text-[#c5a358]" />
                  <p className="text-2xl font-light">Daily: 12 PM — 11 PM</p>
                </div>
              </div>

              <div className="mt-16 flex gap-4">
                <a 
                  href={directionsUrl}
                  target="_blank"
                  className="inline-flex items-center gap-3 rounded-full bg-[#064e3b] px-10 py-5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#c5a358] transition-all"
                >
                  Get Directions <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="h-[600px] w-full overflow-hidden rounded-[3rem] shadow-2xl border border-[#064e3b]/5">
              {restaurant.location && (
                <iframe
                  src={`https://www.google.com/maps?q=${encodeURIComponent(restaurant.location)}&output=embed`}
                  className="h-full w-full grayscale contrast-125 brightness-110"
                  loading="lazy"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-[#064e3b] px-6 py-24 text-center text-white">
        <div className="mx-auto max-w-4xl">
          <h3 className="mb-12 font-serif text-4xl">Follow the Journey</h3>
          <div className="mb-16 flex justify-center gap-12">
            {restaurant.social?.instagram && (
              <a href={restaurant.social.instagram} target="_blank" className="text-white/40 hover:text-[#c5a358] transition-all scale-125">
                <FaInstagram size={28} />
              </a>
            )}
            {restaurant.social?.facebook && (
              <a href={restaurant.social.facebook} target="_blank" className="text-white/40 hover:text-[#c5a358] transition-all scale-125">
                <FaFacebook size={28} />
              </a>
            )}
            {restaurant.social?.tiktok && (
              <a href={restaurant.social.tiktok} target="_blank" className="text-white/40 hover:text-[#c5a358] transition-all scale-125">
                <FaTiktok size={28} />
              </a>
            )}
          </div>
          
          <div className="h-px w-full bg-white/5 mb-12" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/30">
              © {new Date().getFullYear()} {restaurant.name}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/30">
              Powered by <Link href="/" className="text-[#c5a358]">ScanDish Premium</Link>
            </p>
          </div>
        </div>
      </footer>

      {/* FLOATING CONTACT */}
      {restaurant.whatsapp && (
        <a 
          href={`https://wa.me/${restaurant.whatsapp}`}
          target="_blank"
          className="fixed bottom-10 right-10 z-[60] flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl transition-transform hover:scale-110"
        >
          <FaWhatsapp size={32} />
        </a>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;700;800&display=swap');
        .font-serif { font-family: 'Playfair Display', serif; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        html { scroll-behavior: smooth; }
      `}</style>
    </main>
  );
}