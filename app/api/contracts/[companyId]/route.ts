import { NextResponse } from "next/server";
import { logActivity } from "@/lib/server/activity";
import { AuthError, bearerToken, requireUser } from "@/lib/server/auth";
import { renderContract } from "@/lib/server/contracts";
import { adminDb } from "@/lib/server/firebase-admin";
import { getContractTemplate, getPricingFresh } from "@/lib/server/settings";
import { requireSupport } from "@/lib/server/support";

/** Sample business used when MasterAdmin previews the template. */
const PREVIEW_COMPANY = {
  companyName: "Sample Restaurant Ltd",
  businessType: "Restaurant",
  certificateNumber: "100000000",
  managerName: "Jane Uwase",
  email: "manager@example.rw",
  phone: "0788 000 000",
  location: "KN 4 Ave, Kigali",
  plan: "premium",
  createdByAgentName: "Support Member Name",
  createdAt: new Date().toISOString(),
};

/**
 * GET /api/contracts/:companyId — the service contract PDF for a business.
 * Support members: only businesses they onboarded. MasterAdmin: any business, or "preview".
 */
export async function GET(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  try {
    const { companyId } = await params;
    const token = bearerToken(req);
    const user = await requireUser(token);
    const isAdmin = user.admin === true;

    const [template, pricing] = await Promise.all([getContractTemplate(), getPricingFresh()]);

    if (companyId === "preview") {
      if (!isAdmin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      const { pdf } = await renderContract({ companyId: "PREVIEW0", company: PREVIEW_COMPANY, slug: "sample-restaurant", template, pricing });
      return pdfResponse(pdf, "ScanDish-contract-preview.pdf");
    }

    const db = adminDb();
    const snap = await db.collection("companies").doc(companyId).get();
    if (!snap.exists) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    const company = snap.data()!;

    if (!isAdmin) {
      // Suspended or deactivated members cannot generate contracts.
      const { ref } = await requireSupport(token);
      if (company.createdByAgentId !== ref.id) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const ownerUid = company.ownerUid;
    const restaurant = ownerUid ? await db.collection("restaurants").doc(ownerUid).get() : null;
    const slug = restaurant?.get("slug") || company.slug || "";

    const { pdf, number } = await renderContract({ companyId, company, slug, template, pricing });
    await snap.ref.update({ contractNumber: number, contractGeneratedAt: new Date().toISOString() });
    await logActivity({
      type: "contract.generated",
      message: `${user.email} generated service contract ${number} for ${company.companyName}`,
      actor: { uid: user.uid, email: user.email },
      target: { kind: "company", id: companyId, name: company.companyName ?? "" },
      meta: { contractNumber: number, templateVersion: template.updatedAt || "default" },
    });

    return pdfResponse(pdf, `ScanDish-contract-${number}.pdf`);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    console.error("contract generation failed", err);
    return NextResponse.json({ error: "Could not generate the contract" }, { status: 500 });
  }
}

function pdfResponse(pdf: Uint8Array, filename: string) {
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
