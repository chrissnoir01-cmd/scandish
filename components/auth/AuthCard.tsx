import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

/** Centered card layout shared by the sign-in related pages. */
export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#fff8f5] text-gray-900 flex flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-3">
        <span className="relative h-12 w-12 overflow-hidden rounded-2xl border border-[#f3d8cf] shadow-sm">
          <Image src="/images/logo.jpg" alt="ScanDish logo" fill sizes="48px" className="object-cover" priority />
        </span>
        <span className="text-2xl font-bold">
          <span style={{ color: BRAND.color }}>Scan</span>
          <span className="text-gray-500">Dish</span>
        </span>
      </Link>

      <div className="w-full max-w-md rounded-3xl border border-[#f3d8cf] bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>

      <PoweredBy className="mt-8" />
    </main>
  );
}

export function PoweredBy({ className = "" }: { className?: string }) {
  const link = "font-semibold text-gray-500 hover:text-[#f08c6c]";
  return (
    <div className={`space-y-1 text-center text-xs text-gray-400 ${className}`}>
      <p>
        {BRAND.name} is owned and governed by{" "}
        <a href={BRAND.companyUrl} target="_blank" rel="noreferrer" className={link}>
          {BRAND.company}
        </a>
      </p>
      <p>
        <Link href="/terms" className={link}>
          Terms of Service
        </Link>
        <span className="mx-2" aria-hidden>·</span>
        <Link href="/privacy" className={link}>
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}

export function Notice({ tone, children }: { tone: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-600",
    success: "border-green-200 bg-green-50 text-green-700",
    info: "border-[#f3d8cf] bg-[#fff8f5] text-gray-600",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-2xl border border-[#edd4cb] px-4 py-3 outline-none focus:border-[#f08c6c] focus:ring-2 focus:ring-[#f08c6c]/20";

export const buttonClass =
  "w-full rounded-2xl bg-[#f08c6c] px-4 py-3 font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60";
