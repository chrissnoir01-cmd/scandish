"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import Link from "next/link";

const BRAND = "#f08c6c";

export default function CompanySignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !inviteCode || !password || !confirmPassword) {
      alert("Fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const q = query(
        collection(db, "companies"),
        where("email", "==", email.trim().toLowerCase()),
        where("inviteCode", "==", inviteCode.trim())
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        alert("Invalid email or invite code");
        setLoading(false);
        return;
      }

      const companyDoc = snap.docs[0];
      const company = companyDoc.data();

      if (company.inviteUsed) {
        alert("This invite code has already been used");
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );

      const user = userCredential.user;

      await updateDoc(doc(db, "companies", companyDoc.id), {
        ownerUid: user.uid,
        inviteUsed: true,
        updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(db, "restaurants", user.uid), {
        ownerUid: user.uid,
        ownerEmail: email.trim().toLowerCase(),
        companyId: companyDoc.id,

        name: company.companyName || "",
        slug:
          company.companyName
            ?.toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") || "",

        description: "",
        about: "",
        logo: "",
        coverImage: "",

        phone: company.phone || "",
        whatsapp: company.phone || "",
        website: "",
        location: company.location || "",

        social: {
          instagram: "",
          facebook: "",
          tiktok: "",
        },

        theme: {
          primaryColor: BRAND,
          secondaryColor: "#111827",
          backgroundColor: "#fff8f5",
        },

        menu: [],
        gallery: [],
        offers: [],

        status: company.status || "inactive",
        subscriptionStart: company.subscriptionStart || "",
        subscriptionEnd: company.subscriptionEnd || "",

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      alert("Account created successfully!");
      router.push("/dashboard");
    } catch (error: any) {
      console.error(error);

      if (error.code === "auth/email-already-in-use") {
        alert("This email already has an account. Try login.");
      } else {
        alert("Signup failed. Check your information and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fff8f5] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-[#f2ddd6] rounded-3xl shadow-sm p-6">
        <div className="text-center mb-6">
          <p className="text-sm font-semibold" style={{ color: BRAND }}>
            ScanDish
          </p>
          <h1 className="text-2xl font-bold mt-1">Create Company Password</h1>
          <p className="text-sm text-gray-500 mt-2">
            Use the email and invite code given by ScanDish MasterAdmin.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            placeholder="Company Email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            placeholder="Invite Code"
            className="input uppercase"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          />

          <input
            type="password"
            placeholder="New Password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirm Password"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full rounded-2xl px-5 py-3 text-white font-semibold disabled:opacity-60"
            style={{ backgroundColor: BRAND }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already created password?{" "}
          <Link href="/login" className="font-semibold" style={{ color: BRAND }}>
            Login
          </Link>
        </p>
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
    </main>
  );
}