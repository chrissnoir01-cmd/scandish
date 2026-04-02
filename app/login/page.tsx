"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

const BRAND = "#f08c6c";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const login = async () => {
    setErrorMessage("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (error: any) {
      console.error(error);
      setErrorMessage("Login failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    setErrorMessage("");
    setLoading(true);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (error: any) {
      console.error(error);
      setErrorMessage("Sign up failed. Try a different email or stronger password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      setErrorMessage("Please enter your email and password.");
      return;
    }

    if (mode === "login") {
      await login();
    } else {
      await register();
    }
  };

  return (
    <main className="min-h-screen bg-[#fff8f5] text-gray-900">
      <div className="min-h-screen grid lg:grid-cols-2">
        {/* Left branding side */}
        <section className="hidden lg:flex flex-col justify-between p-10 bg-white border-r border-[#f3d8cf]">
          <div>
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 overflow-hidden rounded-2xl border border-[#f3d8cf] shadow-sm">
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
                <p
                 className="mt-5 text-2xl md:text-4xl font-bold leading-tight">
                  {" "}
                <span style={{ color: BRAND }}>Scan</span>
                <span className=" text-gray-500">Dish </span>
              </p>
              
                <h1 className="text-2xl font-bold">Restaurant Portal</h1>
              </div>
            </div>

            <div className="mt-16 max-w-md">
              <h2 className="text-5xl font-bold leading-tight">
                Manage your restaurant in one beautiful place.
              </h2>

              <p className="mt-6 text-lg text-gray-600 leading-8">
                Update your menu, brand your public page, generate your QR code,
                and let customers discover your restaurant with a better digital experience.
              </p>
            </div>
          </div>
        </section>

        {/* Right form side */}
        <section className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            {/* Mobile brand */}
            <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
              <div className="relative w-14 h-14 overflow-hidden rounded-2xl border border-[#f3d8cf] shadow-sm">
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
                <p
                  className="text-sm font-semibold uppercase tracking-[0.2em]"
                  style={{ color: BRAND }}
                >
                  ScanDish
                </p>
                <h1 className="text-xl font-bold">Restaurant Portal</h1>
              </div>
            </div>

            <div className="bg-white border border-[#f3d8cf] rounded-3xl shadow-sm p-6 md:p-8">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">
                    {mode === "login" ? "Welcome back" : "Create account"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {mode === "login"
                      ? "Login to manage your restaurant dashboard."
                      : "Sign up to create and manage your restaurant profile."}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-[#edd4cb] px-4 py-3 outline-none focus:ring-2 focus:border-transparent"
                    style={{ ["--tw-ring-color" as any]: BRAND }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-[#edd4cb] px-4 py-3 outline-none focus:ring-2 focus:border-transparent"
                    style={{ ["--tw-ring-color" as any]: BRAND }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {errorMessage && (
                  <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full text-white rounded-2xl px-4 py-3 font-semibold shadow-sm disabled:opacity-60"
                  style={{ backgroundColor: BRAND }}
                >
                  {loading
                    ? mode === "login"
                      ? "Logging in..."
                      : "Creating account..."
                    : mode === "login"
                    ? "Login"
                    : "Create Account"}
                </button>
              </div>

              <div className="mt-6 text-center text-sm text-gray-500">
                {mode === "login" ? (
                  <>
                    Don’t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signup");
                        setErrorMessage("");
                      }}
                      className="font-semibold"
                      style={{ color: BRAND }}
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setErrorMessage("");
                      }}
                      className="font-semibold"
                      style={{ color: BRAND }}
                    >
                      Login
                    </button>
                  </>
                )}
              </div>
            </div>

            <p className="text-center text-xs text-gray-500 mt-5">
              By continuing, you agree to use ScanDish for managing your restaurant profile.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}