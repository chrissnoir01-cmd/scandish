"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";

const BRAND = "#f08c6c";
const QR_DARK = "#7a4636";

type TabKey =
  | "general"
  | "branding"
  | "menu"
  | "social"
  | "gallery"
  | "offers";

 function TabButton({
  id,
  label,
  emoji,
  activeTab,
  setActiveTab,
}: {
  id: TabKey;
  label: string;
  emoji: string;
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
}) {
  const isActive = activeTab === id;

  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
        isActive
          ? "bg-[#f08c6c] text-white shadow-md"
          : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
      }`}
    >
      <span className="text-base">{emoji}</span>
      <span>{label}</span>
      {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-white" />}
    </button>
  );
}

  const SectionCard = ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
  }) => (
    <section className="overflow-hidden rounded-3xl border border-[#f4d4ca] bg-white shadow-sm">
      <div className="border-b border-[#f4d4ca] bg-[#fffdfa] px-6 py-4">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );


export default function DashboardPage() {
  const router = useRouter();

  const [company, setCompany] = useState<any | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [about, setAbout] = useState("");

  const [logo, setLogo] = useState("");
  const [coverImage, setCoverImage] = useState("");

  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");

  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tiktok, setTiktok] = useState("");

  const [primaryColor, setPrimaryColor] = useState(BRAND);
  const [secondaryColor, setSecondaryColor] = useState("#111827");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");

  const [category, setCategory] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [menu, setMenu] = useState<any[]>([]);

  const [gallery, setGallery] = useState<string[]>([]);
  const [offerInput, setOfferInput] = useState("");
  const [offers, setOffers] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingMenuImage, setUploadingMenuImage] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [confirmMenuRemove, setConfirmMenuRemove] = useState<string | null>(null);
  const [confirmGalleryRemove, setConfirmGalleryRemove] = useState<number | null>(null);
  const [confirmOfferRemove, setConfirmOfferRemove] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const loadRestaurant = async () => {
      if (!user) return;

      try {
        const docRef = doc(db, "restaurants", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          setName(data.name || "");
          setSlug(data.slug || "");
          setDescription(data.description || "");
          setAbout(data.about || "");

          setLogo(data.logo || "");
          setCoverImage(data.coverImage || "");

          setPhone(data.phone || "");
          setWhatsapp(data.whatsapp || "");
          setWebsite(data.website || "");
          setLocation(data.location || "");

          setInstagram(data.social?.instagram || "");
          setFacebook(data.social?.facebook || "");
          setTiktok(data.social?.tiktok || "");

          setPrimaryColor(data.theme?.primaryColor || BRAND);
          setSecondaryColor(data.theme?.secondaryColor || "#111827");
          setBackgroundColor(data.theme?.backgroundColor || "#ffffff");

          setMenu(data.menu || []);
          setGallery(data.gallery || []);
          setOffers(data.offers || []);

// 🔥 FIXED COMPANY FETCH (inside async)
if (data.companyId) {
  const companyRef = doc(db, "companies", data.companyId);
  const companySnap = await getDoc(companyRef);

  if (companySnap.exists()) {
    const companyData = companySnap.data();
    setCompany(companyData);

    if (companyData.subscriptionEnd) {
      const today = new Date();
      const end = new Date(companyData.subscriptionEnd);

      const diff = end.getTime() - today.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

      setDaysRemaining(days);
    }
  }
}
        }
      } catch (error) {
        console.error(error);
      }
    };

    loadRestaurant();
  }, [user]);

  

  const uploadImageToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Upload failed");
    }

    return data.url as string;
  };


  const addMenuItem = () => {
    if (!category || !itemName || !price) return;

    const existing = menu.find((c) => c.category === category);

    const newItem = {
      name: itemName,
      description: itemDescription,
      price,
      image: imageUrl,
    };

    if (existing) {
      existing.items.push(newItem);
      setMenu([...menu]);
    } else {
      setMenu([
        ...menu,
        {
          category,
          items: [newItem],
        },
      ]);
    }

    setItemName("");
    setItemDescription("");
    setPrice("");
    setImageUrl("");
  };

  const removeMenuItem = (categoryIndex: number, itemIndex: number) => {
    const updatedMenu = [...menu];
    updatedMenu[categoryIndex].items.splice(itemIndex, 1);

    if (updatedMenu[categoryIndex].items.length === 0) {
      updatedMenu.splice(categoryIndex, 1);
    }

    setMenu(updatedMenu);
    setConfirmMenuRemove(null);
  };

  const removeGalleryImage = (index: number) => {
    const updated = [...gallery];
    updated.splice(index, 1);
    setGallery(updated);
    setConfirmGalleryRemove(null);
  };

  const addOffer = () => {
    const clean = offerInput.trim();
    if (!clean) return;
    setOffers([...offers, clean]);
    setOfferInput("");
  };

  const removeOffer = (index: number) => {
    const updated = [...offers];
    updated.splice(index, 1);
    setOffers(updated);
    setConfirmOfferRemove(null);
  };

  const slugExistsForAnotherUser = async () => {
    const q = query(collection(db, "restaurants"), where("slug", "==", slug));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return false;
    return snapshot.docs.some((d) => d.id !== user?.uid);
  };

  const handleSave = async () => {
    if (!user) return alert("You must be logged in");
    if (!slug) return alert("Enter restaurant slug");
    if (!name) return alert("Enter restaurant name");

    if (uploadingLogo || uploadingCover || uploadingMenuImage || uploadingGallery) {
      alert("Please wait until all uploads finish.");
      return;
    }

    try {
      setSaving(true);

      const exists = await slugExistsForAnotherUser();
      if (exists) {
        alert("This slug is already being used. Choose another one.");
        setSaving(false);
        return;
      }

      await setDoc(
  doc(db, "restaurants", user.uid),
  {
        ownerUid: user.uid,
        ownerEmail: user.email,
        name,
        slug,
        description,
        about,
        logo,
        coverImage,
        phone,
        whatsapp,
        website,
        location,
        social: {
          instagram,
          facebook,
          tiktok,
        },
        theme: {
          primaryColor,
          secondaryColor,
          backgroundColor,
        },
        menu,
        gallery,
        offers,
           updatedAt: new Date().toISOString(),
  },
  { merge: true }
);

      alert("Saved successfully!");
    } catch (error) {
      console.error(error);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const downloadQRCodeSVG = () => {
    const svg = document.getElementById("restaurant-qr");
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);

    const blob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug || "restaurant"}-qrcode.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadQRCodePNG = async () => {
    const svg = document.getElementById("restaurant-qr");
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    const qrImg = new window.Image();
    qrImg.crossOrigin = "anonymous";

    qrImg.onload = () => {
      const canvas = document.createElement("canvas");
      const width = 900;
      const height = 1120;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#fff8f5";
      ctx.fillRect(0, 0, width, height);

      drawRoundedRect(ctx, 70, 70, 760, 980, 36);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#f4d4ca";
      ctx.stroke();

      drawRoundedRect(ctx, 120, 120, 660, 110, 28);
      ctx.fillStyle = BRAND;
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 34px Arial";
      ctx.textAlign = "center";
      ctx.fillText("ScanDish", width / 2, 170);

      ctx.font = "20px Arial";
      ctx.fillText("Smart QR Restaurant Experience", width / 2, 205);

      drawRoundedRect(ctx, 175, 270, 550, 550, 40);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ecd4cb";
      ctx.stroke();

      ctx.drawImage(qrImg, 210, 305, 480, 480);

      drawRoundedRect(ctx, 385, 480, 130, 130, 24);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#f2ddd6";
      ctx.stroke();

      const logoImg = new window.Image();
      logoImg.crossOrigin = "anonymous";

      logoImg.onload = () => {
        ctx.save();
        drawRoundedRect(ctx, 400, 495, 100, 100, 20);
        ctx.clip();
        ctx.drawImage(logoImg, 400, 495, 100, 100);
        ctx.restore();

        ctx.fillStyle = "#111827";
        ctx.font = "bold 36px Arial";
        ctx.textAlign = "center";
        ctx.fillText(name || "Restaurant", width / 2, 900);

        ctx.fillStyle = "#6b7280";
        ctx.font = "22px Arial";
        ctx.fillText(`/r/${slug || "restaurant"}`, width / 2, 940);

        ctx.fillStyle = BRAND;
        ctx.font = "bold 24px Arial";
        ctx.fillText("Scan to view menu and restaurant page", width / 2, 995);

        const pngUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = `${slug || "restaurant"}-qrcode.png`;
        link.click();

        URL.revokeObjectURL(svgUrl);
      };

      logoImg.onerror = () => {
        const pngUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = `${slug || "restaurant"}-qrcode.png`;
        link.click();

        URL.revokeObjectURL(svgUrl);
      };

      logoImg.src = "/images/logo.jpg";
    };

    qrImg.src = svgUrl;
  };

  const publicUrl =
    slug && typeof window !== "undefined"
      ? `${window.location.origin}/r/${slug}`
      : "";

  const completion = useMemo(() => {
    let score = 0;
    if (name) score += 1;
    if (slug) score += 1;
    if (description) score += 1;
    if (logo) score += 1;
    if (coverImage) score += 1;
    if (phone || whatsapp || website || location) score += 1;
    if (menu.length > 0) score += 1;
    if (gallery.length > 0) score += 1;
    if (offers.length > 0) score += 1;
    return Math.round((score / 9) * 100);
  }, [name, slug, description, logo, coverImage, phone, whatsapp, website, location, menu, gallery, offers]);

  const tabs: { id: TabKey; label: string; emoji: string }[] = [
    { id: "general", label: "General", emoji: "🏢" },
    { id: "branding", label: "Branding", emoji: "🎨" },
    { id: "menu", label: "Menu", emoji: "🍽️" },
    { id: "social", label: "Social", emoji: "🔗" },
    { id: "gallery", label: "Gallery", emoji: "🖼️" },
    { id: "offers", label: "Offers", emoji: "✨" },
  ];

  const inputClass =
    "w-full rounded-2xl border border-[#efd6ce] bg-white px-4 py-3 outline-none transition focus:border-[#f08c6c] focus:ring-2 focus:ring-[#f08c6c]/20";
  const labelClass =
    "mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-500";

 
  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-[#fff8f5] p-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-gray-600">Checking login...</p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-[#fff8f5] text-gray-900">
      <header className="sticky top-0 z-40 border-b border-[#f4d4ca] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-[#f3d8cf] bg-white shadow-sm">
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
              <p className="text-sm font-semibold" style={{ color: BRAND }}>
                ScanDish
              </p>
              <h1 className="text-xl font-bold md:text-2xl">Admin Dashboard</h1>
              <p className="text-xs text-gray-500 md:text-sm">
                Logged in as: {user.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-2xl bg-red-600 px-4 py-2 font-medium text-white shadow-sm"
          >
            Logout
          </button>
        </div>
      </header>

     {/* 🔥 SUBSCRIPTION WARNING */}
{daysRemaining !== null && (
  <div className="mx-auto max-w-7xl px-4 pt-6 md:px-6">
    {/* 5 DAYS WARNING */}
    {daysRemaining > 0 && daysRemaining <= 5 && (
      <div className="mb-4 rounded-3xl border border-orange-200 bg-orange-50 px-5 py-4 text-orange-800">
        <p className="font-bold">⚠️ Subscription ending soon</p>
        <p className="text-sm mt-1">
          Your ScanDish subscription ends in{" "}
          <span className="font-semibold">
            {daysRemaining} day{daysRemaining > 1 ? "s" : ""}
          </span>.
          Contact ScanDish (+250781822350) to renew your plan.
        </p>
      </div>
    )}

    {/* GRACE PERIOD */}
    {daysRemaining <= 0 && daysRemaining >= -10 && (
      <div className="mb-4 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
        <p className="font-bold">⏳ Grace period active</p>
        <p className="text-sm mt-1">
          Your subscription has expired, but your page is still active during
          the 10-day bonus period.
        </p>
      </div>
    )}

    {/* FULLY EXPIRED */}
    {daysRemaining < -10 && (
      <div className="mb-4 rounded-3xl border border-red-300 bg-red-100 px-5 py-4 text-red-900">
        <p className="font-bold">❌ Subscription expired</p>
        <p className="text-sm mt-1">
          Your restaurant page is no longer visible to customers. Contact
          ScanDish to renew.
        </p>
      </div>
    )}
  </div>
)}
     
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[240px_1fr_340px] md:px-6">
        <aside className="space-y-3">
          <div className="rounded-3xl border border-[#f4d4ca] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Setup Progress
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{completion}%</p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#f7e6df]">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${completion}%`, backgroundColor: BRAND }}
              />
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Complete your profile, menu, gallery, and offers before publishing.
            </p>
          </div>

          <nav className="space-y-2 rounded-3xl border border-[#f4d4ca] bg-[#fffaf8] p-3">
           {tabs.map((tab) => (
  <TabButton
    key={tab.id}
    id={tab.id}
    label={tab.label}
    emoji={tab.emoji}
    activeTab={activeTab}
    setActiveTab={setActiveTab}
  />
))}
          </nav>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl px-5 py-3 font-semibold text-white shadow-md disabled:opacity-50"
            style={{ backgroundColor: BRAND }}
          >
            {saving ? "Publishing..." : "Publish Changes"}
          </button>
        </aside>

        <section className="space-y-6">
          {activeTab === "general" && (
            <>
              <SectionCard
                title="Business Details"
                subtitle="Main information customers will see on your public page."
              >
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Company Name</label>
                    <input
                      placeholder="Company Name"
                      className={inputClass}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Slug</label>
                    <div className="flex gap-3">
                      <input
                        placeholder="your-slug"
                        className={`${inputClass} font-mono`}
                        value={slug}
                        onChange={(e) =>
                          setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                        }
                      />
                      <a
                        href={publicUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center rounded-2xl border border-[#efd6ce] bg-white px-4 text-sm font-semibold text-[#f08c6c]"
                      >
                        Open
                      </a>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Short Description</label>
                    <input
                      placeholder="Short Description (slogan)"
                      className={inputClass}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>About Company</label>
                    <textarea
                      placeholder="About Company"
                      className={`${inputClass} min-h-[140px]`}
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Contact Information"
                subtitle="Help customers contact or locate your restaurant quickly."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <input
                      placeholder="Phone Number"
                      className={inputClass}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>WhatsApp Number</label>
                    <input
                      placeholder="WhatsApp Number"
                      className={inputClass}
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Website URL</label>
                    <input
                      placeholder="Website URL"
                      className={inputClass}
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Location</label>
                    <input
                      placeholder="Location"
                      className={inputClass}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {activeTab === "branding" && (
            <>
              <SectionCard
                title="Brand Assets"
                subtitle="Upload your logo and cover image for a stronger public page."
              >
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className={labelClass}>Your Logo</label>
                    <input
                      type="file"
                      accept="image/*"
                      className={inputClass}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        try {
                          setUploadingLogo(true);
                          const uploadedUrl = await uploadImageToCloudinary(file);
                          setLogo(uploadedUrl);
                        } catch (error) {
                          console.error(error);
                          alert("Logo upload failed");
                        } finally {
                          setUploadingLogo(false);
                        }
                      }}
                    />
                    {uploadingLogo && (
                      <p className="text-sm text-gray-500">Uploading logo...</p>
                    )}
                    <div className="flex justify-center rounded-3xl border border-dashed border-[#efd6ce] bg-[#fffdfa] p-6">
                      {logo ? (
                        <img
                          src={logo}
                          alt="Logo preview"
                          className="h-28 w-28 rounded-3xl object-cover border"
                        />
                      ) : (
                        <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-[#fff4ef] text-4xl">
                          🖼️
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className={labelClass}>Cover Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      className={inputClass}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        try {
                          setUploadingCover(true);
                          const uploadedUrl = await uploadImageToCloudinary(file);
                          setCoverImage(uploadedUrl);
                        } catch (error) {
                          console.error(error);
                          alert("Cover upload failed");
                        } finally {
                          setUploadingCover(false);
                        }
                      }}
                    />
                    {uploadingCover && (
                      <p className="text-sm text-gray-500">Uploading cover...</p>
                    )}
                    <div className="overflow-hidden rounded-3xl border border-dashed border-[#efd6ce] bg-[#fffdfa]">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt="Cover preview"
                          className="h-52 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-52 items-center justify-center text-5xl">
                          🌄
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Theme Colors"
                subtitle="Customize the look of your public page."
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-[#efd6ce] bg-[#fffdfa] p-4">
                    <label className={labelClass}>Primary Color</label>
                    <input
                      type="color"
                      className="h-14 w-full rounded-2xl border border-[#efd6ce]"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                    />
                  </div>

                  <div className="rounded-2xl border border-[#efd6ce] bg-[#fffdfa] p-4">
                    <label className={labelClass}>Secondary Color</label>
                    <input
                      type="color"
                      className="h-14 w-full rounded-2xl border border-[#efd6ce]"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                    />
                  </div>

                  <div className="rounded-2xl border border-[#efd6ce] bg-[#fffdfa] p-4">
                    <label className={labelClass}>Background Color</label>
                    <input
                      type="color"
                      className="h-14 w-full rounded-2xl border border-[#efd6ce]"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                    />
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {activeTab === "menu" && (
            <>
              <SectionCard
                title="Add Menu Item"
                subtitle="Build your menu category by category."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Category</label>
                    <input
                      placeholder="Category (e.g. Drinks)"
                      className={inputClass}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Item Name</label>
                    <input
                      placeholder="Item Name"
                      className={inputClass}
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Item Description</label>
                    <input
                      placeholder="Item Description"
                      className={inputClass}
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Price</label>
                    <input
                      placeholder="Price"
                      className={inputClass}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Menu Item Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      className={inputClass}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        try {
                          setUploadingMenuImage(true);
                          const uploadedUrl = await uploadImageToCloudinary(file);
                          setImageUrl(uploadedUrl);
                        } catch (error) {
                          console.error(error);
                          alert("Menu image upload failed");
                        } finally {
                          setUploadingMenuImage(false);
                        }
                      }}
                    />
                    {uploadingMenuImage && (
                      <p className="mt-2 text-sm text-gray-500">Uploading menu image...</p>
                    )}
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt="Menu preview"
                        className="mt-3 h-24 w-24 rounded-2xl border object-cover"
                      />
                    )}
                  </div>
                </div>

                <button
                  onClick={addMenuItem}
                  className="mt-5 rounded-2xl px-5 py-3 font-semibold text-white shadow-md"
                  style={{ backgroundColor: BRAND }}
                >
                  Add Menu Item
                </button>
              </SectionCard>

              <SectionCard
                title="Current Menu"
                subtitle="Preview and manage items already added."
              >
                <div className="space-y-4">
                  {menu.length === 0 && (
                    <p className="text-sm text-gray-500">No menu items yet.</p>
                  )}

                  {menu.map((cat, i) => (
                    <div
                      key={i}
                      className="rounded-3xl border border-[#f0dfd8] bg-[#fffdfa] p-4"
                    >
                      <h3 className="mb-3 text-lg font-bold" style={{ color: BRAND }}>
                        {cat.category}
                      </h3>

                      <div className="space-y-3">
                        {cat.items.map((item: any, j: number) => {
                          const removeKey = `${i}-${j}`;
                          const isConfirming = confirmMenuRemove === removeKey;

                          return (
                            <div
                              key={j}
                              className="flex items-start gap-3 rounded-2xl border border-[#f2e4de] bg-white p-3"
                            >
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="h-16 w-16 rounded-xl object-cover"
                                />
                              )}

                              <div className="flex-1">
                                <p className="font-semibold">{item.name}</p>
                                {item.description && (
                                  <p className="text-sm text-gray-500">{item.description}</p>
                                )}
                                <p className="mt-1 text-sm font-medium">{item.price}</p>
                              </div>

                              {!isConfirming ? (
                                <button
                                  onClick={() => setConfirmMenuRemove(removeKey)}
                                  className="rounded-xl bg-red-500 px-3 py-2 text-sm text-white"
                                >
                                  Remove
                                </button>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => removeMenuItem(i, j)}
                                    className="rounded-xl bg-red-700 px-3 py-2 text-sm text-white"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setConfirmMenuRemove(null)}
                                    className="rounded-xl border px-3 py-2 text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </>
          )}

          {activeTab === "social" && (
            <>
              <SectionCard
                title="Social & Online Presence"
                subtitle="Add the links customers will use to connect with you."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Instagram URL</label>
                    <input
                      placeholder="Instagram URL"
                      className={inputClass}
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Facebook URL</label>
                    <input
                      placeholder="Facebook URL"
                      className={inputClass}
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>TikTok URL</label>
                    <input
                      placeholder="TikTok URL"
                      className={inputClass}
                      value={tiktok}
                      onChange={(e) => setTiktok(e.target.value)}
                    />
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {activeTab === "gallery" && (
            <>
              <SectionCard
                title="Gallery"
                subtitle="Upload and manage restaurant gallery images."
              >
                <div className="space-y-4">
                  <input
                    type="file"
                    accept="image/*"
                    className={inputClass}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      try {
                        setUploadingGallery(true);
                        const uploadedUrl = await uploadImageToCloudinary(file);
                        setGallery([...gallery, uploadedUrl]);
                      } catch (error) {
                        console.error(error);
                        alert("Gallery upload failed");
                      } finally {
                        setUploadingGallery(false);
                      }
                    }}
                  />

                  {uploadingGallery && (
                    <p className="text-sm text-gray-500">Uploading gallery image...</p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    {gallery.length === 0 && (
                      <p className="text-sm text-gray-500">No gallery images yet.</p>
                    )}

                    {gallery.map((img, index) => {
                      const isConfirming = confirmGalleryRemove === index;

                      return (
                        <div
                          key={index}
                          className="flex items-center gap-3 rounded-2xl border border-[#f2e4de] bg-[#fffdfa] p-3"
                        >
                          <img
                            src={img}
                            alt={`Gallery ${index + 1}`}
                            className="h-16 w-16 rounded-xl object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="break-all text-sm text-gray-600">{img}</p>
                          </div>

                          {!isConfirming ? (
                            <button
                              onClick={() => setConfirmGalleryRemove(index)}
                              className="rounded-xl bg-red-500 px-3 py-2 text-sm text-white"
                            >
                              Remove
                            </button>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => removeGalleryImage(index)}
                                className="rounded-xl bg-red-700 px-3 py-2 text-sm text-white"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmGalleryRemove(null)}
                                className="rounded-xl border px-3 py-2 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {activeTab === "offers" && (
            <>
              <SectionCard
                title="Offers & Perks"
                subtitle="Show customers extra things they can enjoy at your place."
              >
                <div className="flex flex-col gap-3 md:flex-row">
                  <input
                    placeholder="Add offer (e.g. Free Wi-Fi, 10% Discount, Happy Hour)"
                    className={inputClass}
                    value={offerInput}
                    onChange={(e) => setOfferInput(e.target.value)}
                  />

                  <button
                    onClick={addOffer}
                    className="rounded-2xl px-5 py-3 font-semibold text-white shadow-md"
                    style={{ backgroundColor: BRAND }}
                  >
                    Add Offer
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {offers.length === 0 && (
                    <p className="text-sm text-gray-500">No offers added yet.</p>
                  )}

                  {offers.map((offer, index) => {
                    const isConfirming = confirmOfferRemove === index;

                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-2xl border border-[#f2e4de] bg-[#fffdfa] p-4"
                      >
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                          style={{ backgroundColor: `${BRAND}20` }}
                        >
                          ✨
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800">{offer}</p>
                        </div>

                        {!isConfirming ? (
                          <button
                            onClick={() => setConfirmOfferRemove(index)}
                            className="rounded-xl bg-red-500 px-3 py-2 text-sm text-white"
                          >
                            Remove
                          </button>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => removeOffer(index)}
                              className="rounded-xl bg-red-700 px-3 py-2 text-sm text-white"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmOfferRemove(null)}
                              className="rounded-xl border px-3 py-2 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            </>
          )}
        </section>

        <aside className="space-y-6">
          <div className="sticky top-24 space-y-6">
            <section className="rounded-3xl border border-[#f4d4ca] bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-bold" style={{ color: BRAND }}>
                Public Preview
              </h2>

              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  <span className="font-semibold text-gray-900">Name:</span>{" "}
                  {name || "Not set"}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Slug:</span>{" "}
                  {slug || "Not set"}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Menu groups:</span>{" "}
                  {menu.length}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Gallery images:</span>{" "}
                  {gallery.length}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Offers:</span>{" "}
                  {offers.length}
                </p>
              </div>
            </section>

            {slug && publicUrl && (
              <section className="rounded-3xl border border-[#f4d4ca] bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-xl font-bold" style={{ color: BRAND }}>
                  Your Smart QR
                </h2>

                <div className="rounded-[28px] border border-[#efd6ce] bg-gradient-to-b from-[#fff8f5] to-white p-5 shadow-sm">
                  <div className="mb-4 text-center">
                    <p className="text-sm font-semibold" style={{ color: BRAND }}>
                      ScanDish
                    </p>
                    <p className="text-sm text-gray-500">Smart QR Scan Experience</p>
                  </div>

                  <div className="flex justify-center">
                    <div className="relative rounded-[28px] border border-[#f1ddd6] bg-white p-5 shadow-sm">
                      <QRCodeSVG
                        id="restaurant-qr"
                        value={publicUrl}
                        size={220}
                        level="H"
                        fgColor={QR_DARK}
                        bgColor="#ffffff"
                        includeMargin
                      />

                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-[#f2ddd6] bg-white p-1 shadow-sm">
                          <Image
                            src="/images/logo.jpg"
                            alt="ScanDish logo"
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-lg font-semibold text-gray-900">
                      {name || "Restaurant"}
                    </p>
                    <p className="mt-1 break-all text-sm text-gray-500">{publicUrl}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <button
                    onClick={downloadQRCodePNG}
                    className="w-full rounded-2xl px-5 py-3 font-semibold text-white shadow-md"
                    style={{ backgroundColor: BRAND }}
                  >
                    Download QR as PNG
                  </button>

                  <button
                    onClick={downloadQRCodeSVG}
                    className="w-full rounded-2xl border border-[#efd6ce] bg-white px-5 py-3 font-semibold text-gray-700"
                  >
                    Download QR as SVG
                  </button>
                </div>
              </section>
            )}

            <section className="rounded-3xl bg-[#111827] p-6 text-white shadow-lg">
              <h3 className="text-lg font-bold">Ready to Publish</h3>
              <p className="mt-2 text-sm text-white/70">
                Once you save, your public page updates with the latest menu, offers,
                gallery, and branding.
              </p>

              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-5 w-full rounded-2xl px-5 py-3 font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: BRAND }}
              >
                {saving ? "Publishing..." : "Publish on Public"}
              </button>
            </section>
          </div>
        </aside>
      </div>

      <footer className="border-t border-[#f4d4ca] bg-white px-4 py-6 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-sm text-gray-500 md:flex-row">
          <p>ScanDish Systems © 2026</p>
          <p>Smart QR Restaurant Experience</p>
        </div>
      </footer>
    </main>
  );
}