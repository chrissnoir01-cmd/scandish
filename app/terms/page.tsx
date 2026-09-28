import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";
import { BRAND } from "@/lib/brand";
import { GRACE_DAYS } from "@/lib/subscription";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern the use of ScanDish, a service of Ironic Lab Inc.",
  alternates: { canonical: "/terms" },
};

const email = <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>;

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Who we are and this agreement",
    body: (
      <>
        <p>
          ScanDish (the &ldquo;Service&rdquo;) is owned, operated and governed by <strong>{BRAND.company}</strong>{" "}
          (&ldquo;Ironic Lab&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). These Terms of Service (&ldquo;Terms&rdquo;) are a
          binding agreement between Ironic Lab and the business that uses ScanDish (&ldquo;you&rdquo;, the
          &ldquo;Customer&rdquo;).
        </p>
        <p>
          By creating an account, accessing the dashboard, or allowing your menu page to be published, you confirm that you
          have authority to accept these Terms on behalf of your business and that you accept them, together with our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: "service",
    title: "The Service",
    body: (
      <>
        <p>ScanDish lets restaurants and hospitality businesses publish a digital menu page reached by QR code or link. It includes:</p>
        <ul>
          <li>a public page for your business (menu, photos, offers, contact links, location and directions);</li>
          <li>a dashboard to manage that content, download QR codes and view anonymous visit statistics;</li>
          <li>optional premium page designs, depending on your plan.</li>
        </ul>
        <p>
          Your guests (&ldquo;Visitors&rdquo;) do not need an account to view your page. Features may evolve over time; we
          will not materially reduce the core features of a plan you have already paid for during that paid period.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and security",
    body: (
      <ul>
        <li>Accounts are created by invitation from ScanDish. You must give accurate business and contact information and keep it up to date.</li>
        <li>You are responsible for keeping your password confidential and for all activity under your account.</li>
        <li>Tell us immediately at {email} if you suspect unauthorised access.</li>
        <li>For security, we record sign-ins and important account actions (such as publishing changes), as described in the Privacy Policy.</li>
      </ul>
    ),
  },
  {
    id: "fees",
    title: "Plans, fees and renewal",
    body: (
      <>
        <ul>
          <li>
            Fees are the one-time setup fee and the subscription fee for the plan and period you choose (for example 6 or 12
            months), as shown on our <Link href="/#pricing">pricing page</Link> or agreed with you in writing. Prices are in
            Rwandan francs (RWF) and include or exclude taxes as stated at the time of purchase.
          </li>
          <li>Subscriptions are paid in advance and are renewed by agreement with ScanDish before the end date shown in your dashboard.</li>
          <li>
            If a subscription is not renewed, your public page stays online for a grace period of {GRACE_DAYS} days after the
            end date and is then taken offline. Your content is kept so the page can be restored on renewal (see
            &ldquo;Termination&rdquo; for how long).
          </li>
          <li>
            Except where the law requires otherwise or we agree in writing, fees already paid are not refundable, including
            for partial periods.
          </li>
          <li>We may change prices for future periods by giving you at least 30 days&apos; notice. Changes never affect a period you have already paid for.</li>
        </ul>
      </>
    ),
  },
  {
    id: "content",
    title: "Your content",
    body: (
      <>
        <p>
          You keep ownership of everything you add to ScanDish — names, menu items, prices, descriptions, logos and photos
          (&ldquo;Customer Content&rdquo;). You give Ironic Lab a non-exclusive, worldwide, royalty-free licence to host,
          store, resize, display and transmit Customer Content only as needed to run and improve the Service for you, and
          to show your public page to Visitors.
        </p>
        <p>You are responsible for your Customer Content, and you confirm that:</p>
        <ul>
          <li>it is accurate — including prices, availability and any allergen or dietary information you publish;</li>
          <li>you own it or have permission to use it (for example, rights to the photos you upload);</li>
          <li>it does not break any law or anyone else&apos;s rights.</li>
        </ul>
        <p>We may remove content that clearly breaks these Terms or the law, and will tell you when we do.</p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>You must not use ScanDish to:</p>
        <ul>
          <li>publish content that is unlawful, misleading, hateful, sexually explicit, or that infringes others&apos; rights;</li>
          <li>upload malware, or attempt to probe, disrupt, overload or gain unauthorised access to the Service or other accounts;</li>
          <li>inflate visit statistics artificially, or scrape or resell the Service;</li>
          <li>impersonate another business or person.</li>
        </ul>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and support",
    body: (
      <p>
        We work to keep ScanDish available and fast, but we do not guarantee uninterrupted or error-free operation.
        Planned maintenance, outages of third-party providers and events outside our reasonable control may cause
        interruptions. Support is available through {email} and WhatsApp at {BRAND.supportPhone}.
      </p>
    ),
  },
  {
    id: "third-parties",
    title: "Third-party services",
    body: (
      <p>
        ScanDish relies on trusted providers — including Google Firebase (sign-in and database), Cloudinary (image
        storage), Vercel (hosting) and Google Maps (maps and directions). Links to WhatsApp, social networks or your
        website take Visitors to services governed by their own terms.
      </p>
    ),
  },
  {
    id: "ip",
    title: "Our intellectual property",
    body: (
      <p>
        The ScanDish software, page designs and templates, name and logo belong to {BRAND.company} or its licensors. These
        Terms give you a limited, non-transferable right to use the Service during your subscription; they do not transfer
        any ownership to you.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    body: (
      <ul>
        <li>You may stop using ScanDish at any time by contacting us. Fees already paid are handled under &ldquo;Plans, fees and renewal&rdquo;.</li>
        <li>We may suspend or close an account for non-payment, or for a serious or repeated breach of these Terms, normally after giving notice and a chance to fix it.</li>
        <li>After an account ends, you may ask for a copy of your Customer Content within 90 days. After that period we may delete it, except where the law requires us to keep certain records.</li>
      </ul>
    ),
  },
  {
    id: "liability",
    title: "Disclaimers and limitation of liability",
    body: (
      <>
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent the law allows, Ironic
          Lab is not liable for indirect or consequential losses, such as lost profits, lost revenue or lost data, and our
          total liability for any claim relating to the Service is limited to the fees you paid us in the 12 months before
          the event that caused the claim.
        </p>
        <p>Nothing in these Terms limits liability that cannot be limited by law.</p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    body: (
      <p>
        You agree to compensate Ironic Lab for reasonable losses and costs arising from third-party claims caused by your
        Customer Content or your breach of these Terms.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law and disputes",
    body: (
      <p>
        These Terms are governed by the laws of the Republic of Rwanda. We will first try to resolve any dispute with you
        in good faith; if that fails within 30 days, the competent courts of Kigali, Rwanda, will have jurisdiction.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    body: (
      <p>
        We may update these Terms. For material changes we will give at least 30 days&apos; notice by email or in your
        dashboard. Continuing to use ScanDish after the changes take effect means you accept them.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        {BRAND.company} — ScanDish · Kigali, Rwanda · {email} · {BRAND.supportPhone} ·{" "}
        <a href={BRAND.companyUrl} target="_blank" rel="noreferrer">
          ironiclab.site
        </a>
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          These Terms explain how businesses may use ScanDish, a digital QR menu platform owned, operated and governed by{" "}
          <strong>{BRAND.company}</strong>. Please read them carefully — they include important information about fees,
          your content and our responsibilities.
        </p>
      }
      sections={sections}
    />
  );
}
