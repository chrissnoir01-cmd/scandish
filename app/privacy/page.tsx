import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";
import { BRAND } from "@/lib/brand";
import type { ContactInfo } from "@/lib/settings";
import { getContact } from "@/lib/server/settings";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Ironic Lab Inc. collects, uses and protects information in ScanDish.",
  alternates: { canonical: "/privacy" },
};

/** Built per render so the contact details are always the current ones (MasterAdmin → Settings). */
const buildSections = (contact: ContactInfo): LegalSection[] => {
  const email = <a href={`mailto:${contact.email}`}>{contact.email}</a>;
  return [
  {
    id: "controller",
    title: "Who is responsible",
    body: (
      <p>
        ScanDish is owned, operated and governed by <strong>{BRAND.company}</strong> (&ldquo;Ironic Lab&rdquo;,
        &ldquo;we&rdquo;). Ironic Lab is responsible for the personal data described in this policy. Contact us at {email}.
      </p>
    ),
  },
  {
    id: "customers",
    title: "Information about business customers",
    body: (
      <>
        <p>When your business uses ScanDish we collect:</p>
        <ul>
          <li><strong>Account details</strong> — login email and, through our sign-in provider, a securely hashed password (we never see or store your password in readable form).</li>
          <li><strong>Business details</strong> — company name, manager name, phone number, email, location, and business registration number or certificate you provide.</li>
          <li><strong>Page content</strong> — everything you publish: names, menus, prices, photos, logos, offers, contact and social links.</li>
          <li>
            <strong>Security and activity records</strong> — sign-ins, failed sign-in attempts, published changes, uploads
            and administrative actions, with the date and time, IP address and device/browser type.
          </li>
          <li><strong>Subscription records</strong> — plan, start and end dates, and renewal history.</li>
        </ul>
      </>
    ),
  },
  {
    id: "visitors",
    title: "Information about menu visitors",
    body: (
      <>
        <p>People who scan a QR code or open a menu page do not create an account. To give businesses useful statistics we record only:</p>
        <ul>
          <li>anonymous counts of page views per day and hour;</li>
          <li>the type of device (mobile, tablet or desktop) and how the visit started (QR code, direct or shared link);</li>
          <li>
            a small note stored on the visitor&apos;s own device (browser local storage) saying the page was already seen
            that day, so repeat visits are not counted twice. It contains no personal information.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> store visitors&apos; names, contact details or IP addresses with these statistics, and
          we do not use advertising cookies. An IP address is used briefly to stop the same device inflating counts and is
          then discarded. Maps on menu pages are provided by Google Maps, which may set its own cookies under Google&apos;s
          privacy policy.
        </p>
        <p>
          <strong>Table orders.</strong> On menus where the restaurant accepts orders, a guest who sends an order gives
          the dishes chosen, a table number and/or a phone number, and an optional note. These go only to that restaurant
          so it can prepare and deliver the order (and call the guest if needed). Orders, including the phone number, are
          deleted automatically after 30 days. Payment is made at the restaurant; ScanDish does not handle it.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use information",
    body: (
      <ul>
        <li>to create and run your account and publish your menu page;</li>
        <li>to show you visit statistics for your page;</li>
        <li>to manage subscriptions and contact you about your account, renewals and important changes;</li>
        <li>to keep ScanDish secure — detecting suspicious sign-ins, abuse and fraud — and to investigate problems;</li>
        <li>to improve the Service, using aggregated information where possible;</li>
        <li>to meet legal and accounting obligations.</li>
      </ul>
    ),
  },
  {
    id: "legal-basis",
    title: "Legal basis",
    body: (
      <p>
        We process personal data in line with applicable data-protection law, including Rwanda&apos;s Law N° 058/2021 of
        13/10/2021 relating to the protection of personal data and privacy. We rely on the performance of our contract with
        you, our legitimate interest in running a secure and reliable service, compliance with legal obligations and, where
        required, your consent.
      </p>
    ),
  },
  {
    id: "sharing",
    title: "Who we share it with",
    body: (
      <>
        <p>We do not sell personal data. We share it only with service providers that process it on our behalf, under contract:</p>
        <ul>
          <li><strong>Google Firebase</strong> — sign-in and database;</li>
          <li><strong>Cloudinary</strong> — storing and optimising images you upload;</li>
          <li><strong>Vercel</strong> — hosting and delivering the website;</li>
          <li><strong>Google Maps</strong> — maps and directions on menu pages.</li>
        </ul>
        <p>
          Your page content is public by design — anyone with your link or QR code can see it. We may also disclose
          information when required by law or to protect the rights and safety of our users and the Service.
        </p>
      </>
    ),
  },
  {
    id: "transfers",
    title: "International transfers",
    body: (
      <p>
        Our providers may store data on servers outside Rwanda. When they do, we rely on providers with recognised
        security and data-protection commitments and take reasonable steps so your data receives an adequate level of
        protection.
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <ul>
        <li>Account, business details and page content — for as long as your account is active, and up to 90 days after it ends so it can be restored or exported.</li>
        <li>Security and activity records — 12 months.</li>
        <li>Anonymous visit statistics — for as long as your account is active.</li>
        <li>Invoices and subscription records — as long as tax and accounting law requires.</li>
      </ul>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        We protect data with encrypted connections (HTTPS), access controls that let each business reach only its own data,
        server-side permission checks, restricted administrator access and regular backups. No system is perfectly secure;
        if a breach affects your personal data we will notify you and the authorities as the law requires.
      </p>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>
          You may ask to access, correct, delete or receive a copy of your personal data, object to or restrict certain
          processing, and withdraw consent where we rely on it. Most details can be updated directly in your dashboard; for
          anything else contact {email}. We reply within 30 days.
        </p>
        <p>
          If you are not satisfied with our answer, you may complain to Rwanda&apos;s data-protection supervisory authority,
          the National Cyber Security Authority (NCSA).
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: <p>ScanDish accounts are for businesses and are not intended for children. Menu pages do not knowingly collect personal data from anyone.</p>,
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy. For material changes we will notify customers by email or in the dashboard before they
        take effect. The date at the top shows the latest version. See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        {BRAND.company} — ScanDish · Kigali, Rwanda · {email} · {contact.phone} ·{" "}
        <a href={BRAND.companyUrl} target="_blank" rel="noreferrer">
          ironiclab.site
        </a>
      </p>
    ),
  },
];
};

export default async function PrivacyPage() {
  const contact = await getContact();
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          This policy explains what information ScanDish collects, why, and the choices you have. ScanDish is owned, operated
          and governed by <strong>{BRAND.company}</strong>. In short: businesses give us what they need to publish their
          menu; menu visitors stay anonymous; we never sell data.
        </p>
      }
      sections={buildSections(contact)}
    />
  );
}
