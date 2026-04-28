"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";

const BRAND = "#f08c6c";
const MASTER_ADMIN_EMAIL = "admin@scandish.com";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async () => {
    if (!email || !password) {
      setError("Enter email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
     const res = await signInWithEmailAndPassword(auth, email, password);

if (res.user.email !== MASTER_ADMIN_EMAIL) {
  await auth.signOut();
  setError("Not authorized as admin");
  return;
}

router.push("/master-admin");
    } catch (err) {
      console.error(err);
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fff8f5] flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white border border-[#f2ddd6] rounded-3xl p-8 shadow-sm">
        
        {/* LOGO */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-[#f2ddd6]">
           <Image
  src="/images/logo.jpg"
  alt="ScanDish"
  fill
  sizes="56px"
  className="object-cover"
/>
          </div>

          <h1 className="mt-4 text-2xl font-bold">
            <span style={{ color: BRAND }}>Scan</span>Dish Admin
          </h1>

          <p className="text-gray-500 text-sm mt-1">
            Secure MasterAdmin access
          </p>
        </div>

        {/* FORM */}
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Admin email"
            className="w-full border border-[#efd6ce] rounded-2xl px-4 py-3 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border border-[#efd6ce] rounded-2xl px-4 py-3 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") login();
            }}
          />

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            onClick={login}
            disabled={loading}
            className="w-full py-3 rounded-2xl text-white font-semibold"
            style={{ backgroundColor: BRAND }}
          >
            {loading ? "Logging in..." : "Login as Admin"}
          </button>
        </div>

        {/* NOTE */}
        <p className="text-xs text-gray-500 text-center mt-6">
          This page is restricted to ScanDish MasterAdmin only.
        </p>
      </div>
    </main>
  );
}