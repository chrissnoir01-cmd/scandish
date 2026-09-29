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

/**
 * The public_id behind one of our delivery URLs, or null for anything else.
 * https://res.cloudinary.com/<cloud>/image/upload/[transformations/][v123/]scandish/uid/abc.jpg → scandish/uid/abc
 */
export function publicIdFromUrl(url: string): string | null {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const prefix = `https://res.cloudinary.com/${cloud}/image/upload/`;
  if (!cloud || typeof url !== "string" || !url.startsWith(prefix)) return null;
  const parts = url.slice(prefix.length).split("?")[0].split("/");
  // Our stored URLs start at the version; skip any transformation segments before it.
  const v = parts.findIndex((p) => /^v\d+$/.test(p));
  const path = (v >= 0 ? parts.slice(v + 1) : parts.filter((p) => !/^[a-z]{1,3}_[^/]*$/.test(p))).join("/");
  const id = decodeURIComponent(path.replace(/\.[a-z0-9]+$/i, ""));
  return id || null;
}

/**
 * Deletes images. Never throws: a failed delete leaves a file behind (swept later) rather than
 * failing the user's save. Returns how many were deleted.
 */
export async function destroyImages(publicIds: string[], type: "upload" | "authenticated" = "upload"): Promise<number> {
  const results = await Promise.allSettled(
    [...new Set(publicIds)].map((id) => cloudinary.uploader.destroy(id, { resource_type: "image", type, invalidate: true }))
  );
  return results.filter((r) => r.status === "fulfilled" && (r.value as { result?: string }).result === "ok").length;
}

export interface StoredImage {
  publicId: string;
  type: "upload" | "authenticated";
  format: string;
  bytes: number;
  createdAt: string;
}

/** Every file stored under a folder prefix (paged through the Admin API). */
export async function listStored(prefix: string, type: "upload" | "authenticated"): Promise<StoredImage[]> {
  const out: StoredImage[] = [];
  let next_cursor: string | undefined;
  do {
    const res = await cloudinary.api.resources({ type, prefix, resource_type: "image", max_results: 500, next_cursor });
    for (const r of res.resources as { public_id: string; format: string; bytes: number; created_at: string }[]) {
      out.push({ publicId: r.public_id, type, format: r.format, bytes: r.bytes, createdAt: r.created_at });
    }
    next_cursor = res.next_cursor;
  } while (next_cursor);
  return out;
}

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
};

/**
 * Downloads a private document (e.g. an RDB certificate) stored as "<public_id>.<format>", unchanged.
 * Goes through Cloudinary's signed, expiring API download URL, so it also works for PDFs.
 */
export async function fetchPrivateFile(id: string): Promise<{ bytes: Uint8Array; contentType: string; format: string } | null> {
  const dot = id.lastIndexOf(".");
  if (dot <= 0) return null;
  const publicId = id.slice(0, dot);
  const format = id.slice(dot + 1).toLowerCase();
  const contentType = CONTENT_TYPES[format];
  if (!contentType) return null;

  const url = cloudinary.utils.private_download_url(publicId, format, {
    resource_type: "image",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 60,
  });
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return { bytes: new Uint8Array(await res.arrayBuffer()), contentType, format };
}
