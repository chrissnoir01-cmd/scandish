"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  Utensils,
  MapPin,
  Link2,
  Paintbrush,
  ChevronDown,
  CheckCircle2,
  Menu,
  X,
  ArrowRight,
  Sparkles,
  Smartphone,
  Globe,
  Zap,
  Store,
  MousePointer2,
  LayoutDashboard
} from 'lucide-react';
import { FaInstagram, FaFacebook, FaTiktok, FaXTwitter } from "react-icons/fa6";

const BRAND_COLOR = "#f08c6c";

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a] selection:bg-[#f08c6c] selection:text-white overflow-x-hidden">
      {/* 1. STICKY NAVBAR */}
      <header 
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          scrolled ? "bg-white/90 backdrop-blur-md py-3 shadow-sm border-b border-gray-100" : "bg-transparent py-6"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-gray-100">
              <Image src="/images/logo.jpg" alt="ScanDish Logo" fill className="object-cover" />
            </div>
            <span className="text-2xl font-black tracking-tighter"> 
              Scan<span style={{ color: BRAND_COLOR }}>Dish</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-10">
            {['Features', 'How it Works', 'Why ScanDish', 'FAQ'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase().replace(/ /g, '-')}`} 
                className="text-sm font-bold text-gray-500 hover:text-[#f08c6c] transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="px-6 py-3 rounded-2xl text-white font-bold text-sm shadow-xl shadow-[#f08c6c]/20 hover:scale-[1.05] transition-all"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              Partner Portal
            </Link>
            <button className="lg:hidden p-2 text-gray-900" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-b border-gray-100 overflow-hidden shadow-2xl"
            >
              <div className="flex flex-col p-8 gap-6">
                <a href="#features" onClick={() => setMobileOpen(false)} className="text-xl font-bold">Features</a>
                <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="text-xl font-bold">How it Works</a>
                <a href="#why-scandish" onClick={() => setMobileOpen(false)} className="text-xl font-bold">Why ScanDish</a>
                <a href="#faq" onClick={() => setMobileOpen(false)} className="text-xl font-bold">FAQ</a>
                <Link href="/login" className="py-4 rounded-2xl text-center text-white font-bold" style={{ backgroundColor: BRAND_COLOR }}>Get Started</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-32 pb-20 lg:pt-52 lg:pb-40 overflow-hidden bg-[#fafafa]">
        {/* Background blobs for depth */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#f08c6c]/10 rounded-full blur-[120px] -mr-40 -mt-20" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#f08c6c]/5 rounded-full blur-[100px] -ml-20" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f08c6c]/10 text-[#f08c6c] text-[10px] font-black uppercase tracking-widest mb-8 border border-[#f08c6c]/20">
                <Sparkles size={14} />A Step to Digital Excellence
              </div>
              <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tight mb-8">
                Turn every QR scan into a <span style={{ color: BRAND_COLOR }}>beautiful</span> Branding Page
              </h1>
              <p className="text-lg md:text-xl text-gray-500 leading-relaxed max-w-xl mb-12">
                ScanDish helps you create smart QR-powered digital menu pages. Customers scan and instantly see your menu, food gallery, social links, and more.
              </p>
              <div className="flex flex-col sm:flex-row gap-5">
                <Link
                  href="/login"
                  className="px-10 py-5 rounded-2xl text-white font-black text-lg shadow-2xl shadow-[#f08c6c]/30 hover:translate-y-[-4px] transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  Start Your Restaurant Portal <ArrowRight size={20} />
                </Link>
                <a href="#how-it-works" className="px-10 py-5 rounded-2xl bg-white border border-gray-200 text-gray-900 font-bold text-lg hover:bg-gray-50 transition-all text-center">
                  See How It Works
                </a>
              </div>
            </motion.div>

            {/* HIGH-END PHONE MOCKUP FEATURING food3.jpg */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative flex justify-center lg:justify-end"
            >
              {/* Main Phone Device Frame */}
              <div className="relative w-[320px] h-[650px] bg-[#1a1a1a] rounded-[3.5rem] border-[10px] border-[#1a1a1a] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] overflow-hidden">
                {/* iPhone Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#1a1a1a] rounded-b-3xl z-30" />
                
                {/* Inner Screen Content */}
                <div className="absolute inset-0 bg-white pt-10 overflow-y-auto no-scrollbar">
                  {/* Digital Menu Hero Image */}
                  <div className="h-60 w-full relative">
                    <Image 
                        src="/images/hero.png" 
                        alt="Delicious Dish Preview" 
                        fill 
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-44 left-4 text-white">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Today's Special</p>
                        <h4 className="text-lg font-black leading-tight">Kiza Restaurant</h4>
                    </div>
                  </div>

                  {/* Menu Content Placeholder */}
                  <div className="p-5">
                    <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar">
                        {['All', 'Mains', 'Drinks', 'Sides'].map((cat, i) => (
                            <span key={i} className={`px-4 py-1.5 rounded-full text-[10px] font-bold ${i === 1 ? 'bg-[#f08c6c] text-white' : 'bg-gray-100 text-gray-400'}`}>{cat}</span>
                        ))}
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-4 p-3 border border-gray-50 rounded-2xl bg-[#fafafa]">
                                <div className="w-14 h-14 bg-gray-200 rounded-xl flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="h-3 w-2/3 bg-gray-200 rounded mb-2" />
                                    <div className="h-2 w-1/3 bg-gray-100 rounded" />
                                </div>
                                <div className="text-[12px] font-black text-[#f08c6c]">frw4,500</div>
                            </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Dashboard Element */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-12 top-1/4 bg-white p-5 rounded-3xl shadow-2xl border border-gray-100 hidden md:block z-40"
              >
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#f08c6c]/10 flex items-center justify-center text-[#f08c6c]"><Zap size={16} /></div>
                    <span className="text-xs font-black">Live Updates</span>
                </div>
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="w-2/3 h-full bg-[#f08c6c]" />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. TRUST/STAT STRIP */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { t: '1 QR Code', d: 'Unique restaurant ID', i: QrCode },
              { t: '100% Mobile', d: 'No app download needed', i: Smartphone },
              { t: 'Modern UI', d: 'Premium SaaS design', i: LayoutDashboard },
              { t: 'Smart Analytics', d: 'Track every menu scan', i: Zap },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center text-center group">
                <div className="w-12 h-12 rounded-2xl bg-[#fafafa] flex items-center justify-center text-[#f08c6c] mb-4 shadow-sm group-hover:scale-110 transition-transform">
                  <stat.i size={24} />
                </div>
                <h4 className="font-black text-sm mb-1">{stat.t}</h4>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{stat.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FEATURES SECTION */}
      <section id="features" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-[#f08c6c] font-black uppercase tracking-[0.3em] text-[10px] mb-4">Core Features</h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tight mb-6">A toolkit for the modern restaurateur.</h3>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { t: 'Branded Pages', d: 'Get a clean, professional public URL for your restaurant business.', i: Globe },
              { t: 'Unique QR Code', d: 'Instant access for customers with one scan—no account required.', i: QrCode },
              { t: 'Menu Management', d: 'Live price and availability updates from your central dashboard.', i: Utensils },
              { t: 'Map Directions', d: 'Help customers navigate directly to your doorstep with one click.', i: MapPin },
              { t: 'Social & Contact', d: 'Connected buttons for WhatsApp, Instagram, and phone calls.', i: Link2 },
              { t: 'Theme Customization', d: 'Adjust colors and branding to match your venue’s physical vibe.', i: Paintbrush },
            ].map((feature, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -8 }}
                className="p-10 rounded-[2.5rem] bg-gray-50 border border-transparent hover:border-[#f08c6c]/20 hover:bg-white hover:shadow-2xl transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center text-[#f08c6c] mb-8 group-hover:bg-[#f08c6c] group-hover:text-white transition-all">
                  <feature.i size={28} />
                </div>
                <h4 className="text-xl font-black mb-4">{feature.t}</h4>
                <p className="text-gray-500 text-sm leading-relaxed font-medium">{feature.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-32 bg-[#1a1a1a] text-white rounded-[4rem] mx-4 lg:mx-8 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-24">
            <h2 className="text-[#f08c6c] font-black uppercase tracking-[0.3em] text-[10px] mb-4 opacity-80">Simple Process</h2>
            <h3 className="text-4xl md:text-5xl font-black">Ready in four steps.</h3>
          </div>

          <div className="grid md:grid-cols-4 gap-12">
            {[
              { s: '01', t: 'Create Account', d: 'Sign up for your secure ScanDish restaurant portal.' },
              { s: '02', t: 'Set Up Venue', d: 'Add your menu items, gallery photos, and links.' },
              { s: '03', t: 'Generate QR', d: 'Download your custom QR code for table printing.' },
              { s: '04', t: 'Serve Guests', d: 'Let customers scan and browse your menu instantly.' },
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className="text-7xl font-black text-white/5 mb-6">{step.s}</div>
                <h4 className="text-xl font-bold mb-3">{step.t}</h4>
                <p className="text-gray-500 text-sm leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. WHY SCANDISH SECTION (FEATURING food3.jpg again for consistency) */}
      <section id="why-scandish" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative">
                <div className="relative rounded-[3rem] overflow-hidden shadow-2xl z-10">
                    <Image src="/images/image.jpg" width={800} height={1000} alt="Professional Menu" className="w-full h-auto object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
                {/* Accent shape */}
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#f08c6c] rounded-full blur-3xl opacity-20" />
            </div>
            <div>
              <h2 className="text-[#f08c6c] font-black uppercase tracking-[0.3em] text-[10px] mb-4">Why ScanDish</h2>
              <h3 className="text-4xl md:text-5xl font-black mb-8 leading-tight">Elevate your brand, <br/> delight your guests.</h3>
              <div className="space-y-6">
                {[
                  { t: 'Professional Customer Pages', d: 'Unlike messy PDFs, ScanDish provides a smooth, native app-like experience in the browser.' },
                  { t: 'Full Branding Control', d: 'You have 100% control over the photos, colors, and links your customers see.' },
                  { t: 'Secure & Reliable', d: 'Built as a modern SaaS product to ensure your portal and public pages are always online.' },
                  { t: 'Designed for Africa', d: 'Tailored for the local hospitality market, ensuring fast load times and clear layouts.' },
                ].map((reason, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f08c6c] flex items-center justify-center text-white mt-1">
                      <CheckCircle2 size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">{reason.t}</h4>
                      <p className="text-gray-500 text-sm font-medium">{reason.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CTA BANNER */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="rounded-[4rem] p-16 md:p-32 text-center relative overflow-hidden text-white shadow-2xl shadow-[#f08c6c]/30" 
            style={{ backgroundColor: BRAND_COLOR }}
          >
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">Ready to open your digital portal?</h2>
              <p className="text-white/80 mb-12 text-lg font-bold">Join the best restaurants using ScanDish today.</p>
              <Link href="/login" className="inline-flex items-center gap-3 bg-white text-[#f08c6c] px-12 py-5 rounded-2xl font-black text-xl hover:shadow-3xl transition-all">
                Get Started Now <MousePointer2 size={24} />
              </Link>
            </div>
            <div className="absolute top-0 right-0 p-10 opacity-10"><QrCode size={200} /></div>
          </motion.div>
        </div>
      </section>

      {/* 8. FAQ SECTION */}
      <section id="faq" className="py-32 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-[#f08c6c] font-black uppercase tracking-[0.3em] text-[10px] mb-4">Common Questions</h2>
            <h3 className="text-4xl font-black tracking-tight">Need help?</h3>
          </div>
          <div className="space-y-4">
            {[
              { q: 'What is ScanDish?', a: 'ScanDish is a professional SaaS platform that allows restaurants to create beautiful, web-based digital menu pages linked to unique QR codes.' },
              { q: 'Do customers need accounts?', a: 'No. ScanDish is a web app. Customers scan the QR code and your menu page opens directly in their browser instantly.' },
              { q: 'Can restaurants customize their page?', a: 'Yes! You can manage branding, colors, photos, and menu items via your secure restaurant portal.' },
              { q: 'Is ScanDish mobile-friendly?', a: 'ScanDish is 100% optimized for mobile devices, ensuring a premium experience for every diner.' },
            ].map((faq, i) => (
              <div key={i} className="border border-gray-100 rounded-3xl bg-gray-50 overflow-hidden">
                <button 
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-8 text-left font-black text-lg"
                >
                  {faq.q}
                  <ChevronDown className={`transition-transform duration-500 ${openFaq === i ? 'rotate-180 text-[#f08c6c]' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-8 pb-8 text-gray-500 font-medium leading-relaxed"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="bg-gray-200 pt-32 pb-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
            <div className="col-span-1 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-8">
                <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-sm">
                  <Image src="/images/logo.jpg" alt="ScanDish" fill />
                </div>
                <span className="text-2xl font-black tracking-tighter">ScanDish</span>
              </Link>
              <p className="text-gray-400 text-sm font-bold leading-relaxed mb-8">
                Modernizing the dining experience across Africa with smart technology.
              </p>
              <div className="flex gap-4">
                <a href="https://instagram.com/scandish_app" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 hover:text-[#f08c6c] shadow-sm transition-colors"><FaInstagram /></a>
                <a href="https://tiktok.com/scandish_app" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 hover:text-[#f08c6c] shadow-sm transition-colors"><FaTiktok /></a>
                <a href="https://x.com/scandish_app" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 hover:text-[#f08c6c] shadow-sm transition-colors"><FaXTwitter /></a>
                <a href="https://facebook.com/scandish_app" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 hover:text-[#f08c6c] shadow-sm transition-colors"><FaFacebook /></a>
              </div>
            </div>

            <div>
              <h5 className="font-black text-xs uppercase tracking-[0.3em] text-gray-900 mb-8">Features</h5>
              <ul className="space-y-4 text-sm font-bold text-gray-500">
                <li><a href="#features" className="hover:text-[#f08c6c]">Digital Menu</a></li>
                <li><a href="#features" className="hover:text-[#f08c6c]">Custom QR</a></li>
                <li><a href="#features" className="hover:text-[#f08c6c]">Branding</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-black text-xs uppercase tracking-[0.3em] text-gray-900 mb-8">Resources</h5>
              <ul className="space-y-4 text-sm font-bold text-gray-500">
                <li><a href="#how-it-works" className="hover:text-[#f08c6c]">How It Works</a></li>
                <li><a href="#faq" className="hover:text-[#f08c6c]">FAQ</a></li>
                <li><Link href="/login" className="hover:text-[#f08c6c]">Portal Login</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-black text-xs uppercase tracking-[0.3em] text-gray-900 mb-8">Legal</h5>
              <ul className="space-y-4 text-sm font-bold text-gray-500">
                <li><a href="#" className="hover:text-[#f08c6c]">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-[#f08c6c]">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-12 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
            <p>© {new Date().getFullYear()} ScanDish Platform. All rights reserved.</p>
            <div className="flex gap-8">
              <span>Built for Excellence</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}