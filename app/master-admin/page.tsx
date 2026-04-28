"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const BRAND = "#f08c6c";
const MASTER_ADMIN_EMAIL = "admin@scandish.com";

export default function MasterAdminPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [businessType, setBusinessType] = useState("Restaurant");
  const [subscriptionStart, setSubscriptionStart] = useState("");
  const [subscriptionEnd, setSubscriptionEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [certificateUrl, setCertificateUrl] = useState("");
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [confirmStatusCompany, setConfirmStatusCompany] = useState<any | null>(null);
  const [confirmDeleteCompany, setConfirmDeleteCompany] = useState<any | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [renewCompany, setRenewCompany] = useState<any | null>(null);
  const [renewDays, setRenewDays] = useState(180); // default 6 months

useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (currentUser) => {
    if (!currentUser) {
      router.replace("/secure-access-9xk3-admin");
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || userSnap.data().role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    setUser(currentUser);
    setChecking(false);
  });

  return () => unsub();
}, [router]);

useEffect(() => {
  if (user) {
    loadCompanies();
  }
}, [user]);
  const loadCompanies = async () => {
    const snap = await getDocs(collection(db, "companies"));
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    setCompanies(list);
  };

  

  const generateInviteCode = () => {
    const random = Math.floor(100000 + Math.random() * 900000);
    return `SCANDISH-${random}`;
  };

  const getDaysRemaining = (endDate: string) => {
    if (!endDate) return 0;

    const today = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - today.getTime();

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const createCompany = async () => {
    if (!companyName || !managerName || !phone) {
      alert("Company name, manager name, and phone are required");
      return;
    }

    const inviteCode = generateInviteCode();
    const companyRef = doc(collection(db, "companies"));

    await setDoc(companyRef, {
      companyName,
      managerName,
      phone,
      email,
      location,
      certificateNumber,
      businessType,
      subscriptionStart,
      subscriptionEnd,
      notes,
      status: "inactive",
      ownerUid: "",
      inviteCode,
      inviteUsed: false,
      logo: "",
      certificateUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    alert(`Company created.\nInvite Code: ${inviteCode}`);

    setCompanyName("");
    setManagerName("");
    setPhone("");
    setEmail("");
    setLocation("");
    setCertificateNumber("");
    setBusinessType("Restaurant");
    setSubscriptionStart("");
    setSubscriptionEnd("");
    setNotes("");
    setCertificateUrl("");
    loadCompanies();
  };

  const logout = async () => {
  await signOut(auth);
  router.replace("/secure-access-9xk3-admin"); // back to hidden admin login
};

  const updateCompanyStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, "companies", id), {
      status,
      updatedAt: new Date().toISOString(),
    });

    loadCompanies();
  };

  const deleteCompany = async (id: string) => {
  if (deleteText !== "DELETE") {
    alert("Type DELETE to confirm.");
    return;
  }

  await deleteDoc(doc(db, "companies", id));
  setConfirmDeleteCompany(null);
  setDeleteText("");
  loadCompanies();
};

const renewSubscription = async () => {
  if (!renewCompany) return;

  const today = new Date();
  const currentEnd = renewCompany.subscriptionEnd
    ? new Date(renewCompany.subscriptionEnd)
    : today;

  const baseDate = currentEnd > today ? currentEnd : today;

  const newEnd = new Date(baseDate);
  newEnd.setDate(newEnd.getDate() + Number(renewDays));

  await updateDoc(doc(db, "companies", renewCompany.id), {
    subscriptionEnd: newEnd.toISOString(),
    status: "active",
    updatedAt: new Date().toISOString(),
  });

  setRenewCompany(null);
  loadCompanies();
};

  const uploadFileToCloudinary = async (file: File) => {
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

  const filteredCompanies = useMemo(() => {
    const q = search.toLowerCase();

    return companies.filter((c) => {
      return (
        c.companyName?.toLowerCase().includes(q) ||
        c.managerName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q) ||
        c.status?.toLowerCase().includes(q)
      );
    });
  }, [companies, search]);

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter((c) => c.status === "active").length;
  const inactiveCompanies = companies.filter((c) => c.status === "inactive").length;
  const expiredCompanies = companies.filter(
    (c) => getDaysRemaining(c.subscriptionEnd) < 1 && c.subscriptionEnd
  ).length;
  const expiringSoon = companies.filter((c) => {
    const days = getDaysRemaining(c.subscriptionEnd);
    return days > 0 && days <= 5;
  }).length;

  if (checking) {
    return (
      <main className="min-h-screen bg-[#fff8f5] flex items-center justify-center">
        <p>Checking access...</p>
      </main>
    );
  }

  if (!user || user.email !== MASTER_ADMIN_EMAIL) {
    return (
      <main className="min-h-screen bg-[#fff8f5] flex items-center justify-center px-6">
        <div className="bg-white border rounded-3xl p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="text-gray-500 mt-3">
            This page is only for ScanDish MasterAdmin.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8f5] text-gray-900">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <header className="bg-white border border-[#f2ddd6] rounded-3xl p-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: BRAND }}>
              ScanDish MasterAdmin
            </p>
            <h1 className="text-3xl font-bold">Control Center</h1>
            <p className="text-gray-500 mt-1">Logged in as {user.email}</p>
          </div>

     <button
  onClick={logout}
  className="px-5 py-3 rounded-2xl text-white font-semibold bg-red-600 hover:bg-red-700 transition"
>
  Logout
</button>
        </header>

        {/* OVERVIEW */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[
            ["Total Companies", totalCompanies],
            ["Active", activeCompanies],
            ["Inactive", inactiveCompanies],
            ["Expired", expiredCompanies],
            ["Expiring Soon", expiringSoon],
          ].map(([label, value]) => (
            <div
              key={label}
              className="bg-white border border-[#f2ddd6] rounded-3xl p-5 shadow-sm"
            >
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-3xl font-bold mt-2">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          {/* CREATE COMPANY */}
          <div className="lg:col-span-1 bg-white border border-[#f2ddd6] rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Create Company Account</h2>

            <div className="space-y-3">
              <input
                placeholder="Company Name"
                className="input"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />

              <input
                placeholder="Manager Name"
                className="input"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
              />

              <input
                placeholder="Phone Number"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <input
                placeholder="Email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                placeholder="Location"
                className="input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />

              <input
                placeholder="Certificate / Registration Number"
                className="input"
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
              />

              <div>
  <label className="text-sm text-gray-500">Certificate Document</label>
  <input
    type="file"
    accept="image/*,.pdf"
    className="input"
    onChange={async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setUploadingCertificate(true);
        const url = await uploadFileToCloudinary(file);
        setCertificateUrl(url);
      } catch (error) {
        console.error(error);
        alert("Certificate upload failed");
      } finally {
        setUploadingCertificate(false);
      }
    }}
  />

  {uploadingCertificate && (
    <p className="text-sm text-gray-500 mt-1">Uploading certificate...</p>
  )}

  {certificateUrl && (
    <a
      href={certificateUrl}
      target="_blank"
      rel="noreferrer"
      className="text-sm font-semibold mt-2 inline-block"
      style={{ color: BRAND }}
    >
      View uploaded certificate
    </a>
  )}
</div>

              <input
                placeholder="Business Type"
                className="input"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              />

              <div>
                <label className="text-sm text-gray-500">Subscription Start</label>
                <input
                  type="date"
                  className="input"
                  value={subscriptionStart}
                  onChange={(e) => setSubscriptionStart(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-gray-500">Subscription End</label>
                <input
                  type="date"
                  className="input"
                  value={subscriptionEnd}
                  onChange={(e) => setSubscriptionEnd(e.target.value)}
                />
              </div>

              <textarea
                placeholder="Notes"
                className="input min-h-24"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <button
                onClick={createCompany}
                className="w-full px-5 py-3 rounded-2xl text-white font-semibold"
                style={{ backgroundColor: BRAND }}
              >
                Create Company
              </button>
            </div>
          </div>

          {/* MANAGE COMPANIES */}
          <div className="lg:col-span-2 bg-white border border-[#f2ddd6] rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xl font-bold">Manage Companies</h2>
                <p className="text-gray-500 text-sm">
                  Activate, deactivate, search, or delete companies.
                </p>
              </div>

              <input
                placeholder="Search company..."
                className="input md:max-w-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              {filteredCompanies.length === 0 && (
                <p className="text-gray-500">No companies found.</p>
              )}

              {filteredCompanies.map((company) => {
                const daysRemaining = getDaysRemaining(company.subscriptionEnd);
                const isExpired = company.subscriptionEnd && daysRemaining < 1;

                return (
                  <div
                    key={company.id}
                    className="border border-[#f2ddd6] rounded-3xl p-4 bg-[#fffdfb]"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold">
                          {company.companyName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Manager: {company.managerName}
                        </p>
                        <p className="text-sm text-gray-500">
                          Phone: {company.phone}
                        </p>
                        <p className="text-sm text-gray-500">
                          Email: {company.email || "No email"}
                        </p>
                        <p className="text-sm text-gray-500">
                          Location: {company.location || "No location"}
                        </p>
                        <p className="text-sm text-gray-500">
                          Invite Code:{" "}
                          <span className="font-semibold text-gray-800">
                            {company.inviteCode}
                          </span>
                        </p>
                      </div>

                      <div className="text-sm md:text-right">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 font-semibold ${
                            company.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {company.status}
                        </span>

                        <p className="mt-2 text-gray-500">
                          Days remaining:{" "}
                          <span
                            className={
                              isExpired
                                ? "text-red-600 font-bold"
                                : daysRemaining <= 5
                                ? "text-orange-600 font-bold"
                                : "text-green-600 font-bold"
                            }
                          >
                            {company.subscriptionEnd ? daysRemaining : "Not set"}
                          </span>
                        </p>
                        {company.subscriptionEnd && daysRemaining > 0 && daysRemaining <= 5 && (
  <p className="mt-2 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2 text-orange-700 font-semibold">
    ⚠️ Subscription ends in {daysRemaining} day{daysRemaining > 1 ? "s" : ""}
  </p>
)}
                      </div>
                    </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
  <label className="flex items-center gap-3 rounded-2xl border border-[#f2ddd6] bg-white px-4 py-2 cursor-pointer">
    <input
      type="checkbox"
      checked={company.status === "active"}
      onChange={() => setConfirmStatusCompany(company)}
      className="h-5 w-5 accent-[#f08c6c]"
    />
    <span className="text-sm font-semibold">
      {company.status === "active" ? "Active" : "Inactive"}
    </span>
  </label>

  {/* 🔥 NEW RENEW BUTTON */}
  <button
    onClick={() => setRenewCompany(company)}
    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
  >
    Renew
  </button>

  <button
    onClick={() => setConfirmDeleteCompany(company)}
    className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold"
  >
    Delete
  </button>
</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #efd6ce;
          border-radius: 16px;
          padding: 12px 14px;
          outline: none;
          background: white;
        }

        .input:focus {
          border-color: ${BRAND};
          box-shadow: 0 0 0 3px ${BRAND}22;
        }
      `}</style>

        {confirmStatusCompany && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
      <h2 className="text-xl font-bold">Confirm status change</h2>

      <p className="mt-3 text-gray-600">
        Are you sure you want to{" "}
        <span className="font-bold">
          {confirmStatusCompany.status === "active" ? "deactivate" : "activate"}
        </span>{" "}
        {confirmStatusCompany.companyName}?
      </p>

      <div className="mt-6 flex gap-3">
        <button
          onClick={async () => {
            await updateCompanyStatus(
              confirmStatusCompany.id,
              confirmStatusCompany.status === "active" ? "inactive" : "active"
            );
            setConfirmStatusCompany(null);
          }}
          className="flex-1 rounded-2xl px-4 py-3 text-white font-semibold"
          style={{ backgroundColor: BRAND }}
        >
          Yes, confirm
        </button>

        <button
          onClick={() => setConfirmStatusCompany(null)}
          className="flex-1 rounded-2xl border border-[#efd6ce] px-4 py-3 font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

{confirmDeleteCompany && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
      <h2 className="text-xl font-bold text-red-600">Delete company</h2>

      <p className="mt-3 text-gray-600">
        This will delete{" "}
        <span className="font-bold">{confirmDeleteCompany.companyName}</span>{" "}
        from ScanDish company records.
      </p>

      <p className="mt-3 text-sm text-gray-500">
        Type <span className="font-bold">DELETE</span> to confirm.
      </p>

      <input
        value={deleteText}
        onChange={(e) => setDeleteText(e.target.value)}
        placeholder="Type DELETE"
        className="input mt-4"
      />

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => deleteCompany(confirmDeleteCompany.id)}
          className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-white font-semibold disabled:opacity-50"
          disabled={deleteText !== "DELETE"}
        >
          Delete
        </button>

        <button
          onClick={() => {
            setConfirmDeleteCompany(null);
            setDeleteText("");
          }}
          className="flex-1 rounded-2xl border border-[#efd6ce] px-4 py-3 font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

{renewCompany && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
      <h2 className="text-xl font-bold">Renew Subscription</h2>

      <p className="mt-2 text-gray-600">
        {renewCompany.companyName}
      </p>

      <div className="mt-4 space-y-3">
        <button
          onClick={() => setRenewDays(180)}
          className="w-full border rounded-xl py-2"
        >
          6 Months (180 days)
        </button>

        <button
          onClick={() => setRenewDays(365)}
          className="w-full border rounded-xl py-2"
        >
          1 Year (365 days)
        </button>

        <input
          type="number"
          placeholder="Custom days"
          value={renewDays}
          onChange={(e) => setRenewDays(Number(e.target.value))}
          className="input"
        />
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={renewSubscription}
          className="flex-1 rounded-2xl px-4 py-3 text-white font-semibold"
          style={{ backgroundColor: BRAND }}
        >
          Confirm Renew
        </button>

        <button
          onClick={() => setRenewCompany(null)}
          className="flex-1 rounded-2xl border px-4 py-3"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
    </main>
  );
}