import { NextResponse } from "next/server";
import { logActivity } from "@/lib/server/activity";
import { AuthError, bearerToken, requireUser } from "@/lib/server/auth";
import { fetchPrivateFile } from "@/lib/server/cloudinary";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireSupport } from "@/lib/server/support";

/**
 * GET /api/certificates/:companyId — the business's registration (RDB) certificate.
 * MasterAdmin: any business. Support members: only businesses they onboarded. Every view is logged.
 */
export async function GET(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  try {
    const { companyId } = await params;
    const token = bearerToken(req);
    const user = await requireUser(token);

    const snap = await adminDb().collection("companies").doc(companyId).get();
    if (!snap.exists) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    const company = snap.data()!;

    if (user.admin !== true) {
      const { ref } = await requireSupport(token, { allowSuspended: true });
      if (company.createdByAgentId !== ref.id) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const log = () =>
      logActivity({
        type: "document.viewed",
        message: `${user.email} opened the registration certificate of ${company.companyName}`,
        actor: { uid: user.uid, email: user.email },
        target: { kind: "company", id: companyId, name: company.companyName ?? "" },
      });

    const certificateId = typeof company.certificateId === "string" ? company.certificateId : "";
    if (certificateId) {
      const file = await fetchPrivateFile(certificateId);
      if (!file) return NextResponse.json({ error: "The certificate file could not be loaded" }, { status: 502 });
      await log();
      return new Response(Buffer.from(file.bytes), {
        headers: {
          "Content-Type": file.contentType,
          "Content-Disposition": `inline; filename="certificate-${companyId}.${file.format}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // Certificates uploaded before private storage have a direct link (MasterAdmin uploads only).
    const legacyUrl = typeof company.certificateUrl === "string" ? company.certificateUrl : "";
    if (legacyUrl.startsWith("https://res.cloudinary.com/")) {
      await log();
      return NextResponse.json({ url: legacyUrl }, { headers: { "Cache-Control": "private, no-store" } });
    }
    return NextResponse.json({ error: "No certificate uploaded for this business" }, { status: 404 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    console.error("certificate download failed", err);
    return NextResponse.json({ error: "Could not open the certificate" }, { status: 500 });
  }
}
