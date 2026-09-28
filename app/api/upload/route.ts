import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { NextResponse } from "next/server";
import { AuthError, bearerToken, requireUser } from "@/lib/server/auth";
import { logActivity } from "@/lib/server/activity";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MB = 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const MAX_IMAGE = 8 * MB;
const MAX_PDF = 10 * MB;

export async function POST(req: Request) {
  try {
    const user = await requireUser(bearerToken(req));
    const isAdmin = user.admin === true;

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Only the admin uploads PDFs (company certificates).
    const isPdf = file.type === "application/pdf" && isAdmin;
    if (!IMAGE_TYPES.has(file.type) && !isPdf) {
      return NextResponse.json({ error: "Only JPG, PNG, WebP, AVIF or GIF images are allowed" }, { status: 415 });
    }
    if (file.size > (isPdf ? MAX_PDF : MAX_IMAGE)) {
      return NextResponse.json({ error: `File is too large (max ${isPdf ? 10 : 8} MB)` }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: isAdmin ? "scandish/admin" : `scandish/${user.uid}`,
            resource_type: "image",
            // Cap stored size; public pages request smaller variants anyway.
            transformation: isPdf ? undefined : [{ width: 2400, height: 2400, crop: "limit" }],
          },
          (err, res) => (err || !res ? reject(err) : resolve(res))
        )
        .end(buffer);
    });

    await logActivity({
      type: "restaurant.upload",
      message: `${user.email ?? user.uid} uploaded ${isPdf ? "a PDF" : "an image"} (${Math.round(file.size / 1024)} KB)`,
      actor: { uid: user.uid, email: user.email },
      meta: { bytes: file.size, type: file.type, url: result.secure_url },
    });
    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Cloudinary upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
