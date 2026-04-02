"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "../../../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function RestaurantPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [restaurant, setRestaurant] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Overview");

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
    return ["Overview", ...categories.map((cat: any) => cat.category)];
  }, [categories]);

  const overviewItems = useMemo(() => {
    return categories.map((cat: any) => cat.items?.[0]).filter(Boolean);
  }, [categories]);

  const displayedItems =
    activeCategory === "Overview"
      ? overviewItems
      : categories.find((cat: any) => cat.category === activeCategory)?.items || [];

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
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Page link copied");
      }
    } catch (error) {
      console.error(error);
    }
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

  if (notFoundState || !restaurant) {
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
      className="min-h-screen"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] border border-[#f2ddd6] bg-white shadow-sm">
          <div className="relative h-72 md:h-[26rem]">
            <img
              src={restaurant.coverImage || "/images/kigali-grill.jpg"}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

            <div className="absolute top-5 right-5">
              <button
                onClick={sharePage}
                className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-white transition"
              >
                <span>🔗</span>
                <span>Share</span>
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
              <div className="flex items-end gap-4">
                {restaurant.logo ? (
                  <img
                    src={restaurant.logo}
                    alt={`${restaurant.name} logo`}
                    className="w-15 h-15 md:w-24 md:h-24 rounded-2xl object-cover border-2 border-white shadow-lg bg-white"
                  />
                ) : (
                  <div className="w-15 h-15 md:w-24 md:h-24 rounded-2xl border-2 border-white shadow-lg flex items-center justify-center text-3xl bg-white">
                    🍽️
                  </div>
                )}

                <div className="pb-1">
                  <p className="text-white/85 text-sm font-medium">Welcome to</p>
                  <h1 className="text-white text-2xl md:text-3xl font-bold leading-tight">
                    {restaurant.name}
                  </h1>
                  {restaurant.description && (
                    <p className="mt-0.5 text-white/90 text-sm md:text-base max-w-2xl">
                      {restaurant.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <section className="mt-3">
          <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="rounded-2xl px-4 py-4 text-center font-semibold text-white shadow-sm hover:opacity-95 transition"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Call
              </a>
            )}

            {restaurant.whatsapp && (
              <a
                href={`https://wa.me/${restaurant.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl px-4 py-4 text-center font-semibold text-white shadow-sm hover:opacity-95 transition"
                style={{ backgroundColor: theme.primaryColor }}
              >
                WhatsApp
              </a>
            )}

            {restaurant.website && (
              <a
                href={`https://www.${restaurant.website}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl px-4 py-4 text-center font-semibold text-white shadow-sm hover:opacity-95 transition"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Website
              </a>
            )}

            {restaurant.social?.instagram && (
              <a
                href={`https://instagram.com/${restaurant.social.instagram}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl px-4 py-4 text-center font-semibold text-white shadow-sm hover:opacity-95 transition"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Instagram
              </a>
            )}

            {restaurant.social?.facebook && (
              <a
               href={`https://facebook.com/${restaurant.social.facebook}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl px-4 py-4 text-center font-semibold text-white shadow-sm hover:opacity-95 transition"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Facebook
              </a>
            )}

            {restaurant.social?.tiktok && (
              <a
                href={`https://tiktok.com/@${restaurant.social.tiktok}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl px-4 py-4 text-center font-semibold text-white shadow-sm hover:opacity-95 transition"
                style={{ backgroundColor: theme.primaryColor }}
              >
                TikTok
              </a>
            )}
          </div>
        </section>

        {/* Offers */}
        {offers.length > 0 && (
          <section className="mt-8">
            <div className="mb-4">
              <h2
                className="text-2xl md:text-3xl font-bold"
                style={{ color: theme.secondaryColor }}
              >
                Offers & Perks
              </h2>
              <p className="text-gray-500 mt-1">
                What customers can enjoy here
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {offers.map((offer: string, index: number) => (
                <div
                  key={index}
                  className="rounded-[1.5rem] border border-[#f2ddd6] bg-white px-5 py-5 shadow-sm"
                >
                  <p
                    className="font-semibold text"
                    style={{ color: theme.secondaryColor }}
                  >
                    {offer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* About */}
        {restaurant.about && (
          <section className="mt-8">
            <h2
              className="text-2xl md:text-3xl font-bold"
              style={{ color: theme.secondaryColor }}
            >
              About Us
            </h2>
            <p className="mt-4 text-base md:text-lg leading-8 text-gray-700">
              {restaurant.about}
            </p>
          </section>
        )}

        {/* Menu */}
        {categories.length > 0 && (
          <section className="mt-8">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <h2
                  className="text-2xl md:text-3xl font-bold"
                  style={{ color: theme.secondaryColor }}
                >
                  Our Menu
                </h2>
                <p className="text-gray-500 mt-1">
                  Explore what the offers
                </p>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {categoryNames.map((category: string) => {
                const isActive = activeCategory === category;

                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className="px-5 py-3 rounded-2xl font-semibold whitespace-nowrap transition shadow-sm"
                    style={{
                      backgroundColor: isActive ? theme.primaryColor : "#fff7f3",
                      color: isActive ? "#ffffff" : theme.secondaryColor,
                      border: `1px solid ${isActive ? theme.primaryColor : "#f2ddd6"}`,
                    }}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">
              {displayedItems.map((item: any, index: number) => (
                <div
                  key={index}
                  className="group rounded-[2rem] overflow-hidden border border-[#f2ddd6] bg-white shadow-sm hover:shadow-md transition"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={item.image || "/images/food1.jpg"}
                      alt={item.name}
                      className="w-full h-60 object-cover group-hover:scale-105 transition duration-500"
                    />

                    <div className="absolute top-4 right-4">
                      <span
                        className="inline-flex rounded-full px-4 py-2 text-sm font-bold text-white shadow-sm"
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        {item.price}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3
                      className="text-2xl font-bold"
                      style={{ color: theme.secondaryColor }}
                    >
                      {item.name}
                    </h3>

                    {item.description && (
                      <p className="mt-1 text-gray-600 leading-7">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Gallery */}
        {restaurant.gallery?.length > 0 && (
          <section className="mt-8">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <h2
                  className="text-2xl md:text-3xl font-bold"
                  style={{ color: theme.secondaryColor }}
                >
                  Gallery
                </h2>
                <p className="text-gray-500 mt-1">
                  A quick look at the atmosphere and views
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {restaurant.gallery.map((img: string, index: number) => (
                <div
                  key={index}
                  className="rounded-[1.5rem] overflow-hidden border border-[#f2ddd6] bg-white shadow-sm"
                >
                  <img
                    src={img}
                    className="w-full h-40 md:h-52 object-cover hover:scale-105 transition duration-500"
                    alt={`Gallery ${index + 1}`}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Find us */}
        {restaurant.location && (
          <section className="mt-8">
            <div className="bg-white rounded-[2rem] border border-[#f2ddd6] shadow-sm overflow-hidden">
              <div className="p-6 md:p-8">
                <h2
                  className="text-2xl font-bold"
                  style={{ color: theme.secondaryColor }}
                >
                  Find Us
                </h2>
                <p className="text-sm text-gray-500 mt-1 mb-5">
                  Open the map or get directions
                </p>

                <div className="rounded-[1.5rem] overflow-hidden border border-[#f2ddd6]">
                  <iframe
                    src={mapEmbedUrl}
                    className="w-full h-72 md:h-96"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>

                <div className="mt-5 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                  <div>
                    <p
                      className="font-semibold text-lg"
                      style={{ color: theme.secondaryColor }}
                    >
                      {restaurant.location}
                    </p>
                  </div>

                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-white font-semibold shadow-sm"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    Get Directions
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-10">
          <div className="rounded-[1rem] border border-white bg-white px-6 py-6 shadow-sm text-center">
            <p
              className="text-lg font-bold"
              style={{ color: theme.secondaryColor }}
            >
              Powered by <span style={{ color: theme.primaryColor }}>ScanDish</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Smart QR Scan Experience
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}