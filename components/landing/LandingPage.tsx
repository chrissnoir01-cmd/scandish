import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Minus, Plus } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { BRAND } from "@/lib/brand";
import { contactTelUrl, type ContactInfo } from "@/lib/settings";
import { marketingFonts } from "@/lib/fonts";
import { PREMIUM_BUILD_DAYS } from "@/lib/premium";
import { GUEST_FEATURES, OWNER_FEATURES, faqs, type FactsInput } from "@/lib/scandish-facts";
import type { ShowcaseRestaurant } from "@/lib/server/showcase";
import HeroVisual from "./HeroVisual";
import LogoMarquee from "./LogoMarquee";
import { SiteFooter, SiteHeader, START_MESSAGE, whatsappLink } from "./SiteChrome";
import "./marketing.css";

const n = (v: number) => v.toLocaleString("en-US");

export default function LandingPage({
  facts,
  restaurants,
  exampleUrl,
}: {
  facts: FactsInput;
  restaurants: ShowcaseRestaurant[];
  exampleUrl: string;
}) {
  const { pricing, leader, liveCount, contact } = facts;

  return (
    <div className={`mk min-h-screen ${marketingFonts}`}>
      <SiteHeader />

      <main>
        {/* ---------- Hero ---------- */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-12 md:grid-cols-[1.05fr_1fr] md:pb-24 md:pt-20">
          <div>
            <p className="rise text-sm font-medium text-[var(--coral-ink)]">QR menus for restaurants in Rwanda</p>
            <h1 className="rise rise-2 font-display mt-4 text-[2.9rem] font-medium leading-[1.02] sm:text-6xl md:text-[4.4rem]">
              Your menu, open on every table.
            </h1>
            <p className="rise rise-3 mt-6 max-w-lg text-lg leading-relaxed text-[var(--ink-2)]">
              Guests scan the code on the table and see your dishes, photos and prices in RWF — no app, no PDF that won&apos;t
              zoom. Change a price from your phone and it&apos;s live on the next scan.
            </p>
            <div className="rise rise-3 mt-8 flex flex-wrap items-center gap-3">
              <a
                href={whatsappLink(contact, START_MESSAGE)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-6 py-3.5 font-medium text-[var(--paper)] transition hover:bg-black"
              >
                <FaWhatsapp className="h-5 w-5" /> Get your menu page
              </a>
              {exampleUrl && (
                <a href={exampleUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-4 py-3.5 font-medium text-[var(--ink)] underline decoration-[var(--line)] decoration-2 underline-offset-[6px] hover:decoration-[var(--coral)]">
                  See a live menu <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-[var(--line)] pt-6 text-sm">
              <Fact label="Setup from" value={`${n(pricing.standard.setupFee)} RWF`} />
              <Fact label="Live" value={`${pricing.trialDays}-day setup period`} />
              <Fact label="Made in" value="Kigali" />
            </dl>
          </div>
          <HeroVisual />
        </section>

        <LogoMarquee restaurants={restaurants} liveCount={liveCount} />

        {/* ---------- How it works ---------- */}
        <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 md:py-28">
          <SectionTitle kicker="How it works" title="Three steps, and your guests are reading your menu." />
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              ["We set you up", "A ScanDish team member comes by, takes your menu and photos, and builds your page with you. You get your own login."],
              ["Print your QR code", "Download it from your dashboard and put it on every table, at the counter and on the door. One code, never reprinted."],
              ["Update whenever you like", "Sold out, new dish, new price? Change it on your phone. Guests see it on their next scan."],
            ].map(([t, d], i) => (
              <li key={t} className="border-t-2 border-[var(--ink)] pt-5">
                <span className="font-display text-5xl font-light text-[var(--coral-ink)]">{i + 1}</span>
                <h3 className="mt-3 text-xl font-semibold">{t}</h3>
                <p className="mt-2 leading-relaxed text-[var(--ink-2)]">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- Guests / owners ---------- */}
        <section className="bg-[var(--ink)] text-[var(--paper)]">
          <div className="mx-auto grid max-w-6xl gap-14 px-5 py-20 md:grid-cols-2 md:py-28">
            <FeatureList
              kicker="For your guests"
              title="A menu that works on any phone."
              items={GUEST_FEATURES}
            />
            <FeatureList
              kicker="For you"
              title="Run it from your phone."
              items={OWNER_FEATURES}
            />
          </div>
        </section>

        {/* ---------- Premium ---------- */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:py-28">
          <div>
            <SectionTitle kicker="Premium" title="A page designed only for your restaurant." />
            <p className="mt-5 max-w-md leading-relaxed text-[var(--ink-2)]">
              Our team designs a page around your place — its colours, its mood, its food — and publishes it within{" "}
              {PREMIUM_BUILD_DAYS.min}–{PREMIUM_BUILD_DAYS.max} working days. It lives at its own address, easy to say out loud and
              easy to find on Google.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white p-3 shadow-[0_30px_60px_-40px_rgba(29,23,18,0.5)]">
            <div className="flex items-center gap-2 rounded-lg bg-[var(--paper-2)] px-3 py-2 text-sm">
              <span className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#e4d9cc]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e4d9cc]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e4d9cc]" />
              </span>
              <span className="ml-2 truncate font-mono text-[13px] text-[var(--ink-2)]">
                <span className="text-[var(--coral-ink)]">yourrestaurant</span>.scandish.online
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {["/images/food2.jpg", "/images/fries.jpg", "/images/juice.jpg"].map((src) => (
                <img key={src} src={src} alt="" loading="lazy" className="aspect-[4/5] w-full rounded-lg object-cover" />
              ))}
            </div>
            <p className="font-display px-1 pb-1 pt-4 text-2xl">Your name, your style.</p>
          </div>
        </section>

        {/* ---------- Pricing ---------- */}
        <section id="pricing" className="scroll-mt-20 border-t border-[var(--line)] bg-[var(--paper-2)]">
          <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
            <SectionTitle kicker="Pricing" title="Clear prices, in Rwandan francs." />
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              <Plan
                contact={contact}
                name="Standard"
                line="A professional menu page in the ScanDish design."
                p={pricing.standard}
                items={["Full menu with photos and prices", "Offers, gallery and your story", "WhatsApp, call and directions buttons", "Your colours and logo", "Menu views and busy hours", "Printable QR code"]}
              />
              <Plan
                contact={contact}
                name="Premium"
                line="Everything in Standard, designed only for you."
                p={pricing.premium}
                featured
                items={[
                  `Unique design, ready in ${PREMIUM_BUILD_DAYS.min}–${PREMIUM_BUILD_DAYS.max} working days`,
                  "Your own address: yourname.scandish.online",
                  "Priority support",
                  "Everything in Standard",
                ]}
              />
            </div>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
              Your page goes live as soon as it&apos;s created, with a {pricing.trialDays}-day setup period to check everything before the
              subscription starts. Need bookings, delivery or a fully custom system?{" "}
              <a href={whatsappLink(contact, "Hello ScanDish, I'd like to talk about a custom system.")} target="_blank" rel="noreferrer" className="font-medium text-[var(--ink)] underline underline-offset-4">
                Let&apos;s talk
              </a>
              .
            </p>
          </div>
        </section>

        {/* ---------- Company ---------- */}
        <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
          <div className="grid gap-10 md:grid-cols-[1fr_1.2fr]">
            <SectionTitle kicker="Who we are" title="Built in Kigali, for the way people eat here." />
            <div className="space-y-5 text-lg leading-relaxed text-[var(--ink-2)]">
              <p>
                Paper menus get stained and go out of date. PDFs are slow to open and impossible to read on a small screen. ScanDish
                replaces both with a page that loads fast on any phone and that the owner controls completely.
              </p>
              <p>
                ScanDish is made by {BRAND.company}
                {leader.name ? (
                  <>
                    , led by <span className="font-medium text-[var(--ink)]">{leader.name}</span>
                    {leader.title ? `, ${leader.title}` : ""}
                  </>
                ) : null}
                {/* "Inc." already ends the sentence when no leader is named. */}
                {leader.name ? ". " : " "}We onboard every restaurant in person and stay reachable on WhatsApp.
              </p>
              <Link href="/about" className="inline-flex items-center gap-1.5 font-medium text-[var(--ink)] underline decoration-[var(--line)] decoration-2 underline-offset-[6px] hover:decoration-[var(--coral)]">
                Everything about ScanDish <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section id="faq" className="scroll-mt-20 border-t border-[var(--line)]">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[1fr_1.6fr] md:py-28">
            <SectionTitle kicker="Questions" title="What owners usually ask." />
            <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {faqs(facts)
                .slice(1, 8)
                .map((f) => (
                  <details key={f.q} className="group py-1">
                    <summary className="flex items-center justify-between gap-4 py-4 text-lg font-medium">
                      {f.q}
                      <Plus className="h-5 w-5 shrink-0 text-[var(--muted)] group-open:hidden" />
                      <Minus className="hidden h-5 w-5 shrink-0 text-[var(--muted)] group-open:block" />
                    </summary>
                    <p className="pb-5 pr-8 leading-relaxed text-[var(--ink-2)]">{f.a}</p>
                  </details>
                ))}
            </div>
          </div>
        </section>

        {/* ---------- Contact ---------- */}
        <section className="px-5 pb-20">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-3xl bg-[var(--coral)] px-7 py-12 text-[var(--ink)] md:flex-row md:items-end md:px-12 md:py-14">
            <div>
              <h2 className="font-display max-w-xl text-4xl font-medium leading-tight md:text-5xl">Want your menu on ScanDish?</h2>
              <p className="mt-3 max-w-md text-[var(--ink)]/80">
                Send us a message. We&apos;ll come to your restaurant and set everything up with you.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href={whatsappLink(contact, START_MESSAGE)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-6 py-3.5 font-medium text-[var(--paper)] hover:bg-black">
                <FaWhatsapp className="h-5 w-5" /> WhatsApp us
              </a>
              <a href={contactTelUrl(contact)} className="inline-flex items-center justify-center rounded-full border-2 border-[var(--ink)] px-6 py-3 font-medium">
                Call {contact.phone}
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

export function SectionTitle({ kicker, title, light = false }: { kicker: string; title: string; light?: boolean }) {
  return (
    <div>
      <p className={`text-sm font-medium ${light ? "text-[var(--coral)]" : "text-[var(--coral-ink)]"}`}>{kicker}</p>
      <h2 className="font-display mt-3 max-w-xl text-4xl font-medium leading-[1.08] md:text-5xl">{title}</h2>
    </div>
  );
}

function FeatureList({ kicker, title, items }: { kicker: string; title: string; items: string[] }) {
  return (
    <div>
      <SectionTitle kicker={kicker} title={title} light />
      <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
        {items.map((i) => (
          <li key={i} className="flex gap-3 py-3.5 leading-relaxed text-[var(--paper)]/85">
            <Check className="mt-1 h-4 w-4 shrink-0 text-[var(--coral)]" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Plan({
  contact,
  name,
  line,
  p,
  items,
  featured = false,
}: {
  contact: ContactInfo;
  name: string;
  line: string;
  p: { setupFee: number; sixMonths: number; year: number };
  items: string[];
  featured?: boolean;
}) {
  return (
    <div className={`flex flex-col rounded-2xl p-7 md:p-9 ${featured ? "bg-[var(--ink)] text-[var(--paper)]" : "border border-[var(--line)] bg-[var(--paper)]"}`}>
      <h3 className="font-display text-3xl font-medium">{name}</h3>
      <p className={`mt-1 ${featured ? "text-[var(--paper)]/70" : "text-[var(--muted)]"}`}>{line}</p>
      <dl className={`mt-7 space-y-3 border-y py-5 ${featured ? "border-white/15" : "border-[var(--line)]"}`}>
        {(
          [
            ["One-time setup", p.setupFee],
            ["6 months", p.sixMonths],
            ["1 year", p.year],
          ] as const
        ).map(([label, v]) => (
          <div key={label} className="flex items-baseline justify-between gap-4">
            <dt className={featured ? "text-[var(--paper)]/70" : "text-[var(--muted)]"}>{label}</dt>
            <dd>
              <span className="font-display text-2xl font-medium">{n(v)}</span> <span className="text-sm">RWF</span>
            </dd>
          </div>
        ))}
      </dl>
      <ul className="mt-6 flex-1 space-y-2.5">
        {items.map((i) => (
          <li key={i} className="flex gap-2.5">
            <Check className={`mt-1 h-4 w-4 shrink-0 ${featured ? "text-[var(--coral)]" : "text-[var(--coral-ink)]"}`} />
            {i}
          </li>
        ))}
      </ul>
      <a
        href={whatsappLink(contact, `Hello ScanDish, I'm interested in the ${name} plan.`)}
        target="_blank"
        rel="noreferrer"
        className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 font-medium ${
          featured ? "bg-[var(--coral)] text-[var(--ink)]" : "bg-[var(--ink)] text-[var(--paper)]"
        }`}
      >
        Choose {name} <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
