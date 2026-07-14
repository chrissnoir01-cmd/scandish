"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CamelliaTemplate from "@/components/premium/CamelliaTemplate";
import SampleTemplate from "@/components/premium/SampleTemplate";
import FreshyTemplate from "@/components/premium/FreshyTemplate";

export default function PremiumRestaurantPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [restaurant, setRestaurant] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        const q = query(
          collection(db, "restaurants"),
          where("slug", "==", slug)
        );

        const snap = await getDocs(q);

        if (!snap.empty) {
          setRestaurant(snap.docs[0].data());
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) loadRestaurant();
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        Loading premium experience...
      </main>
    );
  }

  if (!restaurant) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#fff8f5] text-gray-900">
        Restaurant not found.
      </main>
    );
  }

  if (restaurant.plan !== "premium" || !restaurant.premiumEnabled) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#fff8f5] text-gray-900 px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">Premium page unavailable</h1>
          <p className="mt-3 text-gray-500">
            This restaurant does not have a premium page enabled.
          </p>
        </div>
      </main>
    );
  }

  switch (restaurant.premiumTemplate) {
    case "camellia":
      return <CamelliaTemplate restaurant={restaurant} />;

      case "sample":
        return <SampleTemplate restaurant={restaurant} />;

      case "freshy":
        return <FreshyTemplate restaurant={restaurant} />;  
    default:
      return (
        <main className="min-h-screen flex items-center justify-center bg-black text-white">
          Premium template not found.
        </main>
      );
  }
}