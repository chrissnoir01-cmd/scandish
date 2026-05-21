"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Globe,
  MapPin,
  Phone,
  Share2,
  Star,
  Utensils,
} from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa6";

export default function CamelliaTemplate({ restaurant }: { restaurant: any }) {
  const menu = restaurant.menu || [];
  const gallery = restaurant.gallery || [];
  const offers = restaurant.offers || [];

  const cover = restaurant.coverImage || "/images/hero.png";
  const logo = restaurant.logo || "/images/logo.jpg";

  const sharePage = async () => {
    if (navigator.share) {
      await navigator.share({
        title: restaurant.name,
        text: `Explore ${restaurant.name}`,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("Premium page link copied");
    }
  };

  const mapUrl = restaurant.location
    ? `https://www.google.com/maps?q=${encodeURIComponent(
        restaurant.location
      )}&output=embed`
    : "";

  const directionsUrl = restaurant.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        restaurant.location
      )}`
    : "";

  return (
    <main className="min-h-screen bg-[#080504] text-white">
      {/* HERO */}
      <section className="relative min-h-screen overflow-hidden px-6">
        <img
          src={cover}
          alt={restaurant.name}
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#080504]" />

        <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt={restaurant.name}
              className="h-12 w-12 rounded-2xl object-cover border border-white/20"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#f08c6c]">
                Premium
              </p>
              <p className="font-black">{restaurant.name}</p>
            </div>
          </div>

          <button
            onClick={sharePage}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur"
          >
            <Share2 className="mr-2 inline h-4 w-4" />
            Share
          </button>
        </nav>

        <div className="relative z-10 mx-auto flex min-h-[80vh] max-w-6xl flex-col items-center justify-center text-center">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.45em] text-[#f08c6c]">
            Luxury Dining Experience
          </p>

          <h1 className="text-5xl font-black tracking-tight md:text-8xl">
            {restaurant.name}
          </h1>

          {restaurant.description && (
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/80 md:text-2xl">
              {restaurant.description}
            </p>
          )}

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="rounded-full bg-white px-7 py-4 font-black text-black"
              >
                <Phone className="mr-2 inline h-5 w-5" />
                Call
              </a>
            )}

            {restaurant.whatsapp && (
              <a
                href={`https://wa.me/${restaurant.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-green-500 px-7 py-4 font-black text-white"
              >
                <FaWhatsapp className="mr-2 inline h-5 w-5" />
                WhatsApp
              </a>
            )}

            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/25 bg-white/10 px-7 py-4 font-black backdrop-blur"
              >
                <MapPin className="mr-2 inline h-5 w-5" />
                Directions
              </a>
            )}
          </div>
        </div>
      </section>

      {/* OFFERS */}
      {offers.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-4 md:grid-cols-3">
            {offers.slice(0, 6).map((offer: any, index: number) => (
              <div
                key={index}
                className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur"
              >
                <Star className="mb-4 h-6 w-6 text-[#f08c6c]" />
                <p className="font-bold">
                  {typeof offer === "string" ? offer : offer.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ABOUT */}
      {restaurant.about && (
        <section className="mx-auto grid max-w-7xl gap-8 px-6 py-24 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.4em] text-[#f08c6c]">
              Our Story
            </p>
            <h2 className="text-4xl font-black md:text-6xl">
              Crafted for taste, comfort and moments.
            </h2>
          </div>

          <p className="text-xl leading-10 text-white/70">{restaurant.about}</p>
        </section>
      )}

      {/* SIGNATURE MENU */}
      {menu.length > 0 && (
        <section className="bg-[#110b08] px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 text-center">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.4em] text-[#f08c6c]">
                Signature Menu
              </p>
              <h2 className="text-4xl font-black md:text-6xl">
                Explore Our Menu
              </h2>
            </div>

            <div className="space-y-16">
              {menu.map((cat: any, index: number) => {
                const items = cat.items || [];
                const imageItems = items.filter((item: any) => item.image);
                const textItems = items.filter((item: any) => !item.image);

                return (
                  <div key={index}>
                    <div className="mb-8 flex items-center gap-4">
                      <Utensils className="text-[#f08c6c]" />
                      <h3 className="text-3xl font-black">{cat.category}</h3>
                    </div>

                    {imageItems.length > 0 && (
                      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {imageItems.map((item: any, i: number) => (
                          <div
                            key={i}
                            className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06]"
                          >
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-64 w-full object-cover"
                            />
                            <div className="p-6">
                              <div className="flex items-baseline gap-3">
                                <h4 className="text-xl font-black">
                                  {item.name}
                                </h4>
                                <div className="flex-1 border-b border-dotted border-white/25" />
                                <p className="font-black text-[#f08c6c]">
                                  {item.price}
                                </p>
                              </div>

                              {item.description && (
                                <p className="mt-3 text-white/60 italic">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {textItems.length > 0 && (
                      <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6 md:p-8">
                        <div className="space-y-5">
                          {textItems.map((item: any, i: number) => (
                            <div
                              key={i}
                              className="border-b border-white/10 pb-4 last:border-0"
                            >
                              <div className="flex items-baseline gap-3">
                                <h4 className="text-lg font-bold">
                                  {item.name}
                                </h4>
                                <div className="flex-1 border-b border-dotted border-white/25" />
                                <p className="font-bold italic text-[#f08c6c]">
                                  {item.price}
                                </p>
                              </div>

                              {item.description && (
                                <p className="mt-2 italic text-white/55">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* GALLERY */}
      {gallery.length > 0 && (
        <section className="px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.4em] text-[#f08c6c]">
                Atmosphere
              </p>
              <h2 className="text-4xl font-black md:text-6xl">
                Inside The Experience
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {gallery.slice(0, 6).map((img: string, i: number) => (
                <img
                  key={i}
                  src={img}
                  alt="Gallery"
                  className={`h-72 w-full rounded-[2rem] object-cover ${
                    i === 0 ? "md:col-span-2 md:h-[30rem]" : ""
                  }`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LOCATION */}
      {restaurant.location && (
        <section className="bg-white px-6 py-24 text-black">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.4em] text-[#f08c6c]">
                Visit Us
              </p>
              <h2 className="text-4xl font-black md:text-6xl">
                Find Our Location
              </h2>
              <p className="mt-5 text-xl text-gray-600">
                {restaurant.location}
              </p>

              {directionsUrl && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-8 inline-flex items-center rounded-full bg-black px-7 py-4 font-black text-white"
                >
                  Get Directions
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              )}
            </div>

            {mapUrl && (
              <iframe
                src={mapUrl}
                loading="lazy"
                className="h-[28rem] w-full rounded-[2rem] border"
              />
            )}
          </div>
        </section>
      )}

      {/* CONTACT */}
      <section className="px-6 py-20 text-center">
        <Clock className="mx-auto mb-4 h-8 w-8 text-[#f08c6c]" />
        <h2 className="text-4xl font-black">Ready to Visit?</h2>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {restaurant.phone && (
            <a
              href={`tel:${restaurant.phone}`}
              className="rounded-full bg-white px-7 py-4 font-black text-black"
            >
              Call Now
            </a>
          )}

          {restaurant.whatsapp && (
            <a
              href={`https://wa.me/${restaurant.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-green-500 px-7 py-4 font-black text-white"
            >
              WhatsApp
            </a>
          )}

          {restaurant.website && (
            <a
              href={restaurant.website}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 px-7 py-4 font-black"
            >
              <Globe className="mr-2 inline h-5 w-5" />
              Website
            </a>
          )}
        </div>

        <div className="mt-10 flex justify-center gap-5 text-2xl text-white/70">
          {restaurant.social?.instagram && (
            <a href={restaurant.social.instagram} target="_blank" rel="noreferrer">
              <FaInstagram />
            </a>
          )}
          {restaurant.social?.facebook && (
            <a href={restaurant.social.facebook} target="_blank" rel="noreferrer">
              <FaFacebook />
            </a>
          )}
          {restaurant.social?.tiktok && (
            <a href={restaurant.social.tiktok} target="_blank" rel="noreferrer">
              <FaTiktok />
            </a>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-white/50">
        <p>
          Premium experience powered by{" "}
          <Link href="/" className="font-black text-[#f08c6c]">
            ScanDish
          </Link>
        </p>
      </footer>
    </main>
  );
}