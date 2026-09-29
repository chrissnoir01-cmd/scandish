import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { supportAgreementSections } from "@/components/legal/supportAgreement";
import { BRAND } from "@/lib/brand";
import { getContact, getPricing } from "@/lib/server/settings";

export const metadata: Metadata = {
  title: "Support Team Agreement",
  description: "The agreement between Ironic Lab Inc. and members of the ScanDish Support Team.",
  robots: { index: false },
};

export const revalidate = 3600;

export default async function SupportAgreementPage() {
  const [pricing, contact] = await Promise.all([getPricing(), getContact()]);
  return (
    <LegalPage
      title="Support Team Agreement"
      intro={
        <p>
          This Agreement applies to members of the ScanDish Support Team — independent partners who find new businesses,
          create their accounts and help them get started. It is set by <strong>{BRAND.company}</strong>, which owns and
          governs ScanDish. Every member accepts it when creating their portal password.
        </p>
      }
      sections={supportAgreementSections(pricing, contact)}
    />
  );
}
