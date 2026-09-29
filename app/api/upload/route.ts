import { NextResponse } from "next/server";
import { AuthError, bearerToken, requireUser } from "@/lib/server/auth";
import { logActivity } from "@/lib/server/activity";
import { destroyImages, uploadBuffer } from "@/lib/server/cloudinary";
import { certificateFolder } from "@/lib/server/certificates";

const MB = 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
// Vercel rejects request bodies over 4.5 MB; the browser shrinks photos well below this first.
const MAX_BYTES = 4 * MB;
const MIN_SIDE = 100;

/** What the file really is, from its first bytes — the declared type can be faked. */
function sniff(b: Buffer): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (b.toString("ascii", 0, 6) === "GIF87a" || b.toString("ascii", 0, 6) === "GIF89a") return "image/gif";
  if (b.toString("ascii", 4, 8) === "ftyp" && /^avi[fs]$/.test(b.toString("ascii", 8, 12))) return "image/avif";
  if (b.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

/** Admin-only uploads stored privately (no public URL) — the contract stamp and signature. */
const CONTRACT_PURPOSES = new Set(["contract-stamp", "contract-signature"]);

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

    const isContract = CONTRACT_PURPOSES.has(purpose);
    // Business registration (RDB) certificates: uploaded by MasterAdmin or a support member, never public.
    const isCertificate = purpose === "certificate";
    const isPrivate = isContract || isCertificate;
    if ((isContract && !isAdmin) || (isCertificate && !isAdmin && user.support !== true)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `File is too large (max ${MAX_BYTES / MB} MB)` }, { status: 413 });
    }

    // Judge the file by its contents, not its name or declared type: a real photo saved as
    // ".jpg" but actually PNG is fine; a script or document renamed to ".jpg" is not.
    const buffer = Buffer.from(await file.arrayBuffer());
    const real = sniff(buffer);
    // PDFs only for certificates (stored privately).
    const isPdf = real === "application/pdf";
    if (!real || (isPdf && !isCertificate) || (!isPdf && !IMAGE_TYPES.has(real))) {
      return NextResponse.json(
        {
          error: isCertificate
            ? "Upload the certificate as a PDF or a photo (JPG, PNG, WebP)"
            : "This file isn't a supported image. Use a JPG, PNG, WebP, AVIF or GIF photo.",
        },
        { status: 415 }
      );
    }
    const folder = isCertificate
      ? certificateFolder(user.uid)
      : isContract
        ? "scandish/admin/contract"
        : isAdmin
          ? "scandish/admin"
          : `scandish/${user.uid}`;
    const result = await uploadBuffer(buffer, {
      folder,
      resource_type: "image",
      ...(isPrivate ? { type: "authenticated" as const } : {}),
      // Cap stored size of display images; documents are kept exactly as uploaded.
      transformation: isPdf || isCertificate ? undefined : [{ width: 2400, height: 2400, crop: "limit" }],
    });

    // Tiny images (icons, tracking pixels, broken exports) look bad on a menu — refuse and remove them.
    if (!isPdf && (result.width < MIN_SIDE || result.height < MIN_SIDE)) {
      await destroyImages([result.public_id], isPrivate ? "authenticated" : "upload");
      return NextResponse.json({ error: `Image is too small (at least ${MIN_SIDE}×${MIN_SIDE} pixels)` }, { status: 422 });
    }

    await logActivity({
      type: "restaurant.upload",
      message: `${user.email ?? user.uid} uploaded ${
        isCertificate ? "a business certificate" : isContract ? `a private ${purpose.replace("contract-", "contract ")}` : isPdf ? "a PDF" : "an image"
      } (${Math.round(file.size / 1024)} KB)`,
      actor: { uid: user.uid, email: user.email },
      meta: { bytes: file.size, type: real, ...(isPrivate ? { purpose } : { url: result.secure_url }) },
    });

    // Private assets are referenced by id only; their URL is never handed to a browser.
    // Certificates keep their format in the id so they can be downloaded unchanged.
    if (isCertificate) return NextResponse.json({ id: `${result.public_id}.${result.format}` });
    return NextResponse.json(isPrivate ? { id: result.public_id } : { url: result.secure_url });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    // Cloudinary refuses files it can't read (e.g. a corrupt photo or PDF).
    if ((error as { http_code?: number })?.http_code === 400) {
      return NextResponse.json({ error: "This file is damaged and can't be read. Try another file." }, { status: 415 });
    }
    console.error("Cloudinary upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
