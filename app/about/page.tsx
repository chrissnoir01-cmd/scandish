import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { SiteFooter, SiteHeader, START_MESSAGE, whatsappLink } from "@/components/landing/SiteChrome";
import "@/components/landing/marketing.css";
import { BRAND, formatRwf } from "@/lib/brand";
import { marketingFonts } from "@/lib/fonts";
import { PREMIUM_BUILD_DAYS } from "@/lib/premium";
import { COMPANY_LINE, GUEST_FEATURES, OWNER_FEATURES, SUMMARY, faqs, premiumFeatures, type FactsInput } from "@/lib/scandish-facts";
import { getCompanyLeader, getContact, getPricing } from "@/lib/server/settings";
import { getShowcase } from "@/lib/server/showcase";
import { GRACE_DAYS } from "@/lib/subscription";

export const metadata: Metadata = {
  title: "About ScanDish — what it is, who makes it, how it works",
  description: `${SUMMARY} ${COMPANY_LINE}`,
  alternates: { canonical: "/about" },
  openGraph: { title: "About ScanDish", description: SUMMARY, url: "/about", type: "website" },
};

export const revalidate = 3600;

export default async function AboutPage() {
  const [pricing, leader, showcase, contact] = await Promise.all([getPricing(), getCompanyLeader(), getShowcase(), getContact()]);
  const facts: FactsInput = { pricing, leader, liveCount: showcase.liveCount, contact };
  const list = faqs(facts);
  const asOf = new Date().toLocaleDateString("en-GB", { timeZone: "Africa/Kigali", day: "numeric", month: "long", year: "numeric" });

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About ScanDish",
      url: `${BRAND.url}/about`,
      description: SUMMARY,
      about: { "@id": `${BRAND.url}/#organization` },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: BRAND.company,
      url: BRAND.companyUrl,
      address: { "@type": "PostalAddress", addressLocality: "Kigali", addressCountry: "RW" },
      brand: { "@type": "Brand", name: "ScanDish", url: BRAND.url },
      ...(leader.name ? { employee: { "@type": "Person", name: leader.name, jobTitle: leader.title || undefined } } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: list.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  const glance: [string, React.ReactNode][] = [
    ["What", "QR menu pages for restaurants, cafés and bars"],
    ["Where", "Rwanda — made in Kigali"],
    ["Made by", <a key="c" href={BRAND.companyUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">{BRAND.company}</a>],
    ...(leader.name ? ([["Led by", `${leader.name}${leader.title ? `, ${leader.title}` : ""}`]] as [string, React.ReactNode][]) : []),
    ...(showcase.liveCount > 0 ? ([["Live menus", String(showcase.liveCount)]] as [string, React.ReactNode][]) : []),
    ["Prices from", `${formatRwf(pricing.standard.setupFee)} setup, ${formatRwf(pricing.standard.sixMonths)} / 6 months`],
    ["Contact", <span key="k">{contact.phone} · <a href={`mailto:${contact.email}`} className="underline underline-offset-4">{contact.email}</a></span>],
  ];

  return (
    <div className={`mk min-h-screen ${marketingFonts}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-5 pb-20 pt-14 md:pt-20">
        <p className="text-sm font-medium text-[var(--coral-ink)]">About</p>
        <h1 className="font-display mt-3 text-5xl font-medium leading-[1.05] md:text-6xl">ScanDish, in full.</h1>
        <p className="mt-6 text-xl leading-relaxed text-[var(--ink-2)]">{SUMMARY}</p>

        <dl className="mt-10 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {glance.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-4 py-3.5 sm:grid-cols-[11rem_1fr]">
              <dt className="text-[var(--muted)]">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <Block title="How it works">
          <p>
            Every restaurant gets its own page and a QR code. The code goes on the tables, the counter and the door. A guest points
            their phone camera at it and the menu opens straight away in the browser — there is nothing to install and no account to
            create. The owner signs in to a dashboard to change the menu, prices, photos and details; the page updates on the next scan.
          </p>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <Checklist title="For guests" items={GUEST_FEATURES} />
            <Checklist title="For owners" items={OWNER_FEATURES} />
          </div>
        </Block>

        <Block title="Plans and prices">
          <div className="overflow-hidden rounded-xl border border-[var(--line)]">
            <table className="w-full text-left text-[0.95rem]">
              <thead className="bg-[var(--paper-2)] text-sm text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">RWF</th>
                  <th className="px-4 py-3 font-medium">Standard</th>
                  <th className="px-4 py-3 font-medium">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {(
                  [
                    ["One-time setup", "setupFee"],
                    ["6 months", "sixMonths"],
                    ["1 year", "year"],
                  ] as const
                ).map(([label, key]) => (
                  <tr key={key}>
                    <td className="px-4 py-3 text-[var(--muted)]">{label}</td>
                    <td className="px-4 py-3 font-medium">{pricing.standard[key].toLocaleString("en-US")}</td>
                    <td className="px-4 py-3 font-medium">{pricing.premium[key].toLocaleString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            A new page is live immediately, for a {pricing.trialDays}-day setup period, so the owner can check everything before the
            subscription starts. Subscriptions are paid directly to {BRAND.company} If a subscription ends, the page stays online {GRACE_DAYS} more
            days, then it is hidden until renewal — the menu and settings are kept. Custom systems (bookings, delivery, a fully custom
            website) are quoted on request.
          </p>
        </Block>

        <Block title="Premium">
          <Checklist items={premiumFeatures()} />
          <p>
            Premium pages are designed by the ScanDish team — either with the ScanDish Design Studio or built completely from scratch
            for restaurants that want something entirely their own. While the page is being prepared (up to {PREMIUM_BUILD_DAYS.max}{" "}
            working days), the owner adds their content, which then appears in the new design.
          </p>
        </Block>

        <Block title="Getting started">
          <p>
            A member of the ScanDish support team visits the restaurant, explains how ScanDish works and the Terms of Service, collects
            the business registration details, and creates the account together with the owner. The owner receives a login, chooses
            their own password on first sign-in, and from then on manages the page alone. Help stays one WhatsApp message away.
          </p>
        </Block>

        <Block title="Privacy and security">
          <p>
            Guests stay anonymous: ScanDish counts menu views (how many, when, from which kind of device) but does not collect
            guests&apos; names, numbers or other personal data. Owner accounts are protected by sign-in, all traffic is encrypted, and
            documents such as registration certificates are stored privately. ScanDish does not sell data. The details are in the{" "}
            <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link> and{" "}
            <Link href="/terms" className="underline underline-offset-4">Terms of Service</Link>.
          </p>
        </Block>

        <Block title="The company">
          <p>
            {COMPANY_LINE}{" "}
            {leader.name && (
              <>
                The company is led by <strong className="font-semibold text-[var(--ink)]">{leader.name}</strong>
                {leader.title ? `, ${leader.title}` : ""}.{" "}
              </>
            )}
            {BRAND.company} designs, builds, hosts and monitors ScanDish, and signs the service contract with every restaurant.
          </p>
        </Block>

        <Block title="Frequently asked questions" id="faq">
          <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {list.map((f) => (
              <details key={f.q} className="py-1" open={false}>
                <summary className="py-4 text-lg font-medium">{f.q}</summary>
                <p className="pb-5 leading-relaxed text-[var(--ink-2)]">{f.a}</p>
              </details>
            ))}
          </div>
        </Block>

        <div className="mt-16 flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper-2)] p-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-2xl">Want your menu on ScanDish?</p>
          <div className="flex gap-3">
            <a href={whatsappLink(contact, START_MESSAGE)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-3 font-medium text-[var(--paper)]">
              <FaWhatsapp className="h-5 w-5" /> WhatsApp us
            </a>
            <Link href="/#pricing" className="inline-flex items-center gap-1.5 rounded-full px-4 py-3 font-medium underline underline-offset-4">
              Pricing <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <p className="mt-10 text-sm text-[var(--muted)]">
          Information current as of {asOf}. A plain-text version for AI assistants is at{" "}
          <a href="/llms.txt" className="underline underline-offset-4">scandish.online/llms.txt</a>.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}

function Block({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-16 scroll-mt-20">
      <h2 className="font-display text-3xl font-medium">{title}</h2>
      <div className="mt-5 space-y-5 text-[1.05rem] leading-relaxed text-[var(--ink-2)]">{children}</div>
    </section>
  );
}

function Checklist({ title, items }: { title?: string; items: string[] }) {
  return (
    <div>
      {title && <h3 className="mb-3 font-semibold text-[var(--ink)]">{title}</h3>}
      <ul className="space-y-2.5">
        {items.map((i) => (
          <li key={i} className="flex gap-2.5">
            <Check className="mt-1 h-4 w-4 shrink-0 text-[var(--coral-ink)]" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
