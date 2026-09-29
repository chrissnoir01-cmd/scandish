import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok, FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { BRAND } from "@/lib/brand";
import { contactTelUrl, contactWhatsAppUrl, type ContactInfo } from "@/lib/settings";
import { getContact } from "@/lib/server/settings";

export const whatsappLink = (contact: ContactInfo, text: string) => contactWhatsAppUrl(contact, text);
export const START_MESSAGE = "Hello ScanDish, I'd like a menu page for my restaurant.";

const NAV = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "About", href: "/about" },
  { label: "Owner login", href: "/login" },
];

export function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="ScanDish home">
      <span className={`relative overflow-hidden rounded-lg ${small ? "h-8 w-8" : "h-9 w-9"}`}>
        <Image src="/images/logo.jpg" alt="" fill sizes="36px" className="object-cover" />
      </span>
      {/* Lettering matches the ScanDish logo: bold geometric sans, coral "Scan", dark "Dish". */}
      <span className="font-wordmark text-[1.4rem] font-bold leading-none tracking-[-0.01em]">
        <span className="text-[#f47c5e]">Scan</span>
        <span className="text-[#3b3b3b]">Dish</span>
      </span>
    </Link>
  );
}

export async function SiteHeader() {
  const contact = await getContact();
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5">
        <Wordmark />
        <nav className="hidden items-center gap-8 text-[0.95rem] text-[var(--ink-2)] md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="transition-colors hover:text-[var(--ink)]">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href={whatsappLink(contact, START_MESSAGE)}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--paper)] transition hover:bg-black sm:inline-flex"
          >
            <FaWhatsapp className="h-4 w-4" /> Talk to us
          </a>
          {/* Phone menu without JavaScript */}
          <details className="relative md:hidden">
            <summary className="rounded-full border border-[var(--line)] p-2" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </summary>
            <nav className="absolute right-0 top-12 w-56 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-2 shadow-xl" aria-label="Main">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="block rounded-xl px-4 py-3 text-[var(--ink-2)] hover:bg-[var(--paper-2)]">
                  {n.label}
                </Link>
              ))}
              <a href={whatsappLink(contact, START_MESSAGE)} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3 font-medium text-[var(--paper)]">
                <FaWhatsapp className="h-4 w-4" /> Talk to us
              </a>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const contact = await getContact();
  const social = [
    { href: "https://instagram.com/scandish_app", label: "Instagram", Icon: FaInstagram },
    { href: "https://tiktok.com/@scandish_app", label: "TikTok", Icon: FaTiktok },
    { href: "https://facebook.com/scandish_app", label: "Facebook", Icon: FaFacebook },
    { href: "https://x.com/scandish_app", label: "X", Icon: FaXTwitter },
  ];
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--paper-2)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Wordmark small />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--muted)]">
            QR menu pages for restaurants in Rwanda. Made in Kigali by{" "}
            <a href={BRAND.companyUrl} target="_blank" rel="noreferrer" className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--ink)]">
              {BRAND.company}
            </a>
          </p>
          <div className="mt-5 flex gap-2">
            {social.map(({ href, label, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="rounded-full border border-[var(--line)] p-2 text-[var(--muted)] hover:text-[var(--ink)]">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <FooterCol
          title="Product"
          links={[
            ["How it works", "/#how-it-works"],
            ["Pricing", "/#pricing"],
            ["About ScanDish", "/about"],
            ["Questions", "/about#faq"],
          ]}
        />
        <FooterCol
          title="Accounts"
          links={[
            ["Owner login", "/login"],
            ["Owner sign-up", "/company-signup"],
            ["Support team", "/support/login"],
          ]}
        />
        <FooterCol
          title="Contact"
          links={[
            [contact.phone, contactTelUrl(contact)],
            ["WhatsApp", contactWhatsAppUrl(contact)],
            [contact.email, `mailto:${contact.email}`],
          ]}
        />
      </div>
      <div className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} ScanDish · a product of {BRAND.company}
          </p>
          <p className="flex gap-5">
            <Link href="/terms" className="hover:text-[var(--ink)]">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-[var(--ink)]">
              Privacy
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-2)]">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm text-[var(--muted)]">
        {links.map(([label, href]) => {
          const external = href.startsWith("http");
          return (
            <li key={label}>
              <a href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})} className="inline-flex items-center gap-1 hover:text-[var(--ink)]">
                {label}
                {external && <ArrowUpRight className="h-3 w-3" />}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
