"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

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

    if (
      uploadingLogo ||
      uploadingCover ||
      uploadingMenuImage ||
      uploadingGallery
    ) {
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

      await setDoc(doc(db, "restaurants", user.uid), {
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
      });

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

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-[#fff8f5] p-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-600">Checking login...</p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-[#fff8f5] text-gray-900">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-3xl shadow-sm border border-[#f4d4ca] p-5 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 overflow-hidden rounded-2xl border border-[#f3d8cf] bg-white shadow-sm">
              <Image
                src="/images/logo.jpg"
                alt="ScanDish logo"
                fill
                className="object-cover"
                sizes="56px"
                priority
              />
            </div>

            <div>
              <p className="text-sm font-semibold" style={{ color: BRAND }}>
                ScanDish
              </p>
              <h1 className="text-2xl md:text-3xl font-bold">
                ADMIN Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Logged in as: {user.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="text-white px-4 py-2 rounded-2xl font-medium shadow-sm"
            style={{ backgroundColor: "#dc2626" }}
          >
            Logout
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-3xl shadow-sm border border-[#f4d4ca] p-5">
            <p className="text-sm text-gray-500 mb-1">Restaurant ID</p>
            <p className="font-semibold break-all">{user.uid}</p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-[#f4d4ca] p-5">
            <p className="text-sm text-gray-500 mb-1">Public Page</p>
            <p className="font-semibold break-all">
              {slug ? `/r/${slug}` : "Set your slug first"}
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-[#f4d4ca] p-5">
            <p className="text-sm text-gray-500 mb-1">Status</p>
            <p className="font-semibold">
              {slug && name ? "Ready to publish" : "Complete your profile"}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-3xl shadow-sm border border-[#f4d4ca] p-5">
              <h2 className="text-xl font-bold mb-4" style={{ color: BRAND }}>
                Basic Information
              </h2>

              <div className="space-y-3">
                <input
                  placeholder="Company Name"
                  className="border border-[#efd6ce] rounded-2xl p-3 w-full outline-none focus:ring-2"
                  style={{ focusRingColor: BRAND } as any}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <input
                  placeholder="Your Slug (e.g. kigali-grill)"
                  className="border border-[#efd6ce] rounded-2xl p-3 w-full outline-none"
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                  }
                />

                <input
                  placeholder="Short Description (slogon)"
                  className="border border-[#efd6ce] rounded-2xl p-3 w-full outline-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                <textarea
                  placeholder="About Company"
                  className="border border-[#efd6ce] rounded-2xl p-3 w-full min-h-32 outline-none"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                />
              </div>
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-[#f4d4ca] p-5">
              <h2 className="text-xl font-bold mb-4" style={{ color: BRAND }}>
                Branding
              </h2>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Your Logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="border border-[#efd6ce] rounded-2xl p-3 w-full"
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
                  {logo && (
                    <img
                      src={logo}
                      alt="Logo preview"
                      className="w-20 h-20 rounded-2xl object-cover border"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Cover Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="border border-[#efd6ce] rounded-2xl p-3 w-full"
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
                  {coverImage && (
                    <img
                      src={coverImage}
                      alt="Cover preview"
                      className="w-full h-40 rounded-2xl object-cover border"
                    />
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-5">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Primary Color
                  </label>
                  <input
                    type="color"
                    className="w-full h-12 rounded-2xl border border-[#efd6ce]"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Secondary Color
                  </label>
                  <input
                    type="color"
                    className="w-full h-12 rounded-2xl border border-[#efd6ce]"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Background Color
                  </label>
                  <input
                    type="color"
                    className="w-full h-12 rounded-2xl border border-[#efd6ce]"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-[#f4d4ca] p-5">
              <h2 className="text-xl font-bold mb-4" style={{ color: BRAND }}>
                Contact & Social
              </h2>

              <div className="grid md:grid-cols-2 gap-3">
                <input
                  placeholder="Phone Number"
                  className="border border-[#efd6ce] rounded-2xl p-3 w-full"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <input
                  placeholder="WhatsApp Number"
                  className="border border-[#efd6ce] rounded-2xl p-3 w-full"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />

                <input
                  placeholder="Website URL"
                  className="border border-[#efd6ce] rounded-2xl p-3 w-full"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />

                <input
                  placeholder="Location"
                  className="border border-[#efd6ce] rounded-2xl p-3 w-full"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />

                <input
                  placeholder="Instagram URL"
                  className="border border-[#efd6ce] rounded-2xl p-3 w-full"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />

                <input
                  placeholder="Facebook URL"
                  className="border border-[#efd6ce] rounded-2xl p-3 w-full"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                />

                <input
                  placeholder="TikTok URL"
                  className="border border-[#efd6ce] rounded-2xl p-3 w-full md:col-span-2"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                />
              </div>
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-[#f4d4ca] p-5">
              <h2 className="text-xl font-bold mb-4" style={{ color: BRAND }}>
                Offers & Perks
              </h2>

              <div className="flex flex-col md:flex-row gap-3">
                <input
                  placeholder="Add offer (e.g. Free Wi-Fi, 10% Discount, Happy Hour)"
                  className="border border-[#efd6ce] rounded-2xl p-3 w-full"
                  value={offerInput}
                  onChange={(e) => setOfferInput(e.target.value)}
                />

                <button
                  onClick={addOffer}
                  className="text-white px-5 py-3 rounded-2xl font-medium shadow-sm"
                  style={{ backgroundColor: BRAND }}
                >
                  Add Offer
                </button>
              </div>

              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                {offers.map((offer, index) => {
                  const isConfirming = confirmOfferRemove === index;

                  return (
                    <div
                      key={index}
                      className="border border-[#f2e4de] rounded-2xl p-4 flex items-center gap-3 bg-[#fffdfa]"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
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
                          className="text-white px-3 py-2 rounded-xl text-sm"
                          style={{ backgroundColor: "#ef4444" }}
                        >
                          Remove
                        </button>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => removeOffer(index)}
                            className="text-white px-3 py-2 rounded-xl text-sm"
                            style={{ backgroundColor: "#b91c1c" }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmOfferRemove(null)}
                            className="px-3 py-2 rounded-xl text-sm border"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-[#f4d4ca] p-5">
              <h2 className="text-xl font-bold mb-4" style={{ color: BRAND }}>
                Menu Builder
              </h2>

              <div className="grid md:grid-cols-2 gap-3">
                <input
                  placeholder="Category (e.g. Drinks)"
                  className="border border-[#efd6ce] rounded-2xl p-3 w-full"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />

                <input
                  placeholder="Item Name"
                  className="border border-[#efd6ce] rounded-2xl p-3 w-full"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />

                <input
                  placeholder="Item Description"
                  className="border border-[#efd6ce] rounded-2xl p-3 w-full md:col-span-2"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                />

                <input
                  placeholder="Price"
                  className="border border-[#efd6ce] rounded-2xl p-3 w-full"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium">Menu Item Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="border border-[#efd6ce] rounded-2xl p-3 w-full"
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
                    <p className="text-sm text-gray-500">Uploading menu image...</p>
                  )}
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="Menu preview"
                      className="w-24 h-24 rounded-2xl object-cover border"
                    />
                  )}
                </div>
              </div>

              <button
                onClick={addMenuItem}
                className="mt-4 text-white px-5 py-3 rounded-2xl font-medium shadow-sm"
                style={{ backgroundColor: BRAND }}
              >
                Add Menu Item
              </button>

              <div className="mt-6 space-y-4">
                {menu.map((cat, i) => (
                  <div
                    key={i}
                    className="border border-[#f0dfd8] rounded-3xl p-4 bg-[#fffdfa]"
                  >
                    <h3 className="font-bold text-lg mb-3" style={{ color: BRAND }}>
                      {cat.category}
                    </h3>

                    <div className="space-y-3">
                      {cat.items.map((item: any, j: number) => {
                        const removeKey = `${i}-${j}`;
                        const isConfirming = confirmMenuRemove === removeKey;

                        return (
                          <div
                            key={j}
                            className="flex gap-3 items-start border border-[#f2e4de] rounded-2xl p-3 bg-white"
                          >
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-14 h-14 object-cover rounded-xl"
                              />
                            )}

                            <div className="flex-1">
                              <p className="font-semibold">{item.name}</p>
                              {item.description && (
                                <p className="text-sm text-gray-500">
                                  {item.description}
                                </p>
                              )}
                              <p className="text-sm font-medium mt-1">
                                {item.price}
                              </p>
                            </div>

                            {!isConfirming ? (
                              <button
                                onClick={() => setConfirmMenuRemove(removeKey)}
                                className="text-white px-3 py-2 rounded-xl text-sm"
                                style={{ backgroundColor: "#ef4444" }}
                              >
                                Remove
                              </button>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => removeMenuItem(i, j)}
                                  className="text-white px-3 py-2 rounded-xl text-sm"
                                  style={{ backgroundColor: "#b91c1c" }}
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setConfirmMenuRemove(null)}
                                  className="px-3 py-2 rounded-xl text-sm border"
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
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-[#f4d4ca] p-5">
              <h2 className="text-xl font-bold mb-4" style={{ color: BRAND }}>
                Gallery
              </h2>

              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  className="border border-[#efd6ce] rounded-2xl p-3 w-full"
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
              </div>

              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                {gallery.map((img, index) => {
                  const isConfirming = confirmGalleryRemove === index;

                  return (
                    <div
                      key={index}
                      className="border border-[#f2e4de] rounded-2xl p-3 flex items-center gap-3 bg-[#fffdfa]"
                    >
                      <img
                        src={img}
                        alt={`Gallery ${index + 1}`}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-600 break-all">{img}</p>
                      </div>

                      {!isConfirming ? (
                        <button
                          onClick={() => setConfirmGalleryRemove(index)}
                          className="text-white px-3 py-2 rounded-xl text-sm"
                          style={{ backgroundColor: "#ef4444" }}
                        >
                          Remove
                        </button>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => removeGalleryImage(index)}
                            className="text-white px-3 py-2 rounded-xl text-sm"
                            style={{ backgroundColor: "#b91c1c" }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmGalleryRemove(null)}
                            className="px-3 py-2 rounded-xl text-sm border"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-white rounded-3xl shadow-sm border border-[#f4d4ca] p-5">
              <h2 className="text-xl font-bold mb-4" style={{ color: BRAND }}>
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
              <section className="bg-white rounded-3xl shadow-sm border border-[#f4d4ca] p-5">
                <h2 className="text-xl font-bold mb-4" style={{ color: BRAND }}>
                  Branded QR Code
                </h2>

                <div className="rounded-[28px] border border-[#efd6ce] bg-gradient-to-b from-[#fff8f5] to-white p-5 shadow-sm">
                  <div className="text-center mb-4">
                    <p className="text-sm font-semibold" style={{ color: BRAND }}>
                      ScanDish
                    </p>
                    <p className="text-sm text-gray-500">
                      Smart QR Scan Experience
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <div className="relative bg-white rounded-[28px] p-5 border border-[#f1ddd6] shadow-sm">
                      <QRCodeSVG
                        id="restaurant-qr"
                        value={publicUrl}
                        size={220}
                        level="H"
                        fgColor={QR_DARK}
                        bgColor="#ffffff"
                        includeMargin
                      />

                      <div className="absolute inset-0 flex items-center justify-center pointerEvents-none">
                        <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-white border border-[#f2ddd6] shadow-sm p-1">
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
                    <p className="font-semibold text-lg text-gray-900">
                      {name || "Restaurant"}
                    </p>
                    <p className="text-sm text-gray-500 break-all mt-1">
                      {publicUrl}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mt-4">
                  <button
                    onClick={downloadQRCodePNG}
                    className="w-full text-white px-5 py-3 rounded-2xl font-medium shadow-sm"
                    style={{ backgroundColor: BRAND }}
                  >
                    Download QR as PNG
                  </button>

                  <button
                    onClick={downloadQRCodeSVG}
                    className="w-full px-5 py-3 rounded-2xl font-medium border border-[#efd6ce] bg-white text-gray-700"
                  >
                    Download QR as SVG
                  </button>
                </div>
              </section>
            )}

            <section className="bg-white rounded-3xl shadow-sm border border-[#f4d4ca] p-5">
              <h2 className="text-xl font-bold mb-4" style={{ color: BRAND }}>
                Save Changes
              </h2>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full text-white px-5 py-3 rounded-2xl font-medium disabled:opacity-50 shadow-sm"
                style={{ backgroundColor: BRAND }}
              >
                {saving ? "Saving..." : "Publish on Public"}
              </button>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}