import "server-only";
import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function uploadBuffer(buffer: Buffer, options: UploadApiOptions): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(options, (err, res) => (err || !res ? reject(err) : resolve(res)))
      .end(buffer);
  });
}

/**
 * Downloads a privately stored ("authenticated") image as PNG bytes via a short-lived signed URL.
 * Used for the company stamp and signature, which must never have a public URL.
 */
export async function fetchPrivatePng(publicId: string): Promise<Uint8Array | null> {
  if (!publicId) return null;
  const url = cloudinary.url(publicId, {
    type: "authenticated",
    sign_url: true,
    secure: true,
    resource_type: "image",
    format: "png",
  });
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return new Uint8Array(await res.arrayBuffer());
}
