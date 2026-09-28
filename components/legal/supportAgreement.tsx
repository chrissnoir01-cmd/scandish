import Link from "next/link";
import { BRAND, formatRwf } from "@/lib/brand";
import { agentEarning, type Pricing } from "@/lib/settings";
import type { LegalSection } from "./LegalPage";

const email = <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>;

const pct = (n: number) => `${Number(n.toFixed(2))}%`;

/** The Support Team Agreement every support member accepts at signup. Shown publicly and in the portal. */
export const supportAgreementSections = (pricing: Pricing): LegalSection[] => [
  {
    id: "parties",
    title: "The parties and your role",
    body: (
      <>
        <p>
          This Support Team Agreement (&ldquo;Agreement&rdquo;) is between <strong>{BRAND.company}</strong> (&ldquo;Ironic
          Lab&rdquo;), which owns, operates and governs ScanDish, and you, the person accepting it as a member of the
          ScanDish Support Team (&ldquo;Member&rdquo;, &ldquo;you&rdquo;).
        </p>
        <p>
          You act as an <strong>independent partner</strong>. You are not an employee, agent with authority to sign on
          Ironic Lab&apos;s behalf, or partner in Ironic Lab&apos;s business. You decide your own working hours and methods,
          and you are responsible for your own taxes and expenses.
        </p>
      </>
    ),
  },
  {
    id: "duties",
    title: "What you do",
    body: (
      <ul>
        <li><strong>Find new customers</strong> — restaurants, cafés, bars, hotels and similar businesses that can benefit from ScanDish.</li>
        <li><strong>Create their account</strong> through your Support Team Portal, only after the business agrees to join.</li>
        <li><strong>Help them set up</strong> — menu, photos, contact details, branding and QR code — if they want your help.</li>
        <li>
          <strong>Explain the rules honestly</strong> — walk the business through the{" "}
          <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link> before or when they
          join, and answer their questions truthfully.
        </li>
        <li><strong>Show them how ScanDish works</strong> — logging in, updating the menu, publishing changes, printing the QR code and reading their visit statistics.</li>
      </ul>
    ),
  },
  {
    id: "earnings",
    title: "Your earnings",
    body: (
      <>
        <p>
          Your <strong>only</strong> compensation is your share of the one-time <strong>setup fee</strong> paid by each
          business you onboard. You collect the setup fee from the business. At the current prices:
        </p>
        <ul>
          <li>
            <strong>Standard plan</strong> — setup fee {formatRwf(pricing.standard.setupFee)}: you keep{" "}
            <strong>{pct(pricing.standard.agentSharePct)}</strong> ({formatRwf(agentEarning(pricing, "standard"))}).
          </li>
          <li>
            <strong>Premium plan</strong> — setup fee {formatRwf(pricing.premium.setupFee)}: you keep{" "}
            <strong>{pct(pricing.premium.agentSharePct)}</strong> ({formatRwf(agentEarning(pricing, "premium"))}) and pass
            the remaining {formatRwf(pricing.premium.setupFee - agentEarning(pricing, "premium"))} to Ironic Lab.
          </li>
        </ul>
        <p>
          Prices and shares are set by Ironic Lab and may change; your portal always shows the current figures. The
          amounts for each business are fixed at the moment you create it.
        </p>
        <ul>
          <li>Ironic Lab pays you <strong>no salary, commission, bonus or any other amount</strong>.</li>
          <li>Charge only the published setup fee — never more — and give the business a receipt.</li>
          <li>Any part of a setup fee that belongs to Ironic Lab must be handed over within 7 days of collecting it.</li>
          <li>
            Subscription fees (6-month or 1-year plans) belong to Ironic Lab and are paid through ScanDish&apos;s official
            payment channels. You must not collect subscription money unless Ironic Lab authorises it in writing.
          </li>
          <li>
            A business you create is live for a <strong>{pricing.trialDays}-day setup period</strong> so it can check its
            page. It stays online after that only once Ironic Lab confirms its subscription payment.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "conduct",
    title: "Honest conduct",
    body: (
      <>
        <p>You must:</p>
        <ul>
          <li>describe ScanDish, its features and its prices accurately — never promise features, results, discounts or terms that Ironic Lab does not offer;</li>
          <li>create accounts only with the business&apos;s real details and clear agreement, using the manager&apos;s own email address;</li>
          <li>represent ScanDish professionally and respectfully, and use the ScanDish and Ironic Lab names only to promote the Service.</li>
        </ul>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Customer accounts and data",
    body: (
      <ul>
        <li>
          Each business you create receives a <strong>temporary password</strong>. Give it only to that business&apos;s
          manager, in person or privately — never share or post it elsewhere.
        </li>
        <li>The manager must replace it with their own password at first login. From then on the account belongs to the business; you must not try to access it.</li>
        <li>Use customers&apos; information only to onboard and support them on ScanDish — never for other purposes, and never sell or share it.</li>
        <li>Keep your own support team password secret. You are responsible for everything done with your account.</li>
      </ul>
    ),
  },
  {
    id: "monitoring",
    title: "Activity records",
    body: (
      <p>
        To protect customers, Ironic Lab records actions taken in the Support Team Portal — sign-ins, businesses created
        and temporary passwords issued — with the date, time, IP address and device type, as described in the{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    ),
  },
  {
    id: "enforcement",
    title: "Violations, suspension and deactivation",
    body: (
      <>
        <p>If you break this Agreement, Ironic Lab may, depending on how serious the violation is:</p>
        <ul>
          <li>
            <strong>suspend</strong> your account temporarily — you can still sign in to read the reason and this Agreement,
            but you cannot create businesses or issue passwords until the suspension ends or is lifted;
          </li>
          <li><strong>deactivate</strong> your account — you can no longer sign in.</li>
        </ul>
        <p>
          Examples include overcharging or misleading a business, collecting subscription money without authorisation,
          sharing temporary passwords, creating accounts without consent, or misusing customer data. The reason is shown in
          your portal. Businesses you onboarded stay with ScanDish and are not affected. You may ask for a review by writing
          to {email}.
        </p>
      </>
    ),
  },
  {
    id: "ending",
    title: "Ending the Agreement",
    body: (
      <p>
        Either side may end this Agreement at any time. Setup fees you correctly collected before it ended remain yours.
        After it ends you must stop presenting yourself as part of the ScanDish Support Team.
      </p>
    ),
  },
  {
    id: "general",
    title: "General",
    body: (
      <>
        <p>
          This Agreement is governed by the laws of the Republic of Rwanda, and the competent courts of Kigali have
          jurisdiction. Ironic Lab may update it; material changes will be shown in your portal before they take effect, and
          continuing to use the portal after that means you accept them.
        </p>
        <p>
          Contact: {BRAND.company} — ScanDish · {email} · {BRAND.supportPhone}
        </p>
      </>
    ),
  },
];
