import { NextResponse } from "next/server";
import { AuthError, bearerToken, requireUser } from "@/lib/server/auth";
import { logActivity } from "@/lib/server/activity";
import { uploadBuffer } from "@/lib/server/cloudinary";

const MB = 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const MAX_IMAGE = 8 * MB;
const MAX_PDF = 10 * MB;

/** Admin-only uploads stored privately (no public URL) — the contract stamp and signature. */
const PRIVATE_PURPOSES = new Set(["contract-stamp", "contract-signature"]);

export async function POST(req: Request) {
  try {
    const user = await requireUser(bearerToken(req));
    const isAdmin = user.admin === true;

    const formData = await req.formData();
    const file = formData.get("file");
    const purpose = String(formData.get("purpose") ?? "");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const isPrivate = PRIVATE_PURPOSES.has(purpose);
    if (isPrivate && !isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Only the admin uploads PDFs (company certificates).
    const isPdf = file.type === "application/pdf" && isAdmin && !isPrivate;
    if (!IMAGE_TYPES.has(file.type) && !isPdf) {
      return NextResponse.json({ error: "Only JPG, PNG, WebP, AVIF or GIF images are allowed" }, { status: 415 });
    }
    if (file.size > (isPdf ? MAX_PDF : MAX_IMAGE)) {
      return NextResponse.json({ error: `File is too large (max ${isPdf ? 10 : 8} MB)` }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadBuffer(buffer, {
      folder: isPrivate ? "scandish/admin/contract" : isAdmin ? "scandish/admin" : `scandish/${user.uid}`,
      resource_type: "image",
      ...(isPrivate ? { type: "authenticated" as const } : {}),
      // Cap stored size; public pages request smaller variants anyway.
      transformation: isPdf ? undefined : [{ width: 2400, height: 2400, crop: "limit" }],
    });

    await logActivity({
      type: "restaurant.upload",
      message: `${user.email ?? user.uid} uploaded ${isPrivate ? `a private ${purpose.replace("contract-", "contract ")}` : isPdf ? "a PDF" : "an image"} (${Math.round(file.size / 1024)} KB)`,
      actor: { uid: user.uid, email: user.email },
      meta: { bytes: file.size, type: file.type, ...(isPrivate ? { purpose } : { url: result.secure_url }) },
    });

    // Private assets are referenced by id only; their URL is never handed to a browser.
    return NextResponse.json(isPrivate ? { id: result.public_id } : { url: result.secure_url });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Cloudinary upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
