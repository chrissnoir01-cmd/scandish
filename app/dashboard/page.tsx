"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, getIdToken, uploadFile } from "../../lib/firebase";
import { loadAnalytics, loadDashboard, saveDashboard } from "../actions/restaurant";
import { GRACE_DAYS } from "../../lib/subscription";
import type { Analytics, MenuCategory, MenuItem, Offer } from "../../lib/types";
import { InsightsPanel, ViewsCard } from "@/components/dashboard/Insights";
import {
  onAuthStateChanged,
  signOut,
  User,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendEmailVerification,
} from "firebase/auth";
import { FaWhatsapp, FaInstagram, FaFacebook, FaTiktok } from "react-icons/fa";
import {
  Phone,
  Wifi,
  Truck,
  Car,
  Coffee,
  Tag,
  CheckCircle2,
  Edit3,
  Trash2,
  Lock,
  Plus,
  Settings,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ExternalLink,
  X,
  Star,
  Image as ImageIcon,
  UploadCloud,
  LogOut,
  Mail,
  Smartphone,
  Search,
  MapPin,
  Clock,
  CircleCheck,
  Globe,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

// --- CONSTANTS ---
const BRAND = "#f08c6c";
const QR_DARK = "#7a4636";

type TabKey =
  | "insights"
  | "general"
  | "branding"
  | "menu"
  | "gallery"
  | "offers"
  | "account";

const SUPPORT_WHATSAPP = "https://wa.me/250781822350";

// --- REUSABLE UI COMPONENTS ---

const Toast = ({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) => (
  <div className="fixed bottom-24 left-1/2 z-[100] flex -translate-x-1/2 animate-in slide-in-from-bottom-10">
    <div
      className={`flex items-center gap-3 rounded-2xl px-6 py-4 shadow-2xl ${
        type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
      }`}
    >
      {type === "success" ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
      <span className="font-semibold">{message}</span>
      <button onClick={onClose} className="ml-4 opacity-70 hover:opacity-100">
        <X size={18} />
      </button>
    </div>
  </div>
);

const Modal = ({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
    <div className="w-full max-w-lg animate-in zoom-in-95 rounded-[2.5rem] bg-white p-8 shadow-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
          <X size={24} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const SectionCard = ({
  title,
  subtitle,
  children,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) => (
  <section className="overflow-hidden rounded-3xl border border-[#f4d4ca] bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-[#f4d4ca] bg-[#fffdfa] px-6 py-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          {Icon && <Icon size={20} className="text-[#f08c6c]" />}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
    <div className="p-6">{children}</div>
  </section>
);

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
      className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-bold transition-all ${
        isActive
          ? "bg-[#f08c6c] text-white shadow-lg shadow-[#f08c6c]/20"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
      {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />}
    </button>
  );
}

// --- MAIN DASHBOARD PAGE ---

export default function DashboardPage() {
  const router = useRouter();

  // AUTH & LOADING STATE
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  // RESTAURANT CORE DATA
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

  // SOCIALS (INTEGRATED INTO GENERAL)
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tiktok, setTiktok] = useState("");

  // THEME
  const [primaryColor, setPrimaryColor] = useState(BRAND);
  const [secondaryColor, setSecondaryColor] = useState("#111827");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");

  // MENU SYSTEM STATE
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  
  // Menu Form State
  const [mName, setMName] = useState("");
  const [mPrice, setMPrice] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mCat, setMCat] = useState("");
  const [mImg, setMImg] = useState("");
  const [mAvailable, setMAvailable] = useState(true);
  const [mFeatured, setMFeatured] = useState(false);

  // CATEGORY MANAGER
  const [showCatManager, setShowCatManager] = useState(false);
  const [catToRename, setCatToRename] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");

  // GALLERY & OFFERS
  const [gallery, setGallery] = useState<string[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerInput, setOfferInput] = useState("");

  // SECURITY & SUBSCRIPTION
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confPass, setConfPass] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [plan, setPlan] = useState("standard");

  // LOAD / DIRTY STATE
  const [loadState, setLoadState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [dirty, setDirty] = useState(false);
  const loaded = useRef(false);

  // UPLOAD STATES
  const [uploading, setUploading] = useState<string | null>(null);

  // VIEWS
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const refreshAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await loadAnalytics(await getIdToken());
      if (res.ok) setAnalytics(res.data);
    } catch {
      // Views are a nice-to-have; the dashboard keeps working without them.
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // --- HELPERS ---

  const triggerToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /** Uploads with a spinner key; always clears the spinner and reports failures. */
  const runUpload = async (key: string, file: File): Promise<string | null> => {
    setUploading(key);
    try {
      return await uploadFile(file);
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : "Upload failed", "error");
      return null;
    } finally {
      setUploading(null);
    }
  };

  // --- INITIALIZATION ---

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) router.push("/login");
      else setUser(currentUser);
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const res = await loadDashboard(await user.getIdToken());
      if (!res.ok) {
        setLoadState("error");
        triggerToast(res.error, "error");
        return;
      }
      const data = res.data;
      if (!data) {
        setLoadState("missing");
        return;
      }
      setName(data.name);
      setSlug(data.slug);
      setDescription(data.description);
      setAbout(data.about);
      setLogo(data.logo);
      setCoverImage(data.coverImage);
      setPhone(data.phone);
      setWhatsapp(data.whatsapp);
      setWebsite(data.website);
      setLocation(data.location);
      setInstagram(data.social.instagram);
      setFacebook(data.social.facebook);
      setTiktok(data.social.tiktok);
      setPrimaryColor(data.theme.primaryColor);
      setSecondaryColor(data.theme.secondaryColor);
      setBackgroundColor(data.theme.backgroundColor);
      setMenu(data.menu);
      setGallery(data.gallery);
      setOffers(data.offers);
      setPlan(data.plan);
      setDaysRemaining(data.subscription?.daysRemaining ?? null);
      setLoadState("ready");

      const views = await loadAnalytics(await user.getIdToken()).catch(() => null);
      if (views?.ok) setAnalytics(views.data);
      setAnalyticsLoading(false);
    };
    loadData();
  }, [user]);

  // Any edit after the initial load marks the page as unpublished.
  useEffect(() => {
    if (loadState !== "ready") return;
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    setDirty(true);
  }, [
    loadState, name, description, about, logo, coverImage, phone, whatsapp, website, location,
    instagram, facebook, tiktok, primaryColor, secondaryColor, backgroundColor, menu, gallery, offers,
  ]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // --- MENU LOGIC ---

  const existingCategories = useMemo(() => {
    return Array.from(new Set(menu.map((m) => m.category))).sort();
  }, [menu]);

  const filteredMenu = useMemo(() => {
    if (!searchQuery) return menu;
    const query = searchQuery.toLowerCase();
    return menu
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query)
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [menu, searchQuery]);

  const resetMenuForm = () => {
    setEditingItemId(null);
    setMName(""); setMPrice(""); setMDesc(""); setMCat(""); setMImg("");
    setMAvailable(true); setMFeatured(false);
  };

  const handleEditItem = (item: MenuItem, category: string) => {
    setEditingItemId(item.id);
    setMName(item.name);
    setMPrice(item.price);
    setMDesc(item.description);
    setMCat(category);
    setMImg(item.image);
    setMAvailable(item.available);
    setMFeatured(item.featured);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveMenuItem = () => {
    if (!mName.trim() || !mPrice.trim() || !mCat.trim()) {
      triggerToast("Name, Price and Category are required", "error");
      return;
    }

    const item: MenuItem = {
      id: editingItemId || crypto.randomUUID(),
      name: mName.trim(),
      price: mPrice.trim(),
      description: mDesc.trim(),
      image: mImg,
      available: mAvailable,
      featured: mFeatured,
    };

    const updatedMenu = menu.map((cat) => ({
      ...cat,
      items: cat.items.filter((i) => i.id !== item.id),
    })).filter(cat => cat.items.length > 0);

    const catIdx = updatedMenu.findIndex((c) => c.category === mCat.trim());
    if (catIdx > -1) {
      updatedMenu[catIdx].items.push(item);
    } else {
      updatedMenu.push({ category: mCat.trim(), items: [item] });
    }

    setMenu(updatedMenu);
    resetMenuForm();
    triggerToast(editingItemId ? "Product updated" : "Product added");
  };

  const confirmDeleteItem = () => {
    if (!itemToDelete) return;
    const updated = menu
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((i) => i.id !== itemToDelete.id),
      }))
      .filter((cat) => cat.items.length > 0);
    setMenu(updated);
    setItemToDelete(null);
    triggerToast("Product removed");
  };

  const handleRenameCategory = () => {
    const target = newCatName.trim();
    if (!catToRename || !target) return;
    if (target === catToRename) {
      setCatToRename(null);
      return;
    }
    // Renaming onto an existing category merges the two instead of duplicating it.
    const moving = menu.find((c) => c.category === catToRename)?.items ?? [];
    const updated = menu
      .filter((c) => c.category !== catToRename)
      .map((c) => (c.category === target ? { ...c, items: [...c.items, ...moving] } : c));
    if (!updated.some((c) => c.category === target)) {
      updated.push({ category: target, items: moving });
    }
    setMenu(updated);
    setCatToRename(null);
    triggerToast("Category renamed");
  };

  const handleDeleteCategory = (catName: string) => {
    if (confirm(`Delete category "${catName}" and all its items?`)) {
      setMenu(menu.filter((c) => c.category !== catName));
      triggerToast("Category deleted");
    }
  };

  // --- GALLERY & OFFERS LOGIC ---

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading("gallery");
    // Keep whatever succeeded even if some files fail.
    const results = await Promise.allSettled(Array.from(files).map((file) => uploadFile(file)));
    const urls = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    const failed = results.length - urls.length;
    setGallery((prev) => [...prev, ...urls]);
    setUploading(null);
    e.target.value = "";
    if (failed) triggerToast(`${failed} of ${results.length} uploads failed`, "error");
    else triggerToast(`${urls.length} images added to gallery`);
  };

  const suggestIcon = (t: string) => {
    const s = t.toLowerCase();
    if (s.includes("wifi")) return "wifi";
    if (s.includes("parking")) return "car";
    if (s.includes("delivery")) return "truck";
    if (s.includes("music")) return "music";
    if (s.includes("coffee")) return "coffee";
    return "tag";
  };

  const addOffer = () => {
    if (!offerInput.trim()) return;
    setOffers([...offers, { text: offerInput.trim(), icon: suggestIcon(offerInput) }]);
    setOfferInput("");
  };

  // --- SECURITY & ACCOUNT ---

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confPass) return triggerToast("Passwords do not match", "error");
    if (newPass.length < 8) return triggerToast("Password must be at least 8 characters", "error");
    
    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user!.email!, curPass);
      await reauthenticateWithCredential(user!, credential);
      await updatePassword(user!, newPass);
      triggerToast("Password updated successfully");
      setCurPass(""); setNewPass(""); setConfPass("");
    } catch (err) {
      const code = (err as { code?: string }).code;
      triggerToast(
        code === "auth/wrong-password" || code === "auth/invalid-credential"
          ? "Current password is incorrect"
          : "Password update failed",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const verifyEmail = async () => {
    if (!user || verifying) return;
    setVerifying(true);
    try {
      await sendEmailVerification(user);
      triggerToast("Verification link sent to your email");
    } catch {
      triggerToast("Could not send the email. Try again in a few minutes.", "error");
    } finally {
      setTimeout(() => setVerifying(false), 5000);
    }
  };

  // --- SAVE & PUBLISH ---

  const handleSave = async () => {
    if (!user || loadState !== "ready") return;
    if (!name.trim()) return triggerToast("Business name is required", "error");
    setSaving(true);
    try {
      const res = await saveDashboard(await getIdToken(), {
        name, description, about, logo, coverImage, phone, whatsapp, website, location,
        social: { instagram, facebook, tiktok },
        theme: { primaryColor, secondaryColor, backgroundColor },
        menu, gallery, offers,
      });
      if (!res.ok) return triggerToast(res.error, "error");
      setDirty(false);
      triggerToast("Changes published live!");
    } catch {
      triggerToast("Save failed. Check your connection and try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  // --- QR DOWNLOADS (PRESERVED FROM ORIGINAL LOGIC) ---
  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const downloadQR = async (format: 'svg' | 'png') => {
    const svg = document.getElementById("restaurant-qr");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);

    if (format === 'svg') {
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slug}-qrcode.svg`;
      link.click();
    } else {
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const qrImg = new window.Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.onload = () => {
        const canvas = document.createElement("canvas");
        const w = 900, h = 1120;
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#fff8f5"; ctx.fillRect(0, 0, w, h);
        drawRoundedRect(ctx, 70, 70, 760, 980, 36);
        ctx.fillStyle = "#ffffff"; ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = "#f4d4ca"; ctx.stroke();
        drawRoundedRect(ctx, 120, 120, 660, 110, 28);
        ctx.fillStyle = BRAND; ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 34px Arial"; ctx.textAlign = "center";
        ctx.fillText("ScanDish", w / 2, 170);
        ctx.font = "20px Arial"; ctx.fillText("Smart QR Restaurant Experience", w / 2, 205);
        drawRoundedRect(ctx, 175, 270, 550, 550, 40);
        ctx.fillStyle = "#ffffff"; ctx.fill();
        ctx.drawImage(qrImg, 210, 305, 480, 480);
        ctx.fillStyle = "#111827"; ctx.font = "bold 36px Arial";
        ctx.fillText(name || "Restaurant", w / 2, 900);
        ctx.fillStyle = "#6b7280"; ctx.font = "22px Arial";
        ctx.fillText(`/r/${slug}`, w / 2, 940);
        ctx.fillStyle = BRAND; ctx.font = "bold 24px Arial";
        ctx.fillText("Scan to view menu", w / 2, 995);
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `${slug}-qrcode.png`;
        link.click();
      };
      qrImg.src = svgUrl;
    }
  };

  const publicUrl = slug ? `${window.location.origin}/r/${slug}` : "";
  const completion = useMemo(() => {
    let score = 0;
    if (name) score += 1;
    if (slug) score += 1;
    if (description) score += 1;
    if (logo) score += 1;
    if (coverImage) score += 1;
    if (phone || whatsapp) score += 1;
    if (menu.length > 0) score += 1;
    if (gallery.length > 0) score += 1;
    if (offers.length > 0) score += 1;
    return Math.round((score / 9) * 100);
  }, [name, slug, description, logo, coverImage, phone, whatsapp, menu, gallery, offers]);

  if (checkingAuth || loadState === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fff8f5]">
        <Loader2 className="animate-spin text-[#f08c6c]" size={40} />
      </div>
    );
  }

  if (loadState !== "ready") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8f5] px-6">
        <div className="max-w-md rounded-3xl border border-[#f4d4ca] bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-4 text-[#f08c6c]" size={36} />
          <h1 className="text-xl font-black">
            {loadState === "missing" ? "No restaurant linked to this account" : "Could not load your dashboard"}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {loadState === "missing"
              ? "Sign up with the invite code from ScanDish, or contact support."
              : "Check your connection and refresh the page."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <a href={SUPPORT_WHATSAPP} target="_blank" rel="noreferrer" className="rounded-2xl bg-[#f08c6c] px-5 py-3 text-sm font-bold text-white">
              Contact support
            </a>
            <button onClick={() => signOut(auth)} className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-500">
              Logout
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8f5] pb-20 text-gray-900">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <header className="sticky top-0 z-40 border-b border-[#f4d4ca] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-[#f3d8cf] bg-white shadow-sm">
              <Image src="/images/logo.jpg" alt="ScanDish" fill className="object-cover" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#f08c6c]">ScanDish</p>
              <h1 className="text-xl font-black tracking-tight md:text-2xl">Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {dirty && (
              <span className="hidden text-xs font-bold text-orange-500 sm:inline">Unpublished changes</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || uploading !== null}
              className="flex items-center gap-2 rounded-2xl bg-[#f08c6c] px-6 py-2.5 font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              Publish Changes
            </button>
          </div>
        </div>
      </header>

      {/* SUBSCRIPTION WARNINGS */}
      {daysRemaining !== null && (
        <div className="mx-auto mt-6 max-w-7xl px-4 md:px-6">
          {daysRemaining <= 5 && daysRemaining > 0 && (
            <div className="flex items-center gap-4 rounded-3xl border border-orange-200 bg-orange-50 p-5 text-orange-800">
              <AlertTriangle className="shrink-0" />
              <div>
                <p className="font-bold">Subscription ending soon</p>
                <p className="text-sm">Ends in {daysRemaining} day{daysRemaining > 1 ? "s" : ""}. Contact support to renew your plan.</p>
              </div>
            </div>
          )}
          {daysRemaining <= 0 && (
            <div className="flex items-center gap-4 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
              <AlertTriangle className="shrink-0" />
              <div>
                <p className="font-bold">Subscription expired</p>
                <p className="text-sm">
                  {daysRemaining >= -GRACE_DAYS
                    ? `Your public page goes offline in ${GRACE_DAYS + daysRemaining + 1} day(s). Renew to keep it online.`
                    : "Your restaurant page is hidden. Renew to make it public again."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_1fr_340px]">
        {/* SIDEBAR NAVIGATION */}
        <aside className="space-y-4">
          <div className="rounded-[2.5rem] border border-[#f4d4ca] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
               <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Setup Progress</span>
               <span className="text-xs font-bold text-[#f08c6c]">{completion}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
               <div className="h-full bg-[#f08c6c] transition-all duration-500" style={{ width: `${completion}%` }} />
            </div>
          </div>

          <ViewsCard analytics={analytics} loading={analyticsLoading} onOpen={() => setActiveTab("insights")} />

          <nav className="flex flex-col gap-1 rounded-[2.5rem] border border-[#f4d4ca] bg-white p-3 shadow-sm">
            <TabButton id="insights" label="Insights" emoji="📊" activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="general" label="General" emoji="🏢" activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="branding" label="Branding" emoji="🎨" activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="menu" label="Menu" emoji="🍽️" activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="gallery" label="Gallery" emoji="🖼️" activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="offers" label="Offers" emoji="✨" activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="account" label="Security" emoji="🔐" activeTab={activeTab} setActiveTab={setActiveTab} />
          </nav>
          
          <button onClick={() => signOut(auth)} className="flex w-full items-center justify-center gap-2 rounded-3xl border border-red-50 py-4 font-bold text-red-500 transition-all hover:bg-red-50">
            <LogOut size={18} /> Logout
          </button>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="space-y-6">
          {activeTab === "insights" && (
            <InsightsPanel analytics={analytics} loading={analyticsLoading} onRefresh={refreshAnalytics} />
          )}

          {activeTab === "general" && (
            <div className="space-y-6">
              <SectionCard title="Identity" icon={Settings}>
                <div className="space-y-4">
                  <FormInput label="Business Name" value={name} onChange={setName} />
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">URL Slug (Protected)</label>
                    <div className="flex items-center gap-2 rounded-2xl border bg-gray-50 px-5 py-4 font-mono text-sm text-gray-400">
                      <Lock size={14} /> {slug || "not-set"}
                    </div>
                  </div>
                  <FormInput label="Slogan / Short Description" value={description} onChange={setDescription} />
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">About the Place</label>
                    <textarea
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      className="h-32 w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 outline-none focus:border-[#f08c6c]"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Contact Information" icon={MapPin}>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormInput label="Phone Number" value={phone} onChange={setPhone} />
                  <FormInput label="WhatsApp Number" value={whatsapp} onChange={setWhatsapp} />
                  <FormInput label="Website Link" value={website} onChange={setWebsite} />
                  <FormInput label="Physical Address" value={location} onChange={setLocation} />
                </div>
              </SectionCard>

              <SectionCard title="Social Links" icon={Globe}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                      <FaInstagram size={14} /> Instagram URL
                    </label>
                    <input
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="https://instagram.com/..."
                      className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 font-medium outline-none transition-all focus:border-[#f08c6c]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                      <FaFacebook size={14} /> Facebook URL
                    </label>
                    <input
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                      placeholder="https://facebook.com/..."
                      className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 font-medium outline-none transition-all focus:border-[#f08c6c]"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                      <FaTiktok size={14} /> TikTok URL
                    </label>
                    <input
                      value={tiktok}
                      onChange={(e) => setTiktok(e.target.value)}
                      placeholder="https://tiktok.com/@..."
                      className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 font-medium outline-none transition-all focus:border-[#f08c6c]"
                    />
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {activeTab === "branding" && (
            <div className="space-y-6">
              <SectionCard title="Visual Brand" icon={ImageIcon}>
                <div className="grid gap-6 md:grid-cols-2">
                  <UploadBox
                    label="Business Logo"
                    image={logo}
                    onUpload={async (file: File) => {
                      const url = await runUpload("logo", file);
                      if (url) setLogo(url);
                    }}
                    uploading={uploading === "logo"}
                  />
                  <UploadBox
                    label="Cover Photo"
                    image={coverImage}
                    isCover
                    onUpload={async (file: File) => {
                      const url = await runUpload("cover", file);
                      if (url) setCoverImage(url);
                    }}
                    uploading={uploading === "cover"}
                  />
                </div>
              </SectionCard>
              <SectionCard title="Custom Theme" icon={Settings}>
                <div className="grid grid-cols-3 gap-4">
                  <ColorInput label="Primary" value={primaryColor} onChange={setPrimaryColor} />
                  <ColorInput label="Secondary" value={secondaryColor} onChange={setSecondaryColor} />
                  <ColorInput label="Background" value={backgroundColor} onChange={setBackgroundColor} />
                </div>
              </SectionCard>
            </div>
          )}

          {activeTab === "menu" && (
            <div className="space-y-6">
              <SectionCard title={editingItemId ? "Update Menu Item" : "New Menu Item"} icon={Plus}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Category</label>
                    <input
                      list="cat-list"
                      value={mCat}
                      onChange={(e) => setMCat(e.target.value)}
                      placeholder="Type or select a category..."
                      className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 outline-none focus:border-[#f08c6c]"
                    />
                    <datalist id="cat-list">
                      {existingCategories.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                  <FormInput label="Product Name" value={mName} onChange={setMName} />
                  <FormInput label="Price (e.g. 15k RWF)" value={mPrice} onChange={setMPrice} />
                  <div className="md:col-span-2">
                    <FormInput label="Description (Optional)" value={mDesc} onChange={setMDesc} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Item Photo</label>
                    <div className="flex items-center gap-4">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border bg-gray-50">
                        {mImg ? <img src={mImg} alt="Item preview" className="h-full w-full object-cover" />: <ImageIcon className="text-gray-200" />}
                      </div>
                      <div className="relative flex-1">
                        <div className="flex h-12 items-center justify-center rounded-2xl border-2 border-dashed border-[#f4d4ca] text-sm font-bold text-gray-400">
                          {uploading === "menu" ? <Loader2 className="animate-spin" /> : <><UploadCloud size={16} className="mr-2" /> Upload Item Photo</>}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 cursor-pointer opacity-0"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            const url = await runUpload("menu", file);
                            if (url) setMImg(url);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-6 rounded-2xl bg-gray-50 p-4 md:col-span-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
                      <input
                        type="checkbox"
                        checked={mAvailable}
                        onChange={(e) => setMAvailable(e.target.checked)}
                        className="h-5 w-5 accent-[#f08c6c]"
                      />
                      Available
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-orange-500">
                      <input
                        type="checkbox"
                        checked={mFeatured}
                        onChange={(e) => setMFeatured(e.target.checked)}
                        className="h-5 w-5 accent-[#f08c6c]"
                      />
                      <Star size={14} fill="currentColor" /> Featured
                    </label>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={saveMenuItem}
                    className="flex-1 rounded-2xl bg-[#f08c6c] py-4 font-black text-white shadow-lg transition-all active:scale-95"
                  >
                    {editingItemId ? "Save Updates" : "Add to Menu"}
                  </button>
                  {editingItemId && (
                    <button
                      onClick={resetMenuForm}
                      className="rounded-2xl border border-gray-200 px-6 font-bold text-gray-400"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </SectionCard>

              {/* MENU LIST */}
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      placeholder="Search menu items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-2xl border border-[#f4d4ca] bg-white py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#f08c6c]/20"
                    />
                  </div>
                  <button
                    onClick={() => setShowCatManager(true)}
                    className="flex items-center gap-2 rounded-xl border border-[#f4d4ca] bg-white px-4 py-3 text-sm font-bold text-[#f08c6c]"
                  >
                    <Settings size={16} /> Manage Categories
                  </button>
                </div>

                {filteredMenu.map((cat) => (
                  <div key={cat.category} className="space-y-3">
                    <h3 className="flex items-center gap-2 px-2 text-xs font-black uppercase tracking-widest text-[#f08c6c]">
                      <ChevronRight size={14} /> {cat.category}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {cat.items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-4 rounded-3xl border bg-white p-4 transition-all ${
                            item.available ? "border-[#f4d4ca]" : "opacity-60 grayscale border-gray-200"
                          }`}
                        >
                          <div className="h-14 w-14 overflow-hidden rounded-xl bg-gray-50">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-200">
                                <ImageIcon size={20} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-bold">{item.name}</p>
                              {item.featured && <Star size={12} className="fill-orange-400 text-orange-400" />}
                            </div>
                            <p className="text-sm font-black text-[#f08c6c]">{item.price}</p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditItem(item, cat.category)}
                              className="rounded-lg p-2 text-gray-400 hover:text-[#f08c6c]"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button
                              onClick={() => setItemToDelete({ id: item.id, name: item.name })}
                              className="rounded-lg p-2 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "gallery" && (
            <SectionCard title="Public Gallery" icon={ImageIcon}>
              <div className="space-y-6">
                <div className="relative flex h-32 flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-[#f4d4ca] bg-gray-50 transition-all hover:bg-gray-100">
                  <UploadCloud size={32} className="mb-2 text-gray-300" />
                  <p className="text-sm font-bold text-gray-400">Click to upload photos</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={handleGalleryUpload}
                  />
                  {uploading === "gallery" && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-[2.5rem] bg-white/80">
                      <Loader2 className="animate-spin text-[#f08c6c]" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
                  {gallery.map((img, idx) => (
                    <div key={idx} className="group relative aspect-square overflow-hidden rounded-2xl border bg-gray-50">
                      <img src={img} alt={`Gallery photo ${idx + 1}`} className="h-full w-full object-cover" />
                      <button
                        onClick={() => setGallery(gallery.filter((_, i) => i !== idx))}
                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-all group-hover:opacity-100"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === "offers" && (
            <SectionCard title="Perks & Features" icon={Tag}>
              <div className="space-y-6">
                <div className="flex gap-2">
                  <input
                    value={offerInput}
                    onChange={(e) => setOfferInput(e.target.value)}
                    placeholder="e.g. Fast WiFi, Terrace Seating..."
                    className="flex-1 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 outline-none focus:border-[#f08c6c]"
                  />
                  <button
                    onClick={addOffer}
                    className="rounded-2xl bg-[#f08c6c] px-6 font-bold text-white shadow-lg"
                  >
                    Add Perk
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {offers.map((offer, idx) => (
                    <div key={idx} className="flex items-center gap-3 rounded-3xl border border-[#f4d4ca] bg-gray-50 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#f08c6c]">
                        {offer.icon === "wifi" ? <Wifi size={18} /> : 
                         offer.icon === "car" ? <Car size={18} /> : 
                         offer.icon === "truck" ? <Truck size={18} /> : 
                         offer.icon === "coffee" ? <Coffee size={18} /> : <Tag size={18} />}
                      </div>
                      <span className="flex-1 text-sm font-bold text-gray-700">{offer.text}</span>
                      <button
                        onClick={() => setOffers(offers.filter((_, i) => i !== idx))}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === "account" && (
            <div className="space-y-6">
              <SectionCard title="Security & Account" icon={ShieldCheck}>
                <div className="space-y-6">
                  <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="text-[#f08c6c]" size={20} />
                        <div>
                          <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Login Email</p>
                          <p className="font-bold">{user?.email}</p>
                        </div>
                      </div>
                      {user?.emailVerified ? (
                        <div className="flex items-center gap-1 text-[10px] font-black uppercase text-green-500 bg-green-50 px-3 py-1 rounded-full">
                          <CircleCheck size={12} /> Verified
                        </div>
                      ) : (
                        <button
                          onClick={verifyEmail}
                          disabled={verifying}
                          className="text-[10px] font-black uppercase text-white bg-[#f08c6c] px-3 py-1 rounded-full active:scale-95 disabled:opacity-50"
                        >
                          {verifying ? "Sending..." : "Verify"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                         <Clock size={14}/> <span className="text-[10px] font-black uppercase">Last Sign In</span>
                      </div>
                      <p className="text-xs font-bold text-gray-600">{user?.metadata.lastSignInTime}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                         <Smartphone size={14}/> <span className="text-[10px] font-black uppercase">Device Info</span>
                      </div>
                      <p className="text-xs font-bold text-gray-600">Securely Logged In</p>
                    </div>
                  </div>

                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <FormInput label="Current Password" type="password" value={curPass} onChange={setCurPass} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormInput label="New Password" type="password" value={newPass} onChange={setNewPass} />
                      <FormInput label="Confirm New Password" type="password" value={confPass} onChange={setConfPass} />
                    </div>
                    <button
                      type="submit"
                      disabled={saving || !curPass}
                      className="w-full rounded-3xl bg-gray-900 py-4 font-black text-white shadow-xl transition-all active:scale-95 disabled:opacity-50"
                    >
                      Update Password
                    </button>
                  </form>
                </div>
              </SectionCard>
            </div>
          )}
        </div>

        {/* RIGHT PREVIEW PANEL */}
        <aside className="space-y-6">
          <div className="sticky top-24 space-y-6">
            {/* SUBSCRIPTION CARD */}
            <div className="rounded-[2.5rem] bg-gray-900 p-6 text-white shadow-xl relative overflow-hidden">
               <div className="relative z-10">
                 <div className="flex items-center justify-between mb-4">
                    <span className="rounded-lg bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest">{plan} Plan</span>
                    <Star className="text-orange-400" size={20} />
                 </div>
                 <h3 className="text-xl font-black mb-1">{name || "Your Restaurant"}</h3>
                 <p className="text-xs font-medium text-white/50 mb-4 italic">
                    {daysRemaining !== null ? `${daysRemaining} days remaining` : "Premium Plan"}
                 </p>
                 <a
                   href={`${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Hello ScanDish, I would like to renew the subscription for ${name}.`)}`}
                   target="_blank"
                   rel="noreferrer"
                   className="block w-full py-3 rounded-2xl bg-white text-center text-gray-900 font-black text-sm active:scale-95 transition-all"
                 >
                   Renew Subscription
                 </a>
               </div>
               <div className="absolute -right-10 -bottom-10 h-32 w-32 bg-white/5 blur-3xl rounded-full" />
            </div>

            {/* QR CODE CARD */}
            <div className="rounded-[2.5rem] border border-[#f4d4ca] bg-white p-6 shadow-sm">
              <h4 className="mb-4 text-lg font-black flex items-center gap-2 text-gray-900">
                Menu QR Code
              </h4>
              <div className="flex flex-col items-center justify-center rounded-3xl bg-[#fff8f5] p-6 text-center">
                <div className="rounded-3xl bg-white p-4 shadow-lg">
                  <QRCodeSVG
                    id="restaurant-qr"
                    value={publicUrl ? `${publicUrl}?s=qr` : "https://scandish.online"}
                    size={160}
                    level="H"
                    fgColor={QR_DARK}
                    includeMargin
                  />
                </div>
                <p className="mt-4 font-mono text-[10px] font-black uppercase tracking-widest text-gray-400">
                  /r/{slug || "slug-id"}
                </p>
              </div>
              <div className="mt-4 grid gap-2">
                 <button onClick={() => downloadQR('png')} className="rounded-xl bg-[#f08c6c] py-3 text-sm font-bold text-white shadow-md active:scale-95 transition-all">Download PNG</button>
                 <button onClick={() => downloadQR('svg')} className="rounded-xl border border-[#f4d4ca] py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50">Download SVG</button>
              </div>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex w-full items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-widest text-[#f08c6c]"
              >
                Go to Public Link <ExternalLink size={12} />
              </a>
            </div>

            {/* SCAN DISH SUPPORT */}
            <div className="rounded-[2.5rem] border border-[#f4d4ca] bg-white p-6 shadow-sm">
               <h4 className="font-black mb-1">Kigali Support</h4>
               <p className="text-xs font-medium text-gray-400 mb-4 leading-relaxed">Contact ScanDish team directly if you have any issues.</p>
               <div className="grid gap-2">
                 <a href="https://wa.me/250781822350" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-green-500 p-3 text-sm font-bold text-white">
                   <FaWhatsapp size={20} /> Send WhatsApp
                 </a>
                 <a href="tel:+250781822350" className="flex items-center gap-3 rounded-2xl bg-blue-500 p-3 text-sm font-bold text-white">
                   <Phone size={18} /> Direct Call
                 </a>
               </div>
            </div>
          </div>
        </aside>
      </div>

      {/* MODALS */}
      {itemToDelete && (
        <Modal title="Confirm Item Removal" onClose={() => setItemToDelete(null)}>
          <div className="space-y-6">
            <p className="font-medium text-gray-500 leading-relaxed">
              Remove <span className="font-black text-gray-900">&ldquo;{itemToDelete.name}&rdquo;</span>?
              It disappears from your public menu when you click Publish Changes.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteItem}
                className="flex-1 rounded-2xl bg-red-600 py-4 font-black text-white active:scale-95 transition-all"
              >
                Delete
              </button>
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 rounded-2xl bg-gray-100 py-4 font-black text-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showCatManager && (
        <Modal title="Category Manager" onClose={() => setShowCatManager(false)}>
          <div className="space-y-4">
            <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-2">
              {existingCategories.map((cat) => (
                <div key={cat} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  {catToRename === cat ? (
                    <input
                      autoFocus
                      className="flex-1 rounded-lg border-2 border-[#f08c6c] bg-white px-3 py-1 font-bold outline-none"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRenameCategory()}
                    />
                  ) : (
                    <span className="font-bold text-gray-700">{cat}</span>
                  )}
                  <div className="flex gap-1">
                    {catToRename === cat ? (
                      <button onClick={handleRenameCategory} className="p-2 text-green-600"><CheckCircle2 size={18}/></button>
                    ) : (
                      <button onClick={() => { setCatToRename(cat); setNewCatName(cat); }} className="p-2 text-gray-400 hover:text-[#f08c6c]"><Edit3 size={18} /></button>
                    )}
                    <button onClick={() => handleDeleteCategory(cat)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowCatManager(false)}
              className="w-full rounded-2xl bg-gray-900 py-4 font-black text-white shadow-xl"
            >
              Close Window
            </button>
          </div>
        </Modal>
      )}

      <footer className="border-t border-[#f4d4ca] bg-white py-10 mt-12 text-center text-[10px] font-black uppercase tracking-widest text-gray-300">
        ScanDish © {new Date().getFullYear()} • Professional QR Menu Solutions •{" "}
        <a href="https://ironiclab.site" target="_blank" rel="noreferrer" className="hover:text-[#f08c6c]">
          A product of Ironic Lab Inc.
        </a>
        <span className="mt-2 block">
          <a href="/terms" target="_blank" className="hover:text-[#f08c6c]">Terms</a>
          {" • "}
          <a href="/privacy" target="_blank" className="hover:text-[#f08c6c]">Privacy</a>
        </span>
      </footer>
    </main>
  );
}

// --- SUB-COMPONENTS ---

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function FormInput({ label, value, onChange, type = "text" }: FieldProps & { type?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 font-medium outline-none transition-all focus:border-[#f08c6c] focus:ring-4 focus:ring-[#f08c6c]/5"
      />
    </div>
  );
}

function ColorInput({ label, value, onChange }: FieldProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center block w-full">{label}</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full cursor-pointer rounded-xl border-4 border-white bg-gray-100 shadow-sm"
      />
    </div>
  );
}

function UploadBox({
  label,
  image,
  onUpload,
  uploading,
  isCover,
}: {
  label: string;
  image: string;
  onUpload: (file: File) => void;
  uploading: boolean;
  isCover?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</label>
      <div className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-[2rem] border-2 border-dashed border-[#f4d4ca] bg-gray-50 transition-all hover:bg-gray-100">
        {image ? (
          <img src={image} alt={label} className={`h-full w-full ${isCover ? "object-cover" : "object-contain p-6"}`} />
        ) : (
          <UploadCloud size={32} className="text-gray-200" />
        )}
        <input
          type="file"
          accept="image/*"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onUpload(file);
          }}
        />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <Loader2 className="animate-spin text-[#f08c6c]" />
          </div>
        )}
      </div>
    </div>
  );
}