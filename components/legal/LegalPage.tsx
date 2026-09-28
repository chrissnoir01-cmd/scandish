import Image from "next/image";
import Link from "next/link";
import { BRAND, LEGAL_UPDATED } from "@/lib/brand";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

/** Shared layout for the Terms of Service and Privacy Policy. */
export default function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-screen bg-[#fff8f5] text-gray-800">
      <header className="border-b border-[#f3d8cf] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative h-10 w-10 overflow-hidden rounded-xl border border-[#f3d8cf]">
              <Image src="/images/logo.jpg" alt="ScanDish logo" fill sizes="40px" className="object-cover" />
            </span>
            <span className="text-xl font-bold">
              <span style={{ color: BRAND.color }}>Scan</span>
              <span className="text-gray-500">Dish</span>
            </span>
          </Link>
          <nav className="flex gap-4 text-sm font-semibold text-gray-500">
            <Link href="/terms" className="hover:text-[#f08c6c]">Terms</Link>
            <Link href="/privacy" className="hover:text-[#f08c6c]">Privacy</Link>
            <Link href="/login" className="hover:text-[#f08c6c]">Login</Link>
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: BRAND.color }}>
          Legal
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-gray-900 md:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-gray-500">Last updated: {LEGAL_UPDATED}</p>

        <div className="mt-8 rounded-3xl border border-[#f3d8cf] bg-white p-6 leading-7 md:p-8">{intro}</div>

        <nav aria-label="Contents" className="mt-8 rounded-3xl border border-[#f3d8cf] bg-white p-6">
          <p className="mb-3 text-sm font-bold text-gray-900">Contents</p>
          <ol className="grid gap-1 text-sm sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-gray-600 hover:text-[#f08c6c]">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-6">
              <h2 className="text-xl font-bold text-gray-900">
                {i + 1}. {s.title}
              </h2>
              <div className="legal-body mt-3 space-y-3 leading-7 text-gray-700">{s.body}</div>
            </section>
          ))}
        </div>
      </article>

      <footer className="border-t border-[#f3d8cf] bg-white py-8 text-center text-sm text-gray-500">
        <p>
          ScanDish is owned, operated and governed by{" "}
          <a href={BRAND.companyUrl} target="_blank" rel="noreferrer" className="font-semibold text-gray-700 hover:text-[#f08c6c]">
            {BRAND.company}
          </a>
          .
        </p>
        <p className="mt-1">
          Questions? <a href={`mailto:${BRAND.supportEmail}`} className="font-semibold text-[#f08c6c]">{BRAND.supportEmail}</a>
        </p>
      </footer>
    </main>
  );
}
