import Image from "next/image";
import Link from "next/link";
import { FaInstagram, FaFacebook, FaTiktok, FaXTwitter } from "react-icons/fa6";

const BRAND = "#f08c6c";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fffaf7] text-gray-900">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-[#f2ddd6] bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 overflow-hidden rounded-2xl border border-[#f2ddd6] bg-white shadow-sm">
              <Image
                src="/images/logo.jpg"
                alt="ScanDish logo"
                fill
                className="object-cover"
                sizes="48px"
                priority
              />
            </div>

            <div>
              <p
                 className="mt-2 text-1xl md:text-4xl font-bold leading-tight">
                  {" "}
                <span style={{ color: BRAND }}>Scan</span>
                <span className=" text-gray-500">Dish </span>
              </p>
              
              <p className="text-sm text-gray-500">Smart QR </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-black transition">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-black transition">
              How it Works
            </a>
            <a href="#why-scandish" className="hover:text-black transition">
              Why ScanDish
            </a>
            <a href="#faq" className="hover:text-black transition">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            
            <Link
              href="/login"
              className="inline-flex px-5 py-2.5 rounded-2xl text-white font-semibold shadow-sm transition hover:opacity-95"
              style={{ backgroundColor: BRAND }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-30"
            style={{ backgroundColor: BRAND }}
          />
          <div className="absolute top-20 right-0 w-80 h-80 rounded-full bg-orange-100 blur-3xl opacity-40" />
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-16 md:pb-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              

              <h1 className="mt-6 text-4xl md:text-6xl font-bold leading-tight">
                Turn every QR scan into a{" "}
                <span style={{ color: BRAND }}>beautiful restaurant experience</span>
              </h1>

              <p className="mt-6 text-lg md:text-xl text-gray-600 leading-8 max-w-2xl">
                ScanDish helps restaurants publish digital menus, social links,
                directions, branded pages, and QR experiences that feel modern,
                trusted, and easy for customers to use.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-6 py-3.5 rounded-2xl text-white font-semibold shadow-sm"
                  style={{ backgroundColor: BRAND }}
                >
                  Start Your Restaurant Portal
                </Link>

                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center px-6 py-3.5 rounded-2xl border border-[#ead2ca] bg-white text-gray-700 font-semibold hover:bg-[#fff4ef] transition"
                >
                  See How It Works
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔒</span>
                  Secure restaurant portal
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  Fast QR access
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎨</span>
                  Branded restaurant themes
                </div>
              </div>
            </div>

            {/* Hero preview */}
            <div className="relative">
              <div className="rounded-[2rem] border border-[#efd7cf] bg-white shadow-xl p-4 md:p-6">
                <div className="rounded-[1.5rem] overflow-hidden border border-[#f3e2dc] bg-[#fffaf8]">
                  <div className="h-56 md:h-72 relative">
                    <Image
                      src="/images/logo.jpg"
                      alt="ScanDish preview"
                      fill
                      className="object-cover opacity-15"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-white/95 backdrop-blur rounded-2xl p-4 shadow-sm border border-[#f0ddd7]">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-[#ffe4da] flex items-center justify-center text-xl">
                            🍽️
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">Kiza Restaurant</h3>
                            <p className="text-sm text-gray-500">
                              Smart menu, directions, socials, and QR access
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-4">
                          <div className="rounded-xl bg-[#fff4ef] p-3 text-center text-sm font-medium">
                            Menu
                          </div>
                          <div className="rounded-xl bg-[#fff4ef] p-3 text-center text-sm font-medium">
                            Gallery
                          </div>
                          <div className="rounded-xl bg-[#fff4ef] p-3 text-center text-sm font-medium">
                            Find Us
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-white">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-[#f2ddd6] p-4">
                        <p className="text-sm text-gray-500">Customer view</p>
                        <p className="mt-1 font-semibold">Beautiful QR page</p>
                      </div>
                      <div className="rounded-2xl border border-[#f2ddd6] p-4">
                        <p className="text-sm text-gray-500">Restaurant view</p>
                        <p className="mt-1 font-semibold">Easy dashboard control</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden md:block absolute -bottom-6 -left-6 bg-white border border-[#efd7cf] shadow-lg rounded-3xl p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Trusted digital experience
                </p>
                <p className="font-semibold mt-1">Menus, QR, branding, directions</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-[#f2ddd6] bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="rounded-2xl bg-[#fff8f5] p-4 border border-[#f5e1da]">
              <p className="text-2xl font-bold">1 QR</p>
              <p className="text-sm text-gray-500 mt-1">per restaurant page</p>
            </div>
            <div className="rounded-2xl bg-[#fff8f5] p-4 border border-[#f5e1da]">
              <p className="text-2xl font-bold">100%</p>
              <p className="text-sm text-gray-500 mt-1">mobile-friendly access</p>
            </div>
            <div className="rounded-2xl bg-[#fff8f5] p-4 border border-[#f5e1da]">
              <p className="text-2xl font-bold">Easy</p>
              <p className="text-sm text-gray-500 mt-1">dashboard updates</p>
            </div>
            <div className="rounded-2xl bg-[#fff8f5] p-4 border border-[#f5e1da]">
              <p className="text-2xl font-bold">Modern</p>
              <p className="text-sm text-gray-500 mt-1">restaurant branding</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="max-w-2xl">
            <p
              className="text-sm font-semibold uppercase tracking-[0.25em]"
              style={{ color: BRAND }}
            >
              Features
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold">
              Everything restaurants need in one simple platform
            </h2>
            <p className="mt-4 text-gray-600 text-lg">
              ScanDish combines QR access, public restaurant pages, branding,
              contact tools, and digital menu control in one place.
            </p>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mt-12">
            {[
              {
                title: "Branded Restaurant Pages",
                text: "Give each restaurant a clean public page with logo, cover image, menu, gallery, and restaurant details.",
                icon: "🎨",
              },
              {
                title: "Unique QR Code",
                text: "Each restaurant gets a QR code that opens only that restaurant’s page for a simple customer experience.",
                icon: "📱",
              },
              {
                title: "Menu Management",
                text: "Add categories, images, descriptions, and prices from the dashboard without touching code.",
                icon: "🍽️",
              },
              {
                title: "Map Directions",
                text: "Customers can instantly open directions to the restaurant from their current location.",
                icon: "📍",
              },
              {
                title: "Social & Contact Links",
                text: "Connect customers to WhatsApp, website, Instagram, Facebook, TikTok, and direct calling.",
                icon: "🔗",
              },
              {
                title: "Theme Customization",
                text: "Restaurants can personalize page colors while keeping the ScanDish layout consistent and professional.",
                icon: "🖌️",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-[#f1ddd7] bg-white p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#fff1eb] flex items-center justify-center text-2xl">
                  {item.icon}
                </div>
                <h3 className="mt-5 text-xl font-bold">{item.title}</h3>
                <p className="mt-3 text-gray-600 leading-7">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-white border-y border-[#f2ddd6]">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p
              className="text-sm font-semibold uppercase tracking-[0.25em]"
              style={{ color: BRAND }}
            >
              How it works
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold">
              From dashboard to customer scan
            </h2>
            <p className="mt-4 text-gray-600 text-lg">
              ScanDish keeps the workflow simple for both restaurant owners and customers.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mt-12">
            {[
              ["1", "Create account", "Restaurant signs up and enters the portal."],
              ["2", "Set up restaurant", "Add menu, branding, contacts, gallery, and theme."],
              ["3", "Generate QR", "ScanDish creates a unique public QR destination."],
              ["4", "Customer scans", "Customer opens the restaurant page and interacts instantly."],
            ].map(([num, title, text]) => (
              <div
                key={num}
                className="rounded-3xl bg-[#fff8f5] border border-[#f1ddd7] p-6 text-center"
              >
                <div
                  className="w-14 h-14 mx-auto rounded-full text-white flex items-center justify-center text-xl font-bold"
                  style={{ backgroundColor: BRAND }}
                >
                  {num}
                </div>
                <h3 className="mt-5 text-xl font-bold">{title}</h3>
                <p className="mt-3 text-gray-600 leading-7">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why ScanDish */}
      <section id="why-scandish" className="py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p
                className="text-sm font-semibold uppercase tracking-[0.25em]"
                style={{ color: BRAND }}
              >
                Why ScanDish
              </p>
              <h2 className="mt-3 text-3xl md:text-4xl font-bold">
                Built to feel trustworthy, premium, and easy to use
              </h2>

              <div className="mt-8 space-y-5">
                {[
                  "Consistent professional design across all restaurant pages",
                  "Restaurant-controlled branding without changing the system layout",
                  "Clean customer experience with fast QR access",
                  "Safer dashboard controls and secure restaurant portal login",
                  "A solid SaaS foundation ready for growth and future premium features",
                ].map((point) => (
                  <div key={point} className="flex gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm mt-0.5"
                      style={{ backgroundColor: BRAND }}
                    >
                      ✓
                    </div>
                    <p className="text-gray-700 leading-7">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#f1ddd7] bg-white shadow-sm p-8">
              <div className="grid gap-4">
                <div className="rounded-3xl border border-[#f3e2dc] p-5 bg-[#fffaf8]">
                  <p className="text-sm text-gray-500">Trust</p>
                  <p className="text-2xl font-bold mt-1">Professional customer page</p>
                </div>

                <div className="rounded-3xl border border-[#f3e2dc] p-5 bg-[#fffaf8]">
                  <p className="text-sm text-gray-500">Control</p>
                  <p className="text-2xl font-bold mt-1">Restaurant-managed dashboard</p>
                </div>

                <div className="rounded-3xl border border-[#f3e2dc] p-5 bg-[#fffaf8]">
                  <p className="text-sm text-gray-500">Growth</p>
                  <p className="text-2xl font-bold mt-1">Built as a real SaaS product</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div
            className="rounded-[2rem] p-8 md:p-12 text-white shadow-lg"
            style={{ backgroundColor: BRAND }}
          >
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.25em] font-semibold text-white/80">
                Start now
              </p>
              <h2 className="mt-3 text-3xl md:text-5xl font-bold leading-tight">
                Give your restaurant a modern digital experience with ScanDish
              </h2>
              <p className="mt-5 text-lg text-white/90 leading-8">
                Launch your branded restaurant page, generate your QR code,
                and manage everything from one secure dashboard.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-6 py-3.5 rounded-2xl bg-white text-gray-900 font-semibold"
                >
                  Open Restaurant Portal
                </Link>

                <a
                  href="#features"
                  className="inline-flex items-center justify-center px-6 py-3.5 rounded-2xl border border-white/40 font-semibold text-white"
                >
                  Explore Features
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-white border-t border-[#f2ddd6]">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p
              className="text-sm font-semibold uppercase tracking-[0.25em]"
              style={{ color: BRAND }}
            >
              FAQ
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold">
              Common questions
            </h2>
          </div>

          <div className="mt-12 grid gap-4">
            {[
              [
                "What is ScanDish?",
                "ScanDish is a restaurant SaaS platform that lets restaurants create a branded QR-powered public page with menu, gallery, directions, social links, and more.",
              ],
              [
                "Do customers need to create accounts?",
                "No. Customers simply scan the QR code and view the restaurant page directly.",
              ],
              [
                "Can restaurants customize their page?",
                "Yes. Restaurants can manage branding, colors, menu content, logo, cover image, and contact details from the dashboard.",
              ],
              [
                "Is ScanDish mobile-friendly?",
                "Yes. The platform is designed to work well on mobile, which is the main way customers will access restaurant pages.",
              ],
            ].map(([q, a]) => (
              <div
                key={q}
                className="rounded-3xl border border-[#f1ddd7] bg-[#fffaf8] p-6"
              >
                <h3 className="text-lg font-bold">{q}</h3>
                <p className="mt-3 text-gray-600 leading-7">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
     <footer className="bg-[#fff8f5] border-t border-[#f2ddd6]">
  <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">

    {/* TOP */}
    <div className="flex flex-col md:flex-row gap-8 md:items-center md:justify-between">

      {/* LOGO */}
      <div className="flex items-center gap-3">
        <div className="relative w-11 h-11 overflow-hidden rounded-2xl border border-[#f2ddd6] bg-white">
          <Image
            src="/images/logo.jpg"
            alt="ScanDish logo"
            fill
            className="object-cover"
            sizes="44px"
          />
        </div>

        <div>
          <p className="text-xl md:text-2xl font-bold leading-tight">
            <span style={{ color: BRAND }}>Scan</span>
            <span className="text-gray-500">Dish</span>
          </p>
          <p className="text-sm text-gray-500">Smart QR Experience</p>
        </div>
      </div>

      {/* LINKS */}
      <div className="flex flex-wrap gap-5 text-sm text-gray-600">
        <a href="#features" className="hover:text-black transition">
          Features
        </a>
        <a href="#how-it-works" className="hover:text-black transition">
          How it Works
        </a>
        <a href="#faq" className="hover:text-black transition">
          FAQ
        </a>
        <Link href="/login" className="hover:text-black transition">
          Portal
        </Link>
      </div>

      {/* SOCIALS */}
      <div className="flex gap-4 text-gray-600 text-xl">
        <a
          href="https://instagram.com/scandish"
          target="_blank"
          className="hover:text-black transition"
        >
          <FaInstagram />
        </a>

        <a
          href="https://tiktok.com/@scandish"
          target="_blank"
          className="hover:text-black transition"
        >
          <FaTiktok />
        </a>

        <a
          href="https://x.com/scandish"
          target="_blank"
          className="hover:text-black transition"
        >
          <FaXTwitter />
        </a>

        <a
          href="https://facebook.com/scandish"
          target="_blank"
          className="hover:text-black transition"
        >
          <FaFacebook />
        </a>
      </div>
    </div>

    {/* BOTTOM */}
    <div className="mt-8 pt-6 border-t border-[#f2ddd6] flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-sm text-gray-500">
      
      <p>
        © {new Date().getFullYear()} ScanDish. All rights reserved.
      </p>

      <p>
      </p>

    </div>

  </div>
</footer>
    </main>
  );
}